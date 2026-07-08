/** Post-call intelligence / analytics. Routes: `/api/roi`, `/api/denial-patterns`, `/api/auto-actions`. */

import { request } from "./http"
import type { RoiSummary, DenialPattern, AutoActionResult } from "../types"

/** ROI dashboard summary (costs, quality, success/transfer rates, drop-off). */
export function getRoiSummary(): Promise<RoiSummary> {
  return request<RoiSummary>("GET", "/api/roi")
}

/** Denial patterns grouped by payer + reason. */
export async function getDenialPatterns(): Promise<DenialPattern[]> {
  const data = await request<{ patterns: DenialPattern[]; total: number }>(
    "GET",
    "/api/denial-patterns",
  )
  return data.patterns
}

/**
 * Run the post-call auto-action pipeline for a call
 * (task creation, AR log, denial routing, cost, quality score).
 */
export function triggerAutoActions(callId: string): Promise<AutoActionResult> {
  return request<AutoActionResult>("POST", "/api/auto-actions", {
    json: { call_id: callId },
  })
}

/** Recorded auto-actions for a call, or the last 50 across all calls when `callId` is omitted. */
export async function listAutoActions(callId?: string): Promise<unknown[]> {
  const data = await request<{ actions: unknown[] }>("GET", "/api/auto-actions", {
    query: { call_id: callId },
  })
  return data.actions
}
