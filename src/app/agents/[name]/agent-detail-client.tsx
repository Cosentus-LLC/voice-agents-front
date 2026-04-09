"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  getAgentPrompt,
  getAgentSchema,
  getLiveAgentForDraft,
  updateAgent,
  updateAgentPrompt,
  getPhoneNumbers,
  updatePhoneNumber,
} from "@/lib/api"
import { supabase } from "@/lib/supabase"
import type { AgentDraft, AgentSchema, AgentVersion, PhoneNumber, PostCallField } from "@/lib/types"
import {
  apiResponseToDraftRow,
  draftToApiPayload,
  extractPromptVariables,
  liveAgentToDraftRow,
} from "@/lib/agent-draft"
import { cn, formatPhoneNumberLabel, relativeTime } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AgentToolCard, AddToolMenu, formatAgentToolTypeLabel } from "@/components/agent-tool-editor"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { DeleteIconButton } from "@/components/delete-icon-button"
import {
  SchemaSlider,
  expressivenessRange,
  llmMaxTokensRange,
  promptCardClassName,
  temperatureRange,
  ttsSpeedRange,
  voiceTemperatureRange,
} from "@/components/agent-editor-fields"
import { toast } from "sonner"
import { AlertTriangle, ChevronRight, Clock, FileText, Info, List, Loader2, Lock, Pause, Pencil, Play, Plus } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TestCallPanel } from "@/components/test-call-panel"
import { VoicePicker, useResolvedVoice } from "@/components/voice-picker"
import { useAudioPreview } from "@/hooks/use-audio-preview"
import { AddVoiceModal } from "@/components/add-voice-modal"
import { AgentConfigSection } from "@/components/agent-config-section"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PostCallFieldEditor } from "@/components/post-call-field-editor"
import { ScrollArea } from "@/components/ui/scroll-area"

function publishBody(draft: AgentDraft): Record<string, unknown> {
  const p = draftToApiPayload(draft)
  delete p.system_prompt
  return p
}

function snapshotFromDraft(draft: AgentDraft): Record<string, unknown> {
  return { ...draftToApiPayload(draft), system_prompt: draft.system_prompt }
}

function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  return String(e)
}

/** Normalize post_call_analyses from either old array or new object format */
function extractPostCallInfo(pca: unknown): { model: string | null; fields: { name: string; type: string }[] } {
  // New format: { model, fields: [{name, type, description, ...}] }
  if (pca != null && typeof pca === "object" && !Array.isArray(pca)) {
    const o = pca as Record<string, unknown>
    if (Array.isArray(o.fields)) {
      const model = typeof o.model === "string" && o.model.trim() ? o.model.trim() : null
      const fields = o.fields.map((f: unknown) => {
        const fo = f && typeof f === "object" ? (f as Record<string, unknown>) : {}
        return {
          name: typeof fo.name === "string" ? fo.name : "field",
          type: typeof fo.type === "string" ? fo.type : "text",
        }
      })
      return { model, fields }
    }
  }
  // Old format: [{name, model, output_type, prompt?}]
  if (Array.isArray(pca)) {
    const firstModel = pca[0] && typeof pca[0] === "object" && typeof (pca[0] as Record<string, unknown>).model === "string"
      ? ((pca[0] as Record<string, unknown>).model as string).trim() || null
      : null
    const fields = pca.map((item: unknown) => {
      const o = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
      return {
        name: typeof o.name === "string" ? o.name : "field",
        type: typeof o.output_type === "string" ? o.output_type : "text",
      }
    })
    return { model: firstModel, fields }
  }
  return { model: null, fields: [] }
}

/** Human-readable lines from stored `config_snapshot` for version history UI */
function summarizeVersionSnapshot(snap: Record<string, unknown>) {
  const tools = Array.isArray(snap.tools) ? snap.tools.length : 0
  const pcaInfo = extractPostCallInfo(snap.post_call_analyses)
  const postFields = pcaInfo.fields.length
  const llm =
    typeof snap.llm_model === "string" && snap.llm_model.trim() ? snap.llm_model.trim() : null
  const voice =
    typeof snap.tts_voice_id === "string" && snap.tts_voice_id.trim()
      ? snap.tts_voice_id.trim()
      : null
  const displayName =
    typeof snap.display_name === "string" && snap.display_name.trim()
      ? snap.display_name.trim()
      : typeof snap.name === "string" && snap.name.trim()
        ? snap.name.trim()
        : null
  return { tools, postFields, pcaInfo, llm, voice, displayName }
}

function normalizeRoutePhoneId(id: string | null | undefined): string | null {
  if (id == null || id === "" || id === "__none__") return null
  return id
}

/** Compare server state vs desired selection; only include phones that need a PUT. */
function buildPhoneAssignmentPutMap(
  agentId: string,
  curInboundPhoneId: string | null,
  curOutboundPhoneId: string | null,
  wantInboundPhoneId: string | null,
  wantOutboundPhoneId: string | null
): Map<string, Record<string, unknown>> {
  const curIn = normalizeRoutePhoneId(curInboundPhoneId)
  const curOut = normalizeRoutePhoneId(curOutboundPhoneId)
  const wantIn = normalizeRoutePhoneId(wantInboundPhoneId)
  const wantOut = normalizeRoutePhoneId(wantOutboundPhoneId)

  const puts = new Map<string, Record<string, unknown>>()
  const merge = (pid: string, patch: Record<string, unknown>) => {
    puts.set(pid, { ...(puts.get(pid) ?? {}), ...patch })
  }

  if (curIn !== wantIn) {
    if (curIn) merge(curIn, { inbound_agent_id: null })
    if (wantIn) merge(wantIn, { inbound_agent_id: agentId })
  }
  if (curOut !== wantOut) {
    if (curOut) merge(curOut, { outbound_agent_id: null })
    if (wantOut) merge(wantOut, { outbound_agent_id: agentId })
  }

  return puts
}

export default function AgentDetailClient({ encodedName }: { encodedName: string }) {
  const decodedName = decodeURIComponent(encodedName)
  const [draft, setDraft] = useState<AgentDraft | null>(null)
  const [schema, setSchema] = useState<AgentSchema | null>(null)
  const [versions, setVersions] = useState<AgentVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [missingDraft, setMissingDraft] = useState(false)

  const [publishOpen, setPublishOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [versionName, setVersionName] = useState("")
  const [versionDesc, setVersionDesc] = useState("")
  const [publishModalPhones, setPublishModalPhones] = useState<PhoneNumber[]>([])
  const [publishPhonesLoading, setPublishPhonesLoading] = useState(false)
  const [pubInboundOn, setPubInboundOn] = useState(false)
  const [pubOutboundOn, setPubOutboundOn] = useState(false)
  const [pubInboundId, setPubInboundId] = useState("")
  const [pubOutboundId, setPubOutboundId] = useState("")

  const [discardOpen, setDiscardOpen] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<
    | null
    | { type: "tool"; index: number; label: string }
    | { type: "postField"; index: number; label: string }
  >(null)
  const [editingField, setEditingField] = useState<{ index: number | null; field: PostCallField } | null>(null)
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const configColumnRef = useRef<HTMLDivElement>(null)


  const load = useCallback(async () => {
    setLoading(true)
    setMissingDraft(false)
    try {
      const sch = await getAgentSchema()
      setSchema(sch)

      const { data: row, error } = await supabase
        .from("agent_drafts")
        .select("*")
        .eq("name", decodedName)
        .maybeSingle()

      if (error || !row) {
        setMissingDraft(true)
        setDraft(null)
        setVersions([])
        setLoading(false)
        return
      }

      const d = row as AgentDraft
      const normalized = apiResponseToDraftRow(d, {
        agent_id: d.agent_id,
        has_unpublished_changes: d.has_unpublished_changes,
      }) as unknown as AgentDraft
      setDraft(normalized)

      const { data: vers } = await supabase
        .from("agent_versions")
        .select("*")
        .eq("agent_id", d.agent_id)
        .order("version_number", { ascending: false })

      setVersions((vers as AgentVersion[]) ?? [])

      const nextNum = vers?.length ? (vers as AgentVersion[])[0]!.version_number + 1 : 1
      setVersionName(`V${nextNum}`)
      setVersionDesc("")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load")
    }
    setLoading(false)
  }, [decodedName])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!publishOpen || !draft) return
    let cancelled = false
    setPublishPhonesLoading(true)
    void (async () => {
      try {
        const list = await getPhoneNumbers()
        const active = list.filter((p) => p.is_active !== false)
        if (cancelled) return
        setPublishModalPhones(active)
        const agentUuid = draft.agent_id
        const inbound = active.find((p) => p.inbound_agent?.id === agentUuid)
        const outbound = active.find((p) => p.outbound_agent?.id === agentUuid)
        setPubInboundOn(!!inbound)
        setPubOutboundOn(!!outbound)
        setPubInboundId(inbound?.id ?? "")
        setPubOutboundId(outbound?.id ?? "")
      } catch (e) {
        if (!cancelled) {
          toast.error(errMessage(e))
          setPublishModalPhones([])
          setPubInboundOn(false)
          setPubOutboundOn(false)
          setPubInboundId("")
          setPubOutboundId("")
        }
      } finally {
        if (!cancelled) setPublishPhonesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [publishOpen, draft?.agent_id])

  const patchDraft = useCallback(async (patch: Record<string, unknown>) => {
    let agentId: string | null = null
    setDraft((prev) => {
      if (!prev) return prev
      agentId = prev.agent_id
      return { ...prev, ...patch, has_unpublished_changes: true } as AgentDraft
    })
    if (!agentId) return
    const { error } = await supabase
      .from("agent_drafts")
      .update({ ...patch, has_unpublished_changes: true })
      .eq("agent_id", agentId)
    if (error) {
      toast.error(error.message)
      load()
    } else {
      toast.success("Draft saved", { id: "draft-patch", duration: 900 })
    }
  }, [load])

  const initDraftFromLive = async () => {
    try {
      const live = await getLiveAgentForDraft(decodedName)
      const row = apiResponseToDraftRow(live, {
        agent_id: live.id,
        has_unpublished_changes: false,
      })
      const { error } = await supabase.from("agent_drafts").insert(row)
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success("Draft initialized from live agent")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed")
    }
  }

  const handleDiscard = async () => {
    if (!draft) return
    setDiscarding(true)
    try {
      const live = await getLiveAgentForDraft(decodedName)
      const row = liveAgentToDraftRow(live, draft.agent_id)
      const { error } = await supabase.from("agent_drafts").update(row).eq("agent_id", draft.agent_id)
      if (error) throw new Error(error.message)
      toast.success("Draft discarded")
      setDiscardOpen(false)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed")
    }
    setDiscarding(false)
  }

  const handlePublish = async () => {
    if (!draft) return
    if (publishPhonesLoading) return

    if (pubInboundOn && !pubInboundId) {
      toast.error("Select an inbound phone number or uncheck Inbound.")
      return
    }
    if (pubOutboundOn && !pubOutboundId) {
      toast.error("Select an outbound phone number or uncheck Outbound.")
      return
    }

    setPublishing(true)
    const issues: string[] = []

    let livePromptBefore: string | undefined
    try {
      livePromptBefore = (await getAgentPrompt(decodedName)).content
    } catch {
      livePromptBefore = undefined
    }

    try {
      await updateAgent(decodedName, publishBody(draft))
    } catch (e) {
      toast.error(errMessage(e))
      setPublishing(false)
      return
    }

    try {
      const promptChanged =
        livePromptBefore === undefined || livePromptBefore !== draft.system_prompt
      if (promptChanged) {
        await updateAgentPrompt(decodedName, draft.system_prompt)
      }
    } catch (e) {
      toast.error(errMessage(e))
      setPublishing(false)
      return
    }

    const agentId = draft.agent_id

    try {
      const list = await getPhoneNumbers()
      const active = list.filter((p) => p.is_active !== false)
      const curInbound = active.find((p) => p.inbound_agent?.id === agentId)?.id ?? null
      const curOutbound = active.find((p) => p.outbound_agent?.id === agentId)?.id ?? null
      const wantInbound = pubInboundOn ? normalizeRoutePhoneId(pubInboundId) : null
      const wantOutbound = pubOutboundOn ? normalizeRoutePhoneId(pubOutboundId) : null

      const putMap = buildPhoneAssignmentPutMap(agentId, curInbound, curOutbound, wantInbound, wantOutbound)

      const phoneErrors: string[] = []
      for (const [phoneId, patch] of putMap) {
        try {
          await updatePhoneNumber(phoneId, patch)
        } catch (e) {
          phoneErrors.push(errMessage(e))
        }
      }
      if (phoneErrors.length > 0) {
        issues.push(`phone number assignment failed: ${phoneErrors[0]}`)
      }
    } catch (e) {
      issues.push(`Could not sync phone numbers: ${errMessage(e)}`)
    }

    const nextNum = versions.length ? Math.max(...versions.map((x) => x.version_number)) + 1 : 1
    const assignments: { number: string; friendly_name: string; direction: string }[] = []
    if (pubInboundOn && pubInboundId) {
      const p = publishModalPhones.find((x) => x.id === pubInboundId)
      if (p) assignments.push({ number: p.number, friendly_name: p.friendly_name, direction: "inbound" })
    }
    if (pubOutboundOn && pubOutboundId) {
      const p = publishModalPhones.find((x) => x.id === pubOutboundId)
      if (p) assignments.push({ number: p.number, friendly_name: p.friendly_name, direction: "outbound" })
    }

    const { error: vErr } = await supabase.from("agent_versions").insert({
      agent_id: draft.agent_id,
      version_number: nextNum,
      version_name: versionName.trim() || `V${nextNum}`,
      description: versionDesc.trim(),
      config_snapshot: snapshotFromDraft(draft),
      phone_assignments: assignments,
      published_at: new Date().toISOString(),
      published_by: null,
    })
    if (vErr) {
      issues.push(`Version history not saved: ${vErr.message}`)
    }

    const { error: dErr } = await supabase
      .from("agent_drafts")
      .update({ has_unpublished_changes: false })
      .eq("agent_id", draft.agent_id)
    if (dErr) {
      issues.push(`Draft not marked published: ${dErr.message}`)
    }

    if (issues.length === 0) {
      toast.success(`Version ${versionName.trim() || `V${nextNum}`} published`)
    } else if (issues.length === 1 && issues[0].startsWith("phone number assignment failed:")) {
      toast.warning(`Agent published, but ${issues[0]}`)
    } else {
      toast.warning(`Agent published, but: ${issues.join(" · ")}`)
    }

    setPublishOpen(false)
    await load()
    setPublishing(false)
  }

  const revertVersion = async (v: AgentVersion) => {
    if (!draft) return
    const row = apiResponseToDraftRow(v.config_snapshot, {
      agent_id: draft.agent_id,
      has_unpublished_changes: true,
    })
    const { error } = await supabase.from("agent_drafts").update(row).eq("agent_id", draft.agent_id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(`Draft reverted to V${v.version_number}. Publish to make it live.`)
    load()
  }

  const promptVars = useMemo(() => extractPromptVariables(draft?.system_prompt ?? ""), [draft?.system_prompt])
  const { voice: resolvedVoice, voices: resolvedVoices, loaded: voicesLoaded } = useResolvedVoice(draft?.tts_voice_id ?? "")
  const { playingId: voicePlayingId, toggle: toggleVoicePreview } = useAudioPreview()
  const [addVoiceOpen, setAddVoiceOpen] = useState(false)

  if (loading || !voicesLoaded) {
    return (
      <div className="flex h-[calc(100vh-3rem)] flex-col overflow-hidden">
        <div className="surface-card mb-3 shrink-0 px-5 py-3">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-7 w-56" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </div>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,49fr)_minmax(0,24fr)_minmax(0,27fr)]">
          <div className="surface-card flex flex-col gap-3 p-4">
            <div className="flex gap-4">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-32" />
            </div>
            <Skeleton className="min-h-0 flex-1 rounded-lg" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
          <div className="space-y-3">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (missingDraft || !draft || !schema) {
    return (
      <div className="space-y-4">
        <div className="surface-card p-8 text-center">
          <p className="text-muted-foreground">No draft row found for this agent.</p>
          <Button className="mt-4" onClick={initDraftFromLive}>
            Initialize draft from live config
          </Button>
        </div>
      </div>
    )
  }

  const fr = schema.field_ranges
  const tempRange = temperatureRange(fr)
  const mtRange = llmMaxTokensRange(fr)
  const speedRange = ttsSpeedRange(fr)
  const voiceTempRange = voiceTemperatureRange(fr)
  const exprRange = expressivenessRange(fr)

  const setF = (patch: Record<string, unknown>) => {
    void patchDraft(patch)
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col overflow-hidden">
      {/* Top bar — compact surface card */}
      <div className="surface-card mb-3 shrink-0 px-5 py-3">
        {/* Row 1: Name + actions */}
        <div className="flex items-center justify-between gap-4">
          {editingName ? (
            <Input
              ref={nameInputRef}
              className="h-auto max-w-none border-0 border-b border-border bg-transparent px-0 py-0.5 text-xl font-semibold tracking-tight shadow-none focus-visible:ring-0 lg:max-w-3xl"
              value={draft.display_name}
              onChange={(e) => void patchDraft({ display_name: e.target.value })}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => { if (e.key === "Enter") setEditingName(false) }}
              aria-label="Display name"
              autoFocus
            />
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">{draft.display_name}</h1>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                title="Edit name"
                onClick={() => {
                  setEditingName(true)
                  setTimeout(() => nameInputRef.current?.focus(), 0)
                }}
              >
                <Pencil className="size-3.5" />
              </Button>
            </div>
          )}
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="bg-white hover:bg-[var(--color-brand-light)]/60"
              title="Version history"
              aria-label="Version history"
              onClick={() => setHistoryOpen(true)}
            >
              <Clock className="size-4" />
            </Button>
            <span className="relative inline-flex">
              {draft.has_unpublished_changes && (
                <span
                  className="absolute -top-1 -right-1 z-10 size-2 rounded-full bg-amber-400 ring-2 ring-[#f4f5f7] shadow-sm"
                  title="Unpublished draft changes"
                  aria-hidden
                />
              )}
              <Button
                size="sm"
                disabled={!draft.has_unpublished_changes}
                className="bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)]"
                title={
                  draft.has_unpublished_changes
                    ? "Publish draft — replaces live agent"
                    : "No unpublished changes"
                }
                onClick={() => setPublishOpen(true)}
              >
                Publish
              </Button>
            </span>
            {draft.has_unpublished_changes && (
              <Button type="button" variant="destructive" size="sm" onClick={() => setDiscardOpen(true)}>
                Discard
              </Button>
            )}
          </div>
        </div>
      </div>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" resizable defaultWidth={780} minWidth={380} maxWidthPercent={55} className="flex w-full flex-col overflow-hidden sm:max-w-lg">
          <SheetHeader className="shrink-0 space-y-3 px-6 pt-6 pb-2 text-left">
            <SheetTitle className="text-lg font-semibold tracking-tight">Version history</SheetTitle>
            <SheetDescription className="text-[15px] leading-relaxed text-foreground/85">
              Published snapshots you can review or restore as a draft.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6 pt-2">
            {versions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-black/[0.08] bg-secondary/30 px-4 py-10 text-center">
                <p className="text-sm font-medium text-foreground">No published versions yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Publish your agent to create the first snapshot in history.
                </p>
              </div>
            ) : (
              versions.map((v) => {
                const snap = (v.config_snapshot ?? {}) as Record<string, unknown>
                const sum = summarizeVersionSnapshot(snap)
                const isOpen = expandedVersionId === v.id
                return (
                  <Collapsible
                    key={v.id}
                    open={isOpen}
                    onOpenChange={(open) => setExpandedVersionId(open ? v.id : null)}
                  >
                    <div
                      className={cn(
                        "overflow-hidden rounded-xl bg-secondary/50 transition-colors",
                        isOpen && "bg-secondary/60"
                      )}
                    >
                      <CollapsibleTrigger
                        className={cn(
                          "group flex w-full flex-col gap-2.5 px-4 py-4 text-left outline-none transition-colors",
                          "hover:bg-secondary/40",
                          "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <ChevronRight
                            className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[panel-open]:rotate-90"
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-md bg-[var(--color-brand-light)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--color-brand)]">
                                  V{v.version_number}
                                </span>
                                {(() => {
                                  const raw = v.version_name?.trim() ?? ""
                                  if (raw && raw !== `V${v.version_number}`) {
                                    return (
                                      <span className="text-sm font-semibold text-foreground">{raw}</span>
                                    )
                                  }
                                  return (
                                    <span className="text-sm font-medium text-muted-foreground">
                                      Published snapshot
                                    </span>
                                  )
                                })()}
                              </div>
                              <time
                                className="shrink-0 text-xs tabular-nums text-muted-foreground"
                                dateTime={v.published_at}
                              >
                                {relativeTime(v.published_at)}
                              </time>
                            </div>
                            {v.description?.trim() ? (
                              <p className="text-sm leading-relaxed text-muted-foreground">{v.description.trim()}</p>
                            ) : (
                              <p className="text-sm italic text-muted-foreground/70">No release notes</p>
                            )}
                          </div>
                        </div>
                        {v.phone_assignments && v.phone_assignments.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pl-7">
                            {v.phone_assignments.map((p, i) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="bg-white font-normal text-xs text-foreground"
                              >
                                <span className="font-medium capitalize text-muted-foreground">
                                  {p.direction}
                                </span>
                                <span className="mx-1 text-muted-foreground">·</span>
                                {formatPhoneNumberLabel(p)}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="space-y-4 px-4 pb-4 pt-1">
                          <div className="rounded-lg bg-white px-3.5 py-3">
                            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              Published configuration
                            </p>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
                              {sum.displayName ? (
                                <>
                                  <dt className="text-muted-foreground">Display name</dt>
                                  <dd className="font-medium text-foreground">{sum.displayName}</dd>
                                </>
                              ) : null}
                              <dt className="text-muted-foreground">LLM</dt>
                              <dd className="font-mono text-xs text-foreground">{sum.llm ?? "—"}</dd>
                              {sum.voice ? (
                                <>
                                  <dt className="text-muted-foreground">Voice ID</dt>
                                  <dd className="break-all font-mono text-xs text-foreground">{sum.voice}</dd>
                                </>
                              ) : null}
                              <dt className="text-muted-foreground">Tools</dt>
                              <dd className="text-foreground">{sum.tools} configured</dd>
                              <dt className="text-muted-foreground">Post-call fields</dt>
                              <dd className="text-foreground">{sum.postFields} field{sum.postFields !== 1 ? "s" : ""}</dd>
                              {sum.pcaInfo.model ? (
                                <>
                                  <dt className="text-muted-foreground">Post-call model</dt>
                                  <dd className="font-mono text-xs text-foreground">{sum.pcaInfo.model}</dd>
                                </>
                              ) : null}
                            </dl>
                            {sum.pcaInfo.fields.length > 0 ? (
                              <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {sum.pcaInfo.fields.map((f, fi) => (
                                  <span key={fi} className="rounded-md bg-secondary/80 px-2 py-0.5 text-xs text-foreground">
                                    {f.name} <span className="text-muted-foreground">({f.type})</span>
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          {typeof snap.system_prompt === "string" && snap.system_prompt.trim() ? (
                            <div>
                              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                System prompt
                              </p>
                              <div className="max-h-72 overflow-y-auto rounded-lg bg-white">
                                <pre className="px-3.5 py-3 text-xs leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
{snap.system_prompt.trim()}
                                </pre>
                              </div>
                            </div>
                          ) : null}

                          <details className="overflow-hidden rounded-lg bg-white">
                            <summary className="cursor-pointer select-none px-3.5 py-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground">
                              Raw configuration (JSON)
                            </summary>
                            <div className="max-h-48 overflow-y-auto">
                              <pre className="px-3.5 pb-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words text-foreground/80">
{JSON.stringify(v.config_snapshot, null, 2)}
                              </pre>
                            </div>
                          </details>

                          <div className="flex items-center gap-3 pt-1">
                            <Button
                              type="button"
                              size="sm"
                              className="font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)]"
                              onClick={() => {
                                void revertVersion(v)
                                setHistoryOpen(false)
                              }}
                            >
                              Revert draft to this version
                            </Button>
                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                              Updates your draft only. Publish when ready.
                            </p>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Three-pillar grid — fills remaining height, no page scroll */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,49fr)_minmax(0,24fr)_minmax(0,27fr)]">
        {/* Left column — Prompt editor */}
        <div className="flex min-h-0 min-w-0 flex-col">
          <Card className={cn(promptCardClassName(), "flex min-h-0 flex-1 flex-col")}>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-3 pt-3 pb-3">
              <div className="flex shrink-0 items-end gap-4">
                <div className="flex min-w-0 flex-[3] flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">LLM Model</span>
                  <Select value={draft.llm_model} onValueChange={(v) => setF({ llm_model: v ?? "" })}>
                    <SelectTrigger className="h-9 w-full bg-white text-xs hover:bg-[var(--color-brand-light)]/60" aria-label="LLM model">
                      <span className="flex min-w-0 items-center gap-1.5 truncate">
                        <img src="/anthropic-logo.svg" alt="" className="size-3.5 shrink-0" />
                        <span className="min-w-0 truncate"><SelectValue placeholder="Model" /></span>
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {schema.llm_models.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex min-w-0 flex-[4] flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Voice</span>
                  <VoicePicker
                    value={draft.tts_voice_id}
                    onChange={(id) => setF({ tts_voice_id: id })}
                    className="w-full border-0 hover:bg-[var(--color-brand-light)]/60"
                    initialVoices={resolvedVoices}
                  />
                </div>
                <div className="flex min-w-0 flex-[3] flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">TTS Model</span>
                  <Select value={draft.tts_model} onValueChange={(v) => setF({ tts_model: v ?? "" })}>
                    <SelectTrigger className="h-9 w-full bg-white text-xs hover:bg-[var(--color-brand-light)]/60" aria-label="Voice model">
                      <SelectValue placeholder="Voice model" />
                    </SelectTrigger>
                    <SelectContent>
                      {(schema.tts_models[draft.tts_provider] ?? []).map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Textarea
                className="w-full min-w-0 flex-1 resize-none overflow-y-auto bg-white font-[JetBrains_Mono,monospace] text-sm leading-relaxed"
                value={draft.system_prompt}
                onChange={(e) => setF({ system_prompt: e.target.value })}
                placeholder="You are a helpful assistant..."
              />
            </CardContent>
          </Card>
        </div>

        {/* Center column — Config */}
        <div
          ref={configColumnRef}
          id="agent-config-column"
          className="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden"
        >
          <div className="surface-card divide-y divide-[#e8eaed] overflow-hidden">
          <AgentConfigSection title="LLM">
            <FieldGroup className="gap-5">
              <p className="text-xs text-muted-foreground">
                Provider: <span className="font-medium text-foreground">anthropic</span> · Model switch is in the bar above.
              </p>
            <SchemaSlider
              label="Temperature"
              helper="Controls response randomness. 0.7 is recommended for most agents."
              value={draft.temperature}
              onChange={(v) => setF({ temperature: v })}
              range={tempRange}
            />
            <SchemaSlider
              label="Max Response Tokens"
              helper="Maximum tokens per response turn. Voice responses should be concise."
              value={draft.max_tokens}
              onChange={(v) => setF({ max_tokens: Math.round(v) })}
              range={mtRange}
            />
            </FieldGroup>
          </AgentConfigSection>

          <AgentConfigSection title="Voice">
            <FieldGroup className="gap-5">
              <p className="text-xs text-muted-foreground">
                Provider: <span className="font-medium text-foreground">elevenlabs</span> · Voice and model selectors are in the quick bar.
              </p>
            <SchemaSlider
              label="Speed"
              helper="How fast the agent speaks. 0.7 (slower) to 1.2 (faster)."
              value={draft.tts_speed}
              onChange={(v) => setF({ tts_speed: v })}
              range={speedRange}
              formatValue={(v) => `${Number(v).toFixed(2)}x`}
            />
            <SchemaSlider
              label="Voice Consistency"
              helper="How predictable the voice sounds."
              helperTooltip="Lower values add natural variation but may introduce artifacts like breathing or pitch shifts. Higher values are cleaner and more professional. Recommended: 0.70–0.85."
              value={draft.tts_stability}
              onChange={(v) => setF({ tts_stability: v })}
              range={voiceTempRange}
            />
            <div className="flex items-center gap-3 rounded-lg bg-secondary/60 px-4 py-3">
              <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div>
                <p className="text-sm font-medium">Similarity Boost: <span className="tabular-nums">0.8</span></p>
                <p className="mt-0.5 text-xs text-muted-foreground">Global setting — controlled by the pipeline, not per-agent.</p>
              </div>
            </div>
            <SchemaSlider
              label="Style"
              helper="Amplifies vocal expressiveness."
              helperTooltip="0 is neutral. Higher values add personality but may increase latency."
              value={draft.tts_style}
              onChange={(v) => setF({ tts_style: v })}
              range={exprRange}
            />
            <Field
              orientation="horizontal"
              className="items-start gap-3 rounded-lg bg-secondary/60 p-4"
            >
              <Switch
                id="agent-speaker-boost"
                checked={draft.tts_use_speaker_boost}
                onCheckedChange={(c) => setF({ tts_use_speaker_boost: !!c })}
                className="mt-0.5"
              />
              <FieldContent>
                <FieldLabel htmlFor="agent-speaker-boost" className="inline-flex items-center gap-1.5">
                  Voice Clarity Boost
                  <Tooltip>
                    <TooltipTrigger render={<button type="button" className="inline-flex shrink-0 text-muted-foreground/60 transition-colors hover:text-muted-foreground" />}>
                      <Info size={13} />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[240px] leading-relaxed">
                      Enhances voice crispness. Turn off for a more natural phone-call sound. Turn on for clearer, more polished enunciation.
                    </TooltipContent>
                  </Tooltip>
                </FieldLabel>
              </FieldContent>
            </Field>
            </FieldGroup>
          </AgentConfigSection>

          <AgentConfigSection title="Tools">
            <FieldGroup className="gap-5">
              <FieldDescription className="text-xs text-muted-foreground">
                What the agent is allowed to do during a call (hang up, dial digits, transfer, etc.).
              </FieldDescription>
            <div className="space-y-4">
              {draft.tools.map((tool, idx) => (
                <AgentToolCard
                  key={idx}
                  tool={tool}
                  onChange={(t) => {
                    const next = [...draft.tools]
                    next[idx] = t
                    setF({ tools: next })
                  }}
                  onRemove={() =>
                    setPendingDelete({
                      type: "tool",
                      index: idx,
                      label: formatAgentToolTypeLabel(draft.tools[idx]!.type),
                    })
                  }
                />
              ))}
              <AddToolMenu
                schema={schema}
                existing={draft.tools.map((t) => t.type)}
                onAdd={(type) => {
                  const desc =
                    (schema.tool_settings_schema as Record<string, { description?: string }>)?.[type]?.description ?? ""
                  setF({
                    tools: [
                      ...draft.tools,
                      { type, description: typeof desc === "string" ? desc : "", settings: {} },
                    ],
                  })
                }}
              />
            </div>
            </FieldGroup>
          </AgentConfigSection>

          <AgentConfigSection title="Post-Call Data Extraction">
            <FieldGroup className="gap-3">
              <FieldDescription className="text-xs">
                Define the information to extract from each call.
              </FieldDescription>

              <div className="space-y-2">
                {draft.post_call_analyses.fields.length > 0 && (
                  draft.post_call_analyses.fields.map((f, i) => (
                    <div
                      key={`${f.name}-${i}`}
                      className="rounded-lg bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2">
                          <div className="flex h-5 shrink-0 items-center text-muted-foreground">
                            {f.type === "selector" ? (
                              <List className="size-4" aria-hidden />
                            ) : (
                              <FileText className="size-4" aria-hidden />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-medium leading-5 truncate block">{f.name}</span>
                            {f.description ? (
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                {f.description}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title="Edit"
                            onClick={() => setEditingField({ index: i, field: { ...f } })}
                          >
                            <Pencil size={14} />
                          </Button>
                          <DeleteIconButton
                            title="Delete field"
                            onClick={() =>
                              setPendingDelete({
                                type: "postField",
                                index: i,
                                label: f.name || "this field",
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="h-8">
                      <Plus className="mr-1.5 size-4" aria-hidden />
                      Add
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={() =>
                        setEditingField({
                          index: null,
                          field: { name: "", type: "text", description: "", format_examples: [] },
                        })
                      }
                    >
                      <FileText className="size-4" aria-hidden />
                      Text
                      <span className="ml-auto text-xs text-muted-foreground">
                        Free-form text output
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setEditingField({
                          index: null,
                          field: { name: "", type: "selector", description: "", choices: [""] },
                        })
                      }
                    >
                      <List className="size-4" aria-hidden />
                      Selector
                      <span className="ml-auto text-xs text-muted-foreground">
                        Choose from predefined options
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-1.5 pt-1">
                <Label className="text-xs text-muted-foreground">Model</Label>
                <Select
                  value={draft.post_call_analyses.model}
                  onValueChange={(v) =>
                    setF({ post_call_analyses: { ...draft.post_call_analyses, model: v ?? "" } })
                  }
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {schema.llm_models.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FieldGroup>
          </AgentConfigSection>
          </div>
        </div>

        {/* Right column — Test panel */}
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <TestCallPanel
            agentName={draft.name}
            displayName={draft.display_name}
            isDraft={draft.has_unpublished_changes}
            immediateStart={false}
            promptVariables={promptVars}
            validateBeforeStart={() => {
              const missing: string[] = []
              if (!draft.tts_voice_id?.trim()) missing.push("Voice")
              if (!draft.system_prompt?.trim()) missing.push("System Prompt")
              if (!draft.llm_model?.trim()) missing.push("LLM Model")
              if (missing.length > 0) {
                toast.error(`Configure ${missing.join(", ")} before testing`)
                return false
              }
              return true
            }}
            className="min-h-0 flex-1"
          />
        </div>
      </div>
      {/* Publish dialog */}
      <Dialog
        open={publishOpen}
        onOpenChange={(open) => {
          setPublishOpen(open)
          if (!open) {
            setPublishModalPhones([])
            setPublishPhonesLoading(false)
            setPubInboundOn(false)
            setPubOutboundOn(false)
            setPubInboundId("")
            setPubOutboundId("")
          }
        }}
      >
        <DialogContent className="flex max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden sm:max-w-lg">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
            <div className="space-y-5 pb-2">
              <DialogHeader className="space-y-3 text-left">
                <DialogTitle className="text-lg font-semibold tracking-tight">Publish version</DialogTitle>
                <DialogDescription className="text-[15px] leading-relaxed text-foreground/85">
                  Push your draft to live for{" "}
                  <span className="font-medium text-foreground">
                    {draft?.display_name?.trim() || decodedName}
                  </span>{" "}
                  and record a named version in history.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-black/[0.06] bg-secondary/50 px-4 py-4">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Version details
                </p>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Version name</Label>
                    <Input
                      value={versionName}
                      onChange={(e) => setVersionName(e.target.value)}
                      placeholder="V2 — Updated prompt"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Textarea
                      value={versionDesc}
                      onChange={(e) => setVersionDesc(e.target.value)}
                      rows={2}
                      className="min-h-[4.5rem] resize-y"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-black/[0.06] bg-secondary/50 px-4 py-4">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Phone assignment
                </p>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  Optional. You can publish without assigning numbers.
                </p>
                {publishPhonesLoading ? (
                  <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Loading phone numbers…
                  </div>
                ) : publishModalPhones.length === 0 ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    No phone numbers configured. Add numbers on the{" "}
                    <Link href="/phone-numbers" className="font-medium text-primary underline underline-offset-4">
                      Phone Numbers
                    </Link>{" "}
                    page.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={pubInboundOn}
                        onCheckedChange={(c) => {
                          const on = !!c
                          setPubInboundOn(on)
                          if (!on) setPubInboundId("")
                        }}
                        id="pub-in"
                      />
                      <Label htmlFor="pub-in">Inbound phone number</Label>
                    </div>
                    {pubInboundOn && (
                      <Select
                        value={pubInboundId || "__none__"}
                        onValueChange={(v) => setPubInboundId((v ?? "") === "__none__" ? "" : (v ?? ""))}
                      >
                        <SelectTrigger className="h-9 border border-black/[0.06] bg-background shadow-none hover:bg-background">
                          <SelectValue placeholder="Select number" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Select…</SelectItem>
                          {publishModalPhones.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {formatPhoneNumberLabel(p)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={pubOutboundOn}
                        onCheckedChange={(c) => {
                          const on = !!c
                          setPubOutboundOn(on)
                          if (!on) setPubOutboundId("")
                        }}
                        id="pub-out"
                      />
                      <Label htmlFor="pub-out">Outbound phone number</Label>
                    </div>
                    {pubOutboundOn && (
                      <Select
                        value={pubOutboundId || "__none__"}
                        onValueChange={(v) => setPubOutboundId((v ?? "") === "__none__" ? "" : (v ?? ""))}
                      >
                        <SelectTrigger className="h-9 border border-black/[0.06] bg-background shadow-none hover:bg-background">
                          <SelectValue placeholder="Select number" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Select…</SelectItem>
                          {publishModalPhones.map((p) => (
                            <SelectItem key={`o-${p.id}`} value={p.id}>
                              {formatPhoneNumberLabel(p)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="-mx-6 -mb-6 mt-2 flex shrink-0 gap-3 rounded-b-2xl bg-secondary/20 px-6 py-5">
            <Button
              type="button"
              variant="outline"
              className="flex-1 basis-0 justify-center"
              onClick={() => setPublishOpen(false)}
              disabled={publishing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 basis-0 justify-center font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)]"
              onClick={() => void handlePublish()}
              disabled={publishing || publishPhonesLoading}
            >
              {publishing ? <Loader2 className="animate-spin" size={16} /> : "Publish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent className="gap-0 overflow-hidden sm:max-w-[440px]">
          <div className="space-y-4 pb-2">
            <DialogHeader className="space-y-3 text-left">
              <DialogTitle className="text-lg font-semibold tracking-tight">Discard draft?</DialogTitle>
              <DialogDescription className="text-[15px] leading-relaxed text-foreground/85">
                This resets the draft for{" "}
                <span className="font-medium text-foreground">
                  {draft?.display_name?.trim() || decodedName}
                </span>{" "}
                to match the last published live configuration. Unpublished edits will be lost.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-black/[0.06] bg-secondary/50 px-4 py-3.5">
              <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                What happens next
              </p>
              <ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-foreground/75 marker:text-muted-foreground/60">
                <li>Prompt, voice, tools, and all draft fields revert to the live agent</li>
                <li>Changes you have not published are removed from this draft</li>
                <li className="font-medium text-foreground/90">This cannot be undone</li>
              </ul>
            </div>
          </div>

          <div className="-mx-6 -mb-6 mt-2 flex gap-3 rounded-b-2xl bg-secondary/20 px-6 py-5">
            <Button
              type="button"
              variant="outline"
              className="flex-1 basis-0 justify-center"
              onClick={() => setDiscardOpen(false)}
              disabled={discarding}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1 basis-0 justify-center font-medium"
              onClick={() => void handleDiscard()}
              disabled={discarding}
            >
              {discarding ? <Loader2 className="animate-spin" size={16} /> : "Discard draft"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title={
          pendingDelete?.type === "tool"
            ? "Remove tool?"
            : pendingDelete?.type === "postField"
              ? "Delete field?"
              : "Are you sure?"
        }
        description={
          pendingDelete?.type === "tool" ? (
            <>
              Remove <span className="font-medium text-foreground">{pendingDelete.label}</span> from this agent
              draft?
            </>
          ) : pendingDelete?.type === "postField" ? (
            <>
              Delete post-call field{" "}
              <span className="font-medium text-foreground">{pendingDelete.label}</span>? This only updates your
              draft until you publish.
            </>
          ) : null
        }
        bullets={
          pendingDelete
            ? [
                "The change applies to this draft only until you publish.",
                "You can use Discard draft to revert all unpublished edits at once.",
              ]
            : undefined
        }
        confirmLabel={pendingDelete?.type === "tool" ? "Remove" : "Delete"}
        onConfirm={() => {
          if (!pendingDelete || !draft) return
          if (pendingDelete.type === "tool") {
            setF({ tools: draft.tools.filter((_, j) => j !== pendingDelete.index) })
          } else {
            setF({
              post_call_analyses: {
                ...draft.post_call_analyses,
                fields: draft.post_call_analyses.fields.filter((_, j) => j !== pendingDelete.index),
              },
            })
          }
          setPendingDelete(null)
        }}
      />

      <PostCallFieldEditor
        open={!!editingField}
        field={editingField?.field ?? null}
        onCancel={() => setEditingField(null)}
        onSave={(field) => {
          const fields = draft.post_call_analyses.fields
          const next = [...fields]
          if (editingField?.index == null) next.push(field)
          else next[editingField.index] = field
          setF({ post_call_analyses: { ...draft.post_call_analyses, fields: next } })
          setEditingField(null)
        }}
      />
    </div>
  )
}
