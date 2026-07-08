/** Structured conversation flows (v2). Routes: `/api/agents/:name/flow*`. */

import { request } from "./http"
import type { FlowDefinition, FlowResponse, FlowTestResult } from "../types"

export function getAgentFlow(agentName: string): Promise<FlowResponse> {
  return request<FlowResponse>("GET", `/api/agents/${encodeURIComponent(agentName)}/flow`)
}

/** Saves the flow to the agent draft (pass null to clear it). Returns the draft row. */
export function saveAgentFlow(
  agentName: string,
  flowDefinition: FlowDefinition | null,
): Promise<unknown> {
  return request<unknown>("PUT", `/api/agents/${encodeURIComponent(agentName)}/flow`, {
    json: { flow_definition: flowDefinition },
  })
}

/** Validates + dry-run simulates a flow — never dials. Always answers 200. */
export function testAgentFlow(
  agentName: string,
  opts?: {
    flow_definition?: FlowDefinition
    turns?: unknown[]
    captures?: Record<string, unknown>
    branch_overrides?: Record<string, unknown>
  },
): Promise<FlowTestResult> {
  return request<FlowTestResult>(
    "POST",
    `/api/agents/${encodeURIComponent(agentName)}/flow/test`,
    { json: opts ?? {} },
  )
}

/** Rolls the flow back to a published version (requires version_id OR version_number). */
export function rollbackAgentFlow(
  agentName: string,
  target: { version_id?: string; version_number?: number },
): Promise<{
  agent_id: string
  flow_definition: FlowDefinition
  rolled_back_to_version: unknown
}> {
  return request("POST", `/api/agents/${encodeURIComponent(agentName)}/flow/rollback`, {
    json: target,
  })
}
