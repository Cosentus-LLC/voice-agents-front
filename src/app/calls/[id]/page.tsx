"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { getCall } from "@/lib/api"
import type { Call } from "@/lib/types"
import { StatusBadge } from "@/components/status-badge"
import { TranscriptViewer } from "@/components/transcript-viewer"
import { AudioPlayer } from "@/components/audio-player"
import { CallInfoCard } from "@/components/call-info-card"
import { AnalysisCard } from "@/components/analysis-card"
import { CaseDataCard } from "@/components/case-data-card"
import { formatAgentName } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronRight, AlertTriangle } from "lucide-react"

export default function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [call, setCall] = useState<Call | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCall() {
      setLoading(true)
      try {
        const data = await getCall(id)
        setCall(data)
      } catch {
        setCall(null)
      }
      setLoading(false)
    }
    fetchCall()
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="surface-card p-6 space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-80 w-full rounded-lg" />
            </div>
            <div className="surface-card p-6 space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="surface-card p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
            <div className="surface-card p-5 space-y-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
            <div className="surface-card p-5 space-y-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!call) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Call not found.</p>
        <Link href="/calls" className="mt-2 inline-block text-sm font-medium text-[var(--color-brand)] hover:underline">
          Back to Calls
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/calls" className="transition-colors hover:text-foreground">Calls</Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground font-medium">Call Detail</span>
      </nav>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="page-title">Call Detail</h1>
          <StatusBadge status={call.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {call.agent_display_name || formatAgentName(call.agent_name)}
        </p>
      </div>

      {call.error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="mt-0.5 text-sm text-red-700">{call.error}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="surface-card p-6">
            <h2 className="mb-3 text-lg font-medium">Transcript</h2>
            <TranscriptViewer transcript={call.transcript ?? []} />
          </div>
          <div className="surface-card p-6">
            <h2 className="mb-3 text-lg font-medium">Recording</h2>
            <AudioPlayer callId={call.id} hasRecording={!!call.recording_path} />
          </div>
        </div>

        <div className="space-y-4">
          <CallInfoCard call={call} />
          <AnalysisCard analyses={call.post_call_analyses ?? {}} />
          <CaseDataCard data={call.case_data ?? {}} defaultExpanded={call.direction === "test"} />
        </div>
      </div>
    </div>
  )
}
