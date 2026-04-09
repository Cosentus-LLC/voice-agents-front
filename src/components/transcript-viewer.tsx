"use client"

import type { TranscriptTurn } from "@/lib/types"
import { cn, formatDuration } from "@/lib/utils"

interface TranscriptViewerProps {
  transcript: TranscriptTurn[]
}

function roleLabel(role: string): string {
  return role === "assistant" ? "Agent" : "User"
}

function relativeTimestamp(timestamp: string | undefined, firstTimestamp: string | undefined): string {
  if (!timestamp || !firstTimestamp) return ""
  const diff = Math.max(0, Math.floor((new Date(timestamp).getTime() - new Date(firstTimestamp).getTime()) / 1000))
  return formatDuration(diff)
}

function mergeConsecutiveTurns(transcript: TranscriptTurn[]): TranscriptTurn[] {
  const MERGE_WINDOW_MS = 2000
  const merged: TranscriptTurn[] = []

  for (const turn of transcript) {
    const last = merged[merged.length - 1]
    if (
      last &&
      last.role === turn.role &&
      turn.timestamp &&
      last.timestamp &&
      new Date(turn.timestamp).getTime() - new Date(last.timestamp).getTime() < MERGE_WINDOW_MS
    ) {
      last.content = last.content.trimEnd() + " " + turn.content.trimStart()
      last.timestamp = turn.timestamp
    } else {
      merged.push({ ...turn })
    }
  }

  return merged
}

export function TranscriptViewer({ transcript }: TranscriptViewerProps) {
  if (!transcript || transcript.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border">
        <p className="text-sm text-muted-foreground">No transcript available</p>
      </div>
    )
  }

  const mergedTranscript = mergeConsecutiveTurns(transcript)
  const firstTs = mergedTranscript[0]?.timestamp

  return (
    <div
      className="space-y-2.5 overflow-y-auto rounded-xl bg-[#f9fafb] p-4"
      style={{ maxHeight: "500px" }}
    >
      {mergedTranscript.map((turn, i) => {
        const isAgent = turn.role === "assistant"
        return (
          <div key={i}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {roleLabel(turn.role)}
              </span>
              {turn.timestamp && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {relativeTimestamp(turn.timestamp, firstTs)}
                </span>
              )}
            </div>
            <div
              className={cn(
                "w-full rounded-xl px-3.5 py-2.5",
                isAgent
                  ? "bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  : "bg-[var(--color-brand-light)] text-foreground"
              )}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {turn.content}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
