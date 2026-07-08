/** Agents: CRUD, prompt, schema, drafts, versions. Routes: `/api/agents/*`, `/api/agent-schema`. */

import { ApiError, request } from "./http"
import type { Agent, AgentListItem, AgentSchema, AgentVersion } from "../types"

/** Single-agent JSON may be the object itself or wrapped as `{ agent }` / `{ data }`. */
function unwrapAgent(data: unknown): Agent {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const o = data as Record<string, unknown>
    if (o.agent && typeof o.agent === "object") return o.agent as Agent
    if (o.data && typeof o.data === "object") return o.data as Agent
  }
  return data as Agent
}

export async function getAgents(): Promise<AgentListItem[]> {
  const data = await request<{ agents?: AgentListItem[] } | AgentListItem[]>("GET", "/api/agents")
  return Array.isArray(data) ? data : (data.agents ?? [])
}

export async function getAgent(name: string): Promise<Agent> {
  return unwrapAgent(await request("GET", `/api/agents/${encodeURIComponent(name)}`))
}

/**
 * Create an agent. Pass `from_template` in `data` to seed prompt / flow /
 * identity policy / post-call schema from a call template (backend fills only
 * the fields you omit).
 */
export async function createAgent(data: Record<string, unknown>): Promise<Agent> {
  return unwrapAgent(await request("POST", "/api/agents", { json: data }))
}

export async function updateAgent(name: string, data: Record<string, unknown>): Promise<Agent> {
  return unwrapAgent(await request("PUT", `/api/agents/${encodeURIComponent(name)}`, { json: data }))
}

export function deleteAgent(name: string): Promise<unknown> {
  return request("DELETE", `/api/agents/${encodeURIComponent(name)}`)
}

export async function cloneAgent(
  name: string,
  data: { name: string; display_name: string },
): Promise<Agent> {
  return unwrapAgent(
    await request("POST", `/api/agents/${encodeURIComponent(name)}/clone`, { json: data }),
  )
}

export function getAgentSchema(): Promise<AgentSchema> {
  return request<AgentSchema>("GET", "/api/agent-schema")
}

export function getAgentPrompt(name: string): Promise<{ content: string; prompt_variables: string[] }> {
  return request("GET", `/api/agents/${encodeURIComponent(name)}/prompt`)
}

/**
 * Live published agent for rebuilding a draft (discard / init-from-live).
 * Merges the canonical system prompt from the prompt route over the agent row.
 */
export async function getLiveAgentForDraft(name: string): Promise<Agent> {
  const live = await getAgent(name)
  try {
    const pr = await getAgentPrompt(name)
    if (typeof pr.content === "string") return { ...live, system_prompt: pr.content }
  } catch {
    // Prompt endpoint missing/failed — keep the agent row as-is.
  }
  return live
}

export function updateAgentPrompt(
  name: string,
  content: string,
): Promise<{ prompt_variables: string[]; prompt_preview: string }> {
  return request("PUT", `/api/agents/${encodeURIComponent(name)}/prompt`, { json: { content } })
}

// ── Drafts ──

export async function getAgentDraft(agentName: string): Promise<Record<string, unknown> | null> {
  try {
    const data = await request<{ draft?: Record<string, unknown> } | Record<string, unknown> | null>(
      "GET",
      `/api/agents/${encodeURIComponent(agentName)}/draft`,
    )
    if (data && typeof data === "object" && "draft" in data && data.draft) {
      return data.draft as Record<string, unknown>
    }
    return (data as Record<string, unknown> | null) ?? null
  } catch (e) {
    if (e instanceof ApiError) return null
    throw e
  }
}

export async function saveAgentDraft(
  agentName: string,
  draftData: Record<string, unknown>,
): Promise<void> {
  await request("PUT", `/api/agents/${encodeURIComponent(agentName)}/draft`, { json: draftData })
}

// ── Versions ──

export async function listAgentVersions(agentName: string): Promise<AgentVersion[]> {
  try {
    const data = await request<{ versions?: AgentVersion[] } | AgentVersion[]>(
      "GET",
      `/api/agents/${encodeURIComponent(agentName)}/versions`,
    )
    return Array.isArray(data) ? data : (data.versions ?? [])
  } catch (e) {
    if (e instanceof ApiError) return []
    throw e
  }
}

export function publishAgentVersion(
  agentName: string,
  publishData: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return request("POST", `/api/agents/${encodeURIComponent(agentName)}/versions`, { json: publishData })
}
