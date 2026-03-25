"use client"

import { useEffect, useState, use, useCallback } from "react"
import Link from "next/link"
import {
  getAgent,
  updateAgent,
  getAgentPrompt,
  updateAgentPrompt,
  getPostCallPrompt,
  updatePostCallPrompt,
} from "@/lib/api"
import type { Agent } from "@/lib/types"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import {
  ArrowLeft,
  Pencil,
  X,
  Check,
  Brain,
  Volume2,
  Mic,
  Radio,
  Phone,
  Wrench,
  Variable,
  FileText,
  BarChart3,
  ArrowRightLeft,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react"

const AVAILABLE_TOOLS = [
  { name: "end_call", description: "Ends the call gracefully" },
  { name: "press_digit", description: "DTMF tones for IVR navigation" },
  { name: "transfer_call", description: "Transfers to another number" },
]

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = use(params)
  const decodedName = decodeURIComponent(name)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const fetchAgent = useCallback(async () => {
    try {
      const data = await getAgent(decodedName)
      setAgent(data)
    } catch {
      setNotFound(true)
    }
    setLoading(false)
  }, [decodedName])

  useEffect(() => {
    fetchAgent()
  }, [fetchAgent])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-72" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (notFound || !agent) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Agent not found.</p>
        <Link href="/agents" className="mt-2 text-sm font-medium text-[var(--color-brand)] hover:underline">
          Back to Agents
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/agents" className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft size={16} />
          Agents
        </Link>
      </div>

      <HeaderSection agent={agent} onUpdate={setAgent} />
      <ConfigSection agent={agent} onUpdate={setAgent} />
      <ToolsSection agent={agent} onUpdate={setAgent} />
      <TransferTargetsSection agent={agent} onUpdate={setAgent} />
      <PromptSection agent={agent} onUpdate={setAgent} />
      <PromptVariablesSection agent={agent} />
      <PostCallSection agent={agent} onUpdate={setAgent} />
    </div>
  )
}

// ─── Section Header with edit toggle ───

function SectionHeader({
  icon,
  title,
  editing,
  onEdit,
  onCancel,
  onSave,
  saving,
}: {
  icon: React.ReactNode
  title: string
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  saving?: boolean
}) {
  return (
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon-xs" onClick={onCancel} disabled={saving}>
              <X size={14} />
            </Button>
            <Button
              size="xs"
              onClick={onSave}
              disabled={saving}
              className="bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)]"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              <span className="ml-1">Save</span>
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon-xs" onClick={onEdit}>
            <Pencil size={14} />
          </Button>
        )}
      </div>
    </CardHeader>
  )
}

// ─── Inline field helpers ───

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function ReadonlyField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  )
}

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  disabled,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        <span className="text-xs font-mono tabular-nums text-muted-foreground">{value.toFixed(step < 1 ? 1 : 0)}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
      />
    </div>
  )
}

// ─── Header Section ───

function HeaderSection({ agent, onUpdate }: { agent: Agent; onUpdate: (a: Agent) => void }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState(agent.display_name)
  const [description, setDescription] = useState(agent.description)

  const save = async () => {
    setSaving(true)
    try {
      const updated = await updateAgent(agent.name, { display_name: displayName, description })
      onUpdate(updated)
      setEditing(false)
      toast.success("Agent info updated")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save")
    }
    setSaving(false)
  }

  const cancel = () => {
    setDisplayName(agent.display_name)
    setDescription(agent.description)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-3">
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="text-lg font-semibold" />
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="flex items-center gap-1.5 pt-1">
            <Button variant="ghost" size="icon-sm" onClick={cancel} disabled={saving}>
              <X size={16} />
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={saving}
              className="bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)]"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              <span className="ml-1">Save</span>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="group">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{agent.display_name}</h1>
            <StatusBadge status={agent.type} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{agent.description}</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => setEditing(true)} className="opacity-0 transition-opacity group-hover:opacity-100">
          <Pencil size={14} />
        </Button>
      </div>
    </div>
  )
}

// ─── Configuration Section ───

function ConfigSection({ agent, onUpdate }: { agent: Agent; onUpdate: (a: Agent) => void }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState(configFromAgent(agent))

  function configFromAgent(a: Agent) {
    return {
      model: a.llm.model,
      temperature: a.temperature,
      max_tokens: a.max_tokens,
      voice_id: a.tts.voice_id,
      tts_model: a.tts.model,
      stability: a.tts.settings?.stability ?? 0.5,
      similarity_boost: a.tts.settings?.similarity_boost ?? 0.75,
      style: a.tts.settings?.style ?? 0,
      speed: a.tts.settings?.speed ?? 1.0,
      use_speaker_boost: a.tts.settings?.use_speaker_boost ?? true,
      recording_enabled: a.recording.enabled,
      phone_number: a.telephony?.phone_number ?? "",
      first_message: a.first_message,
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const updated = await updateAgent(agent.name, {
        llm: { ...agent.llm, model: draft.model },
        temperature: draft.temperature,
        max_tokens: draft.max_tokens,
        tts: {
          ...agent.tts,
          voice_id: draft.voice_id,
          model: draft.tts_model,
          settings: {
            stability: draft.stability,
            similarity_boost: draft.similarity_boost,
            style: draft.style,
            speed: draft.speed,
            use_speaker_boost: draft.use_speaker_boost,
          },
        },
        recording: { ...agent.recording, enabled: draft.recording_enabled },
        telephony: { phone_number: draft.phone_number },
        first_message: draft.first_message,
      } as Partial<Agent>)
      onUpdate(updated)
      setEditing(false)
      toast.success("Configuration saved")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save")
    }
    setSaving(false)
  }

  const cancel = () => {
    setDraft(configFromAgent(agent))
    setEditing(false)
  }

  return (
    <Card>
      <SectionHeader
        icon={<Brain size={16} />}
        title="Configuration"
        editing={editing}
        onEdit={() => setEditing(true)}
        onCancel={cancel}
        onSave={save}
        saving={saving}
      />
      <CardContent>
        {editing ? (
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Language Model</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Model">
                  <Input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} />
                </Field>
                <SliderField label="Temperature" value={draft.temperature} onChange={(v) => setDraft({ ...draft, temperature: v })} min={0} max={1} step={0.1} />
                <Field label="Max Tokens">
                  <Input type="number" min={1} value={draft.max_tokens} onChange={(e) => setDraft({ ...draft, max_tokens: Number(e.target.value) })} />
                </Field>
              </div>
            </div>

            <Separator />

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Text-to-Speech</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Voice ID">
                  <Input value={draft.voice_id} onChange={(e) => setDraft({ ...draft, voice_id: e.target.value })} className="font-mono text-xs" />
                </Field>
                <Field label="TTS Model">
                  <Input value={draft.tts_model} onChange={(e) => setDraft({ ...draft, tts_model: e.target.value })} />
                </Field>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SliderField label="Stability" value={draft.stability} onChange={(v) => setDraft({ ...draft, stability: v })} min={0} max={1} step={0.1} />
                <SliderField label="Similarity Boost" value={draft.similarity_boost} onChange={(v) => setDraft({ ...draft, similarity_boost: v })} min={0} max={1} step={0.1} />
                <SliderField label="Style" value={draft.style} onChange={(v) => setDraft({ ...draft, style: v })} min={0} max={1} step={0.1} />
                <SliderField label="Speed" value={draft.speed} onChange={(v) => setDraft({ ...draft, speed: v })} min={0.5} max={2} step={0.1} />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Switch checked={draft.use_speaker_boost} onCheckedChange={(v) => setDraft({ ...draft, use_speaker_boost: !!v })} />
                <Label className="text-sm">Speaker Boost</Label>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-3">
              <ReadonlyField label="STT Provider" value={agent.stt.provider} />
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Recording</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Switch checked={draft.recording_enabled} onCheckedChange={(v) => setDraft({ ...draft, recording_enabled: !!v })} />
                    <span className="text-sm">{draft.recording_enabled ? "On" : "Off"}</span>
                  </div>
                </div>
              </div>
              <Field label="Phone Number">
                <Input value={draft.phone_number} onChange={(e) => setDraft({ ...draft, phone_number: e.target.value })} placeholder="+1..." className="font-mono" />
              </Field>
            </div>

            <Separator />

            <Field label="First Message">
              <Textarea value={draft.first_message} onChange={(e) => setDraft({ ...draft, first_message: e.target.value })} rows={3} />
            </Field>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-3">
              <ReadonlyField label="LLM" value={`${agent.llm.provider} / ${agent.llm.model}`} />
              <ReadonlyField label="Temperature" value={agent.temperature} />
              <ReadonlyField label="Max Tokens" value={agent.max_tokens} />
            </div>
            <Separator />
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-3">
              <ReadonlyField label="TTS" value={`${agent.tts.provider} / ${agent.tts.model}`} />
              <ReadonlyField label="Voice ID" value={<span className="font-mono text-xs">{agent.tts.voice_id}</span>} />
              <ReadonlyField label="Speed" value={`${agent.tts.settings?.speed ?? 1}x`} />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span>Stability: {agent.tts.settings?.stability ?? "—"}</span>
              <span>Similarity: {agent.tts.settings?.similarity_boost ?? "—"}</span>
              <span>Style: {agent.tts.settings?.style ?? "—"}</span>
              <span>Speaker Boost: {agent.tts.settings?.use_speaker_boost ? "On" : "Off"}</span>
            </div>
            <Separator />
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-3">
              <ReadonlyField label="STT" value={agent.stt.provider} />
              <ReadonlyField label="Recording" value={agent.recording.enabled ? `Enabled (${agent.recording.channels}ch)` : "Disabled"} />
              <ReadonlyField label="Phone" value={<span className="font-mono">{agent.telephony?.phone_number || "—"}</span>} />
            </div>
            <Separator />
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">First Message</p>
              <blockquote className="border-l-2 border-[var(--color-brand)] pl-4 text-sm italic leading-relaxed text-muted-foreground">
                {agent.first_message}
              </blockquote>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Tools Section ───

function ToolsSection({ agent, onUpdate }: { agent: Agent; onUpdate: (a: Agent) => void }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<string[]>(agent.tools)

  const toggle = (tool: string) => {
    setSelected((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    )
  }

  const save = async () => {
    setSaving(true)
    try {
      const updated = await updateAgent(agent.name, { tools: selected })
      onUpdate(updated)
      setEditing(false)
      toast.success("Tools updated")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save")
    }
    setSaving(false)
  }

  const cancel = () => {
    setSelected(agent.tools)
    setEditing(false)
  }

  return (
    <Card>
      <SectionHeader icon={<Wrench size={16} />} title="Tools" editing={editing} onEdit={() => setEditing(true)} onCancel={cancel} onSave={save} saving={saving} />
      <CardContent>
        <div className="space-y-3">
          {AVAILABLE_TOOLS.map((tool) => {
            const active = (editing ? selected : agent.tools).includes(tool.name)
            return (
              <label
                key={tool.name}
                className={`flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors ${
                  editing ? "cursor-pointer hover:bg-muted/50" : ""
                } ${active ? "border-[var(--color-brand)]/30 bg-[var(--color-brand-light)]" : "border-border"}`}
              >
                {editing && (
                  <input
                    type="checkbox"
                    checked={selected.includes(tool.name)}
                    onChange={() => toggle(tool.name)}
                    className="accent-[var(--color-brand)]"
                  />
                )}
                <div className="flex-1">
                  <span className="text-sm font-medium">{tool.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{tool.description}</span>
                </div>
                {!editing && active && (
                  <Badge variant="secondary" className="text-xs">Active</Badge>
                )}
              </label>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Transfer Targets Section ───

function TransferTargetsSection({ agent, onUpdate }: { agent: Agent; onUpdate: (a: Agent) => void }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [targets, setTargets] = useState<[string, string][]>(
    Object.entries(agent.transfer_targets ?? {})
  )

  const addRow = () => setTargets([...targets, ["", ""]])
  const removeRow = (i: number) => setTargets(targets.filter((_, idx) => idx !== i))
  const updateRow = (i: number, key: string, val: string) => {
    const next = [...targets]
    next[i] = [key, val]
    setTargets(next)
  }

  const save = async () => {
    setSaving(true)
    try {
      const obj: Record<string, string> = {}
      targets.forEach(([k, v]) => { if (k.trim()) obj[k.trim()] = v })
      const updated = await updateAgent(agent.name, { transfer_targets: obj })
      onUpdate(updated)
      setEditing(false)
      toast.success("Transfer targets updated")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save")
    }
    setSaving(false)
  }

  const cancel = () => {
    setTargets(Object.entries(agent.transfer_targets ?? {}))
    setEditing(false)
  }

  const entries = Object.entries(agent.transfer_targets ?? {})

  return (
    <Card>
      <SectionHeader icon={<ArrowRightLeft size={16} />} title="Transfer Targets" editing={editing} onEdit={() => setEditing(true)} onCancel={cancel} onSave={save} saving={saving} />
      <CardContent>
        {editing ? (
          <div className="space-y-2">
            {targets.map(([key, val], i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={key} onChange={(e) => updateRow(i, e.target.value, val)} placeholder="Name" className="flex-1" />
                <Input value={val} onChange={(e) => updateRow(i, key, e.target.value)} placeholder="+1..." className="flex-1 font-mono" />
                <Button variant="ghost" size="icon-xs" onClick={() => removeRow(i)}>
                  <Trash2 size={14} className="text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addRow} className="mt-1">
              <Plus size={14} className="mr-1" />
              Add Target
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transfer targets configured.</p>
        ) : (
          <div className="space-y-2">
            {entries.map(([key, val]) => (
              <div key={key} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span className="text-sm font-medium">{key}</span>
                <span className="font-mono text-sm text-muted-foreground">{val}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Prompt Section ───

function PromptSection({ agent, onUpdate }: { agent: Agent; onUpdate: (a: Agent) => void }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingPrompt, setLoadingPrompt] = useState(false)
  const [content, setContent] = useState("")
  const [variables, setVariables] = useState<string[]>([])

  const startEdit = async () => {
    setLoadingPrompt(true)
    try {
      const data = await getAgentPrompt(agent.name)
      setContent(data.content)
      setVariables(data.prompt_variables)
      setEditing(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load prompt")
    }
    setLoadingPrompt(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      const result = await updateAgentPrompt(agent.name, content)
      onUpdate({
        ...agent,
        prompt_variables: result.prompt_variables,
        prompt_preview: result.prompt_preview,
      })
      setEditing(false)
      toast.success(`Prompt saved — ${result.prompt_variables.length} variables detected`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save prompt")
    }
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText size={16} />
            System Prompt
          </CardTitle>
          {editing ? (
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="icon-xs" onClick={() => setEditing(false)} disabled={saving}>
                <X size={14} />
              </Button>
              <Button
                size="xs"
                onClick={save}
                disabled={saving}
                className="bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)]"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                <span className="ml-1">Save</span>
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon-xs" onClick={startEdit} disabled={loadingPrompt}>
              {loadingPrompt ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            {variables.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {variables.map((v) => (
                  <Badge key={v} variant="secondary" className="font-mono text-xs">{`{{${v}}}`}</Badge>
                ))}
              </div>
            )}
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[400px] font-mono text-xs leading-relaxed"
            />
          </div>
        ) : (
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/50 p-4 font-mono text-xs leading-relaxed">
            {agent.prompt_preview || "No prompt configured."}
          </pre>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Prompt Variables (read-only) ───

function PromptVariablesSection({ agent }: { agent: Agent }) {
  if (!agent.prompt_variables?.length) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Variable size={16} />
          Dynamic Variables
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Populated from batch Excel data at call time
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {agent.prompt_variables.map((v) => (
            <Badge key={v} variant="secondary" className="font-mono text-xs">{`{{${v}}}`}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Post-Call Analyses Section ───

function PostCallSection({ agent, onUpdate }: { agent: Agent; onUpdate: (a: Agent) => void }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [analyses, setAnalyses] = useState(agent.post_call_analyses)
  const [promptModal, setPromptModal] = useState<{ name: string; content: string } | null>(null)
  const [promptSaving, setPromptSaving] = useState(false)

  const openPrompt = async (analysisName: string) => {
    try {
      const data = await getPostCallPrompt(agent.name, analysisName)
      setPromptModal({ name: data.name, content: data.content })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load prompt")
    }
  }

  const savePrompt = async () => {
    if (!promptModal) return
    setPromptSaving(true)
    try {
      await updatePostCallPrompt(agent.name, promptModal.name, promptModal.content)
      toast.success(`Prompt for "${promptModal.name}" saved`)
      setPromptModal(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save prompt")
    }
    setPromptSaving(false)
  }

  const saveModels = async () => {
    setSaving(true)
    try {
      const updated = await updateAgent(agent.name, { post_call_analyses: analyses })
      onUpdate(updated)
      setEditing(false)
      toast.success("Analyses updated")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save")
    }
    setSaving(false)
  }

  const cancel = () => {
    setAnalyses(agent.post_call_analyses)
    setEditing(false)
  }

  if (!agent.post_call_analyses?.length) return null

  return (
    <>
      <Card>
        <SectionHeader icon={<BarChart3 size={16} />} title="Post-Call Analyses" editing={editing} onEdit={() => setEditing(true)} onCancel={cancel} onSave={saveModels} saving={saving} />
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Output Type</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(editing ? analyses : agent.post_call_analyses).map((a, i) => (
                <TableRow key={a.name}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>
                    {editing ? (
                      <Input
                        value={analyses[i].model}
                        onChange={(e) => {
                          const next = [...analyses]
                          next[i] = { ...next[i], model: e.target.value }
                          setAnalyses(next)
                        }}
                        className="h-7 text-sm"
                      />
                    ) : (
                      <span className="text-muted-foreground">{a.model}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-normal">{a.output_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="xs" onClick={() => openPrompt(a.name)}>
                      <Pencil size={12} className="mr-1" />
                      Prompt
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!promptModal} onOpenChange={(open) => { if (!open) setPromptModal(null) }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Prompt — {promptModal?.name}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={promptModal?.content ?? ""}
            onChange={(e) => promptModal && setPromptModal({ ...promptModal, content: e.target.value })}
            className="min-h-[400px] font-mono text-xs leading-relaxed"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPromptModal(null)} disabled={promptSaving}>
              Cancel
            </Button>
            <Button
              onClick={savePrompt}
              disabled={promptSaving}
              className="bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)]"
            >
              {promptSaving && <Loader2 size={14} className="mr-1 animate-spin" />}
              Save Prompt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
