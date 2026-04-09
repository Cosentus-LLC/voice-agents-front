"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import type { Batch, Call } from "@/lib/types"
import { StatusBadge } from "@/components/status-badge"
import { CallDetailSheet } from "@/components/call-detail-sheet"
import { formatDate, formatDuration, formatPhone, truncate } from "@/lib/utils"
import { downloadResults, pauseBatch, resumeBatch, cancelBatch } from "@/lib/api"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Download, Eye, FileSpreadsheet, MoreHorizontal, ChevronDown, Copy, Pause, Play, XCircle, Clock } from "lucide-react"
import { toast } from "sonner"

function formatDaysSummary(days: string[]): string {
  const canonical = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const sorted = canonical.filter((d) => days.includes(d))
  if (sorted.length === 7) return "Every day"
  if (sorted.length === 0) return ""
  const runs: number[][] = []
  for (const idx of sorted.map((d) => canonical.indexOf(d))) {
    const last = runs[runs.length - 1]
    if (last && idx === last[last.length - 1] + 1) last.push(idx)
    else runs.push([idx])
  }
  return runs.map((run) =>
    run.length >= 3
      ? `${canonical[run[0]]}\u2013${canonical[run[run.length - 1]]}`
      : run.map((i) => canonical[i]).join(", ")
  ).join(", ")
}

function formatWindowTime(t: string): string {
  const [h, m] = t.split(":").map(Number)
  const suffix = h >= 12 ? "PM" : "AM"
  const hr = h % 12 || 12
  return m === 0 ? `${hr} ${suffix}` : `${hr}:${String(m).padStart(2, "0")} ${suffix}`
}

export default function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [batch, setBatch] = useState<Batch | null>(null)
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [batchRes, callsRes] = await Promise.all([
        supabase.from("batches").select("*").eq("id", id).single(),
        supabase
          .from("calls")
          .select("*")
          .eq("batch_id", id)
          .order("batch_row_index", { ascending: true }),
      ])
      setBatch(batchRes.data as Batch | null)
      setCalls((callsRes.data as Call[]) ?? [])
      setLoading(false)
    }
    fetchData()
  }, [id])

  const handleDownloadResults = async () => {
    const blob = await downloadResults(id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `batch-${id}-results.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadOriginal = async () => {
    if (!batch?.input_file_path) return
    const { data } = await supabase.storage
      .from("batch-files")
      .createSignedUrl(batch.input_file_path, 3600)
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank")
    }
  }

  const handlePause = async () => {
    try {
      await pauseBatch(id)
      setBatch((prev) => prev ? { ...prev, status: "paused" } : prev)
      toast.success("Batch paused")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to pause batch")
    }
  }

  const handleResume = async () => {
    try {
      await resumeBatch(id)
      setBatch((prev) => prev ? { ...prev, status: "running" } : prev)
      toast.success("Batch resumed")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resume batch")
    }
  }

  const handleCancel = async () => {
    try {
      await cancelBatch(id)
      setBatch((prev) => prev ? { ...prev, status: "canceled" } : prev)
      toast.success("Batch canceled")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel batch")
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-20" />
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surface-card p-5 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-12" />
            </div>
          ))}
        </div>
        <div className="space-y-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-10 ml-auto" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!batch) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Batch not found.</p>
        <Link href="/batches" className="mt-2 inline-block text-sm font-medium text-[var(--color-brand)] hover:underline">
          Back to Batches
        </Link>
      </div>
    )
  }

  const completedPct =
    batch.total_rows > 0
      ? Math.round(((batch.completed_rows ?? 0) / batch.total_rows) * 100)
      : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/batches"
          className="inline-flex h-8 items-center gap-1 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Batches
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title">
              {batch.name || "Untitled Batch"}
            </h1>
            <StatusBadge status={batch.status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Agent: {batch.agent_display_name || batch.agent_name} · Created {formatDate(batch.created_at)}
            {batch.from_number && ` · From ${formatPhone(batch.from_number)}`}
          </p>
          {batch.calling_window_start && batch.calling_window_end && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock size={12} className="shrink-0" />
              {formatWindowTime(batch.calling_window_start)}
              {" – "}
              {formatWindowTime(batch.calling_window_end)}
              {batch.timezone && ` ${new Intl.DateTimeFormat("en-US", { timeZone: batch.timezone, timeZoneName: "short" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? ""}`}
              {batch.calling_window_days && batch.calling_window_days.length > 0 && batch.calling_window_days.length < 7 && (
                <> · {formatDaysSummary(batch.calling_window_days)}</>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(batch.status === "running" || batch.status === "paused" || batch.status === "scheduled") && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-red-600 hover:text-red-700"
              onClick={handleCancel}
            >
              <XCircle size={14} />
              Cancel
            </Button>
          )}
          {batch.status === "running" && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePause}>
              <Pause size={14} />
              Pause
            </Button>
          )}
          {batch.status === "paused" && (
            <Button
              size="sm"
              className="gap-1.5 bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)]"
              onClick={handleResume}
            >
              <Play size={14} />
              Resume
            </Button>
          )}
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download size={14} />
              Downloads
              <ChevronDown size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {batch.input_file_path && (
              <DropdownMenuItem onClick={handleDownloadOriginal}>
                <FileSpreadsheet size={14} />
                Original File
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleDownloadResults}>
              <Download size={14} />
              Results File
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Calls</p>
            <p className="mt-1 text-2xl font-semibold">{batch.total_rows ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600">
              {batch.completed_rows ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="mt-1 text-2xl font-semibold text-red-600">
              {batch.failed_rows ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Progress</p>
            <p className="mt-1 text-2xl font-semibold">{completedPct}%</p>
          </CardContent>
        </Card>
      </div>

      {calls.length === 0 ? (
        <div className="surface-card flex flex-col items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">No calls in this batch yet.</p>
        </div>
      ) : (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Row #</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="min-w-[200px]">Call Notes</TableHead>
                <TableHead className="w-[70px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((call) => {
                const notes =
                  typeof call.post_call_analyses?.call_notes === "string"
                    ? call.post_call_analyses.call_notes
                    : ""
                return (
                  <TableRow
                    key={call.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedCall(call)}
                  >
                    <TableCell className="text-muted-foreground">
                      {call.batch_row_index != null ? call.batch_row_index + 1 : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatPhone(call.target_number)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={call.status} />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatDuration(call.duration_secs)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {truncate(notes, 100)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:bg-transparent">
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/calls/${call.id}`}>
                              <Eye size={14} />
                              View Call
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(call.id)}
                          >
                            <Copy size={14} />
                            Copy Call ID
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CallDetailSheet
        call={selectedCall}
        onClose={() => setSelectedCall(null)}
      />
    </div>
  )
}
