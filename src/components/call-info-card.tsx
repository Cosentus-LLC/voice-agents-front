"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { formatAgentName, formatDuration, formatDateTime, formatPhone } from "@/lib/utils"
import type { Call } from "@/lib/types"
import { Copy, Check } from "lucide-react"
import { useState } from "react"

interface CallInfoCardProps {
  call: Call
}

export function CallInfoCard({ call }: CallInfoCardProps) {
  const [copied, setCopied] = useState(false)

  const copyId = () => {
    navigator.clipboard.writeText(call.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Status", value: <StatusBadge status={call.status} /> },
    {
      label: "Duration",
      value: <span className="font-mono text-sm">{formatDuration(call.duration_secs)}</span>,
    },
    { label: "Agent", value: formatAgentName(call.agent_name) },
    { label: "Phone", value: formatPhone(call.target_number) },
    { label: "Direction", value: <StatusBadge status={call.direction} /> },
    { label: "Started", value: formatDateTime(call.started_at) },
    { label: "Ended", value: formatDateTime(call.ended_at) },
  ]

  if (call.batch_id) {
    rows.push({
      label: "Batch",
      value: (
        <Link href={`/batches/${call.batch_id}`} className="text-sm font-medium text-[var(--color-brand)] hover:underline">
          View Batch
        </Link>
      ),
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Call Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className="text-sm font-medium">{row.value}</span>
          </div>
        ))}

        <div className="border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">Call ID</p>
          <button
            onClick={copyId}
            className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="break-all">{call.id}</span>
            {copied ? <Check size={12} className="shrink-0 text-emerald-600" /> : <Copy size={12} className="shrink-0" />}
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
