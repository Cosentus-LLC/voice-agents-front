"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { listCalls, getCallAgentNames } from "@/lib/api"
import type { Call } from "@/lib/types"
import { StatusBadge } from "@/components/status-badge"
import { CallDetailSheet } from "@/components/call-detail-sheet"
import {
  formatAgentName,
  formatDuration,
  formatPhone,
  relativeTime,
} from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Phone,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react"

const PAGE_SIZE = 20

const CALL_STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "no_answer", label: "No Answer" },
]

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState("all")
  const [directionFilter, setDirectionFilter] = useState("all")
  const [agentFilter, setAgentFilter] = useState("all")
  const [agentOptions, setAgentOptions] = useState<{ display_name: string; agent_name: string }[]>([])
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)

  const fetchCalls = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listCalls({
        page: page + 1,
        page_size: PAGE_SIZE,
        status: statusFilter !== "all" ? statusFilter : undefined,
        direction: directionFilter !== "all" ? directionFilter : undefined,
        agent_display_name: agentFilter !== "all" ? agentFilter : undefined,
        sort_by: "created_at",
        sort_order: "desc",
      })
      setCalls(res.calls ?? [])
      setTotal(res.total ?? 0)
    } catch {
      setCalls([])
      setTotal(0)
    }
    setLoading(false)
  }, [page, statusFilter, directionFilter, agentFilter])

  useEffect(() => { fetchCalls() }, [fetchCalls])

  useEffect(() => {
    async function fetchAgents() {
      try {
        const list = await getCallAgentNames()
        setAgentOptions(Array.isArray(list) ? list : [])
      } catch {
        setAgentOptions([])
      }
    }
    fetchAgents()
  }, [])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const hasFilters = statusFilter !== "all" || directionFilter !== "all" || agentFilter !== "all"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Calls</h1>
        <p className="page-subtitle mt-1">View all calls across batches</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? "all"); setPage(0) }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {CALL_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={directionFilter} onValueChange={(v) => { setDirectionFilter(v ?? "all"); setPage(0) }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Directions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Directions</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>

        <Select value={agentFilter} onValueChange={(v) => { setAgentFilter(v ?? "all"); setPage(0) }}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="All Agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agentOptions.map((a) => (
              <SelectItem key={a.display_name} value={a.display_name}>{a.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="pt-2">
      {loading ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="text-right">Date</TableHead>
              <TableHead className="w-[48px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-10" /></TableCell>
                <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-20" /></TableCell>
                <TableCell />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : calls.length === 0 ? (
        <div className="surface-card flex flex-col items-center justify-center py-20">
          <Phone size={48} className="text-muted-foreground/30" />
          <h3 className="mt-4 text-base font-medium">No calls found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasFilters ? "Try adjusting your filters." : "Run a batch to get started."}
          </p>
          {!hasFilters && (
            <Link href="/batches" className="mt-2 text-sm font-medium text-[var(--color-brand)] hover:underline">
              Go to Batches
            </Link>
          )}
        </div>
      ) : (
        <>
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                  <TableHead className="w-[48px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow
                    key={call.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedCall(call)}
                  >
                    <TableCell>
                      {call.agent_display_name || formatAgentName(call.agent_name)}
                    </TableCell>
                    <TableCell>
                      {call.direction === "test" ? (
                        <span className="mono text-muted-foreground">webrtc</span>
                      ) : (
                        <span className="mono">{formatPhone(call.target_number)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={call.direction} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={call.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="mono">{formatDuration(call.duration_secs)}</span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {relativeTime(call.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end opacity-0 transition-opacity group-hover/row:opacity-100">
                        <Link
                          href={`/calls/${call.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          title="Full page"
                        >
                          <ExternalLink size={15} />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                  <ChevronLeft size={16} className="mr-1" /> Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
                  Next <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      </div>

      <CallDetailSheet
        call={selectedCall}
        onClose={() => setSelectedCall(null)}
      />
    </div>
  )
}
