/** Voice library. Routes: `/api/voices/*`. */

import { request } from "./http"
import type { AgentListItem, Voice } from "../types"

export async function getVoices(): Promise<Voice[]> {
  const data = await request<{ voices?: Voice[] } | Voice[]>("GET", "/api/voices")
  return Array.isArray(data) ? data : (data.voices ?? [])
}

/** Bulk-sync the library from ElevenLabs. (No dashboard UI wires this today.) */
export function syncVoices(): Promise<{ count: number; message: string }> {
  return request("POST", "/api/voices/sync")
}

export function lookupVoice(voiceId: string): Promise<Voice> {
  return request("POST", "/api/voices/lookup", { json: { voice_id: voiceId } })
}

export function addVoice(voiceId: string, customName?: string): Promise<Voice> {
  return request("POST", "/api/voices/add", {
    json: { voice_id: voiceId, custom_name: customName || undefined },
  })
}

export async function refreshVoice(voiceId: string): Promise<Voice> {
  const data = await request<{ voice?: Voice } | Voice>(
    "POST",
    `/api/voices/${encodeURIComponent(voiceId)}/refresh`,
  )
  if (data && typeof data === "object" && "voice" in data && data.voice) return data.voice as Voice
  return data as Voice
}

export function removeVoice(voiceId: string): Promise<unknown> {
  return request("DELETE", `/api/voices/${encodeURIComponent(voiceId)}`)
}

export async function getVoiceAgents(voiceId: string): Promise<AgentListItem[]> {
  const data = await request<{ agents?: AgentListItem[] } | AgentListItem[]>(
    "GET",
    `/api/voices/${encodeURIComponent(voiceId)}/agents`,
  )
  return Array.isArray(data) ? data : (data.agents ?? [])
}
