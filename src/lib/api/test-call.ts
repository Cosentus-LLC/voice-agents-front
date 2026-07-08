/**
 * Browser test calls.
 *
 * These do NOT go through the shared control-plane client — they hit the voice
 * ENGINE directly (a different host and API key). This replaces the retired
 * `POST /api/test-call/connect` Pipecat path: the engine's `/start` with
 * `direction: "browser"` returns a Daily room + viewer token, and the UI layer
 * joins that room with the Daily Web SDK (`@daily-co/daily-js`).
 *
 * Config (browser-visible build-time env):
 *   NEXT_PUBLIC_VOICE_ENGINE_URL       e.g. https://api.cosentusaibackend.com
 *   NEXT_PUBLIC_VOICE_ENGINE_API_KEY   engine X-API-Key
 */

import { ApiError } from "./http"
import type { BrowserCallSession } from "../types"

const ENGINE_BASE = process.env.NEXT_PUBLIC_VOICE_ENGINE_URL || ""
const ENGINE_KEY = process.env.NEXT_PUBLIC_VOICE_ENGINE_API_KEY || ""

/**
 * Start a browser test call for an agent and get back the Daily room + viewer
 * token to join. `case_data` supplies the `{{prompt variables}}` the agent
 * reads mid-call. The caller (UI) is responsible for joining `room_url` with
 * the Daily SDK using `viewer_token`.
 */
export async function startBrowserTestCall(
  agentId: string,
  caseData?: Record<string, string>,
): Promise<BrowserCallSession> {
  if (!ENGINE_BASE) {
    throw new Error("NEXT_PUBLIC_VOICE_ENGINE_URL is not configured")
  }
  const res = await fetch(`${ENGINE_BASE}/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(ENGINE_KEY ? { "X-API-Key": ENGINE_KEY } : {}),
    },
    body: JSON.stringify({ agent_id: agentId, direction: "browser", case_data: caseData ?? {} }),
  })
  const text = await res.text()
  const body = text ? JSON.parse(text) : null
  if (!res.ok) {
    const message =
      (body && typeof body === "object" && (body.error || body.reason)) || "Test call failed to start"
    throw new ApiError(String(message), res.status, body)
  }
  return body as BrowserCallSession
}
