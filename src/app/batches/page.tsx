"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Batch } from "@/lib/types"
import { StatusBadge } from "@/components/status-badge"
import { downloadResults, listBatches, getBatchDownloadUrl } from "@/lib/api"
import { formatDate } from "@/lib/utils"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { MoreHorizontal, Eye, Download, FileSpreadsheet, Layers, Plus } from "lucide-react"

export default function BatchesPage() {
  const router = useRouter()
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)

  const handleDownloadResults = async (batchId: string) => {
    const blob = await downloadResults(batchId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `batch-${batchId}-results.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadOriginal = async (batch: Batch) => {
    if (!batch.input_file_path) return
    const url = await getBatchDownloadUrl(batch.id)
    if (url) {
      window.open(url, "_blank")
    }
  }

  const fetchBatches = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listBatches()
      setBatches(data)
    } catch {
      setBatches([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Batches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload and manage batch call jobs
          </p>
        </div>
        <Button
          onClick={() => router.push("/batches/new")}
          className="bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)]"
        >
          <Plus size={16} className="mr-2" />
          New Batch
        </Button>
      </div>

      <div className="pt-2">
      {loading ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Failed</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-8" /></TableCell>
                <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-8" /></TableCell>
                <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-8" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="ml-auto size-8 rounded-lg" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : batches.length === 0 ? (
        <div className="surface-card flex flex-col items-center justify-center py-16">
          <Layers size={40} className="text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No batches yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your first batch to get started.
          </p>
          <Button
            onClick={() => router.push("/batches/new")}
            className="mt-4 bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)]"
          >
            <Plus size={16} className="mr-2" />
            New Batch
          </Button>
        </div>
      ) : (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[70px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow
                  key={batch.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/batches/${batch.id}`)}
                >
                  <TableCell className="font-medium">{batch.name || "Untitled"}</TableCell>
                  <TableCell className="text-muted-foreground">{batch.agent_display_name || batch.agent_name}</TableCell>
                  <TableCell>
                    <StatusBadge status={batch.status} />
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {batch.total_rows ?? 0}
                  </TableCell>
                  <TableCell className="text-right font-mono text-emerald-600">
                    {batch.completed_rows ?? 0}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red-600">
                    {batch.failed_rows ?? 0}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(batch.created_at)}
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
                          <Link href={`/batches/${batch.id}`}>
                            <Eye size={14} />
                            View Batch
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {batch.input_file_path && (
                          <DropdownMenuItem onClick={() => handleDownloadOriginal(batch)}>
                            <FileSpreadsheet size={14} />
                            Download Original
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDownloadResults(batch.id)}>
                          <Download size={14} />
                          Download Results
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      </div>
    </div>
  )
}
