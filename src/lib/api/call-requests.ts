/** Async outbound call queue (v2 single-call requests). Routes: `/api/call-requests/*`. */

import { request } from "./http"
import type { CallRequest } from "../types"

export interface CreateCallRequestBody {
  agent_name: string
  /** E.164 destination number. */
  to_number: string
  /** E.164 caller ID. */
  from_number: string
  case_data?: Record<string, string>
  trigger_source?: string
  dedup_key?: string
  calling_window_start?: string
  calling_window_end?: string
  calling_window_timezone?: string
  calling_window_days?: string[]
  max_attempts?: number
  scheduled_after?: string
}

export interface ListCallRequestsParams {
  status?: string
  agent_name?: string
  trigger_source?: string
}

export interface UpdateCallRequestBody {
  status?: string
  attempt_count?: number
  call_id?: string
  error_message?: string
  scheduled_after?: string
}

/** Enqueue a call request. Returns the created row, or the existing one when `dedup_key` matches. */
export function createCallRequest(body: CreateCallRequestBody): Promise<CallRequest> {
  return request<CallRequest>("POST", "/api/call-requests", { json: body })
}

export async function listCallRequests(
  params: ListCallRequestsParams = {},
): Promise<CallRequest[]> {
  const data = await request<{ call_requests: CallRequest[]; total: number }>(
    "GET",
    "/api/call-requests",
    { query: { ...params } },
  )
  return data.call_requests
}

export function getCallRequest(id: string): Promise<CallRequest> {
  return request<CallRequest>("GET", `/api/call-requests/${encodeURIComponent(id)}`)
}

export function updateCallRequest(
  id: string,
  body: UpdateCallRequestBody,
): Promise<CallRequest> {
  return request<CallRequest>("PUT", `/api/call-requests/${encodeURIComponent(id)}`, {
    json: body,
  })
}
