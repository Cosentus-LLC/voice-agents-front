/** Batch calling: upload, mapping, lifecycle, downloads. Routes: `/api/batches/*`. */

import { ApiError, request, requestRaw } from "./http"
import type { Batch, BatchDetailResponse, UploadResponse } from "../types"

export async function listBatches(): Promise<Batch[]> {
  const data = await request<{ batches?: Batch[] } | Batch[]>("GET", "/api/batches")
  return Array.isArray(data) ? data : (data.batches ?? [])
}

export function getBatch(batchId: string): Promise<BatchDetailResponse> {
  return request<BatchDetailResponse>("GET", `/api/batches/${encodeURIComponent(batchId)}`)
}

export async function getBatchDownloadUrl(batchId: string): Promise<string | null> {
  try {
    const data = await request<{ url: string | null }>(
      "GET",
      `/api/batches/${encodeURIComponent(batchId)}/download-url`,
    )
    return data.url ?? null
  } catch (e) {
    if (e instanceof ApiError) return null
    throw e
  }
}

export async function deleteDraftBatch(batchId: string): Promise<void> {
  try {
    await request("DELETE", `/api/batches/${encodeURIComponent(batchId)}/draft`)
  } catch {
    // Best-effort cleanup (unmount / re-upload) — never surface to the user.
  }
}

/**
 * Upload a CSV/XLSX batch file. `name` is sent when provided so the batch is
 * labelled instead of showing as untitled; the backend accepts it as a
 * multipart field.
 */
export function uploadBatch(
  file: File,
  agentName: string,
  fromNumber: string,
  name?: string,
): Promise<UploadResponse> {
  const form = new FormData()
  form.append("file", file)
  form.append("agent_name", agentName)
  form.append("from_number", fromNumber)
  if (name) form.append("name", name)
  return request<UploadResponse>("POST", "/api/batches/upload", { form })
}

export function updateBatchRows(
  batchId: string,
  payload: { mapping: Record<string, string>; rows: Record<string, unknown>[] },
): Promise<{ ok: boolean; total_rows: number; ready: number; incomplete: number }> {
  return request("PUT", `/api/batches/${encodeURIComponent(batchId)}/rows`, { json: payload })
}

export interface StartBatchOptions {
  concurrency: number
  schedule_mode: "now" | "scheduled"
  timezone?: string
  calling_window_start?: string
  calling_window_end?: string
  calling_window_days?: string[]
  start_date?: string
}

export function startBatch(batchId: string, options: StartBatchOptions): Promise<Record<string, unknown>> {
  return request("POST", `/api/batches/${encodeURIComponent(batchId)}/start`, { json: options })
}

export function pauseBatch(batchId: string): Promise<{ status: string }> {
  return request("POST", `/api/batches/${encodeURIComponent(batchId)}/pause`)
}

export function resumeBatch(batchId: string): Promise<{ status: string }> {
  return request("POST", `/api/batches/${encodeURIComponent(batchId)}/resume`)
}

export function cancelBatch(batchId: string): Promise<{ status: string }> {
  return request("POST", `/api/batches/${encodeURIComponent(batchId)}/cancel`)
}

/** Results workbook as a Blob (backend 302-redirects to a presigned URL). */
export async function downloadResults(batchId: string): Promise<Blob> {
  const res = await requestRaw("GET", `/api/batches/${encodeURIComponent(batchId)}/results`)
  return res.blob()
}
