/** Call history + recording access. Routes: `/api/calls/*`. */

import { ApiError, request } from "./http"
import type { Call, CallListResponse } from "../types"

export interface ListCallsParams {
  page?: number
  page_size?: number
  agent_name?: string
  agent_display_name?: string
  status?: string
  direction?: string
  sort_by?: string
  sort_order?: string
}

export function listCalls(params: ListCallsParams = {}): Promise<CallListResponse> {
  return request<CallListResponse>("GET", "/api/calls", { query: { ...params } })
}

export function getCall(callId: string): Promise<Call> {
  return request<Call>("GET", `/api/calls/${encodeURIComponent(callId)}`)
}

/** Distinct agents seen in the call history, for the filter dropdown. */
export async function getCallAgentNames(): Promise<{ display_name: string; agent_name: string }[]> {
  const data = await request<{ agents?: unknown }>("GET", "/api/calls/agents")
  const list = data.agents ?? data
  if (!Array.isArray(list)) return []
  if (list.length > 0 && typeof list[0] === "string") {
    return (list as string[]).map((name) => ({ display_name: name, agent_name: name }))
  }
  return list as { display_name: string; agent_name: string }[]
}

export async function deleteCall(callId: string): Promise<void> {
  await request<unknown>("DELETE", `/api/calls/${encodeURIComponent(callId)}`)
}

/**
 * Presigned recording URL (playable in an `<audio>` element), or null when the
 * call has no recording. The backend answers 200 with `{ url: null }` in that
 * case; we also treat any error as "no recording available" for the player.
 */
export async function getRecordingUrl(callId: string): Promise<string | null> {
  try {
    const data = await request<{ url: string | null }>(
      "GET",
      `/api/calls/${encodeURIComponent(callId)}/recording-url`,
    )
    return data.url ?? null
  } catch (e) {
    if (e instanceof ApiError) return null
    throw e
  }
}
