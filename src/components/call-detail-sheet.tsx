"use client"

import { useState } from "react"
import Link from "next/link"
import type { Call } from "@/lib/types"
import { StatusBadge } from "@/components/status-badge"
import { AudioPlayer } from "@/components/audio-player"
import { TranscriptViewer } from "@/components/transcript-viewer"
import { AnalysisCard } from "@/components/analysis-card"
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet"
import {
  formatAgentName,
  formatCompactDateTime,
  formatDateTime,
  formatDuration,
  formatPhone,
  truncateId,
} from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
} from "lucide-react"

function callTypeLabel(direction: Call["direction"]): string {
  return direction === "test" ? "test_call" : "phone_call"
}

function phoneDisplay(call: Call): string {
  if (call.direction === "test") return "WebRTC (Test)"
  if (call.from_number) {
    return `${formatPhone(call.from_number)} → ${formatPhone(call.target_number)}`
  }
  return formatPhone(call.target_number)
}

function formatCaseKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function CallDetailSheet({
  call,
  onClose,
}: {
  call: Call | null
  onClose: () => void
}) {
  return (
    <Sheet open={!!call} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side="right"
        resizable
        defaultWidth={740}
        minWidth={360}
        maxWidthPercent={55}
        className="flex w-full select-none flex-col overflow-hidden p-0 sm:max-w-lg"
      >
        {call && <CallPanelContent call={call} />}
      </SheetContent>
    </Sheet>
  )
}

function CallPanelContent({ call }: { call: Call }) {
  const [copiedId, setCopiedId] = useState(false)

  const copyId = () => {
    navigator.clipboard.writeText(call.id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  const caseEntries = Object.entries(call.case_data ?? {})

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 space-y-3 px-6 pt-6 pb-4 pr-10">
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {formatCompactDateTime(call.started_at ?? call.created_at)}
          </span>
          <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px]">
            {callTypeLabel(call.direction)}
          </span>
        </div>

        <h2 className="text-lg font-semibold">
          {call.agent_display_name || formatAgentName(call.agent_name)}
        </h2>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">ID:</span>
            <button
              onClick={copyId}
              tabIndex={-1}
              className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground outline-none transition-colors hover:text-foreground"
            >
              {truncateId(call.id)}
              {copiedId ? (
                <Check size={11} className="text-emerald-600" />
              ) : (
                <Copy size={11} />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Phone:</span>
            <span className="font-mono text-xs">{phoneDisplay(call)}</span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <span className="font-mono text-sm tabular-nums">
              {formatDuration(call.duration_secs)}
            </span>
            <StatusBadge status={call.status} />
            <StatusBadge status={call.direction} />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-8">
        {call.error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <p className="text-xs font-medium text-red-800">Error</p>
              <p className="mt-0.5 text-sm text-red-700">{call.error}</p>
            </div>
          </div>
        )}

        <AudioPlayer recordingPath={call.recording_path} />

        <section className="select-text">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            AI Analysis
          </h3>
          <AnalysisCard analyses={call.post_call_analyses ?? {}} compact />
        </section>

        <Tabs defaultValue="transcript">
          <TabsList variant="line" className="w-full">
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="data">
              Data{caseEntries.length > 0 && (
                <span className="ml-1 text-[10px] tabular-nums text-muted-foreground">
                  ({caseEntries.length})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>

          <TabsContent value="transcript" className="select-text pt-3">
            <TranscriptViewer transcript={call.transcript ?? []} />
          </TabsContent>

          <TabsContent value="data" className="select-text pt-3">
            {caseEntries.length > 0 ? (
              <div className="space-y-2.5 rounded-lg bg-secondary/60 p-4">
                {caseEntries.map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between gap-4">
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      {formatCaseKey(key)}
                    </span>
                    <span className="text-right text-sm">{value || "—"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No pre-call data
              </p>
            )}
          </TabsContent>

          <TabsContent value="info" className="select-text pt-3">
            <div className="space-y-2.5 rounded-lg bg-secondary/60 p-4">
              <InfoRow label="Call ID">
                <button
                  onClick={copyId}
                  className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span className="break-all">{call.id}</span>
                  {copiedId ? (
                    <Check size={12} className="shrink-0 text-emerald-600" />
                  ) : (
                    <Copy size={12} className="shrink-0" />
                  )}
                </button>
              </InfoRow>
              <InfoRow label="Direction">
                <StatusBadge status={call.direction} />
              </InfoRow>
              <InfoRow label="Agent">
                {call.agent_display_name || formatAgentName(call.agent_name)}
              </InfoRow>
              <InfoRow label="Phone">
                <span className="font-mono text-xs">{phoneDisplay(call)}</span>
              </InfoRow>
              <InfoRow label="Started">
                {formatDateTime(call.started_at)}
              </InfoRow>
              <InfoRow label="Ended">
                {formatDateTime(call.ended_at)}
              </InfoRow>
              <InfoRow label="Duration">
                {formatDuration(call.duration_secs)}
              </InfoRow>
              <InfoRow label="Status">
                <StatusBadge status={call.status} />
              </InfoRow>
              {call.batch_id && (
                <InfoRow label="Batch">
                  <Link
                    href={`/batches/${call.batch_id}`}
                    className="inline-flex items-center gap-1 text-sm text-[var(--color-brand)] hover:underline"
                  >
                    View Batch <ExternalLink size={12} />
                  </Link>
                </InfoRow>
              )}
              {call.error && (
                <InfoRow label="Error">
                  <span className="text-sm text-red-600">{call.error}</span>
                </InfoRow>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Link
          href={`/calls/${call.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ExternalLink size={12} />
          Open full page
        </Link>
      </div>
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm">{children}</span>
    </div>
  )
}
