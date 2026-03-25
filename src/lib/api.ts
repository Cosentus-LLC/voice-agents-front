import type { Agent } from "./types"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

// ── Batches ──

export async function uploadBatch(file: File, agentName: string) {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("agent_name", agentName)
  const res = await fetch(`${API_BASE}/api/batches/upload`, {
    method: "POST",
    body: formData,
  })
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`)
  return res.json()
}

export async function startBatch(batchId: string, concurrency = 1) {
  const res = await fetch(`${API_BASE}/api/batches/${batchId}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ concurrency }),
  })
  if (!res.ok) throw new Error(`Start failed: ${res.statusText}`)
  return res.json()
}

export async function getBatchStatus(batchId: string) {
  const res = await fetch(`${API_BASE}/api/batches/${batchId}/status`)
  if (!res.ok) throw new Error(`Status fetch failed: ${res.statusText}`)
  return res.json()
}

export async function downloadResults(batchId: string) {
  const res = await fetch(`${API_BASE}/api/batches/${batchId}/results`)
  if (!res.ok) throw new Error(`Download failed: ${res.statusText}`)
  return res.blob()
}

// ── Agents ──

export async function getAgents(): Promise<{ name: string; display_name: string; description: string; type: string }[]> {
  const res = await fetch(`${API_BASE}/api/agents`)
  if (!res.ok) throw new Error(`Agents fetch failed: ${res.statusText}`)
  const data = await res.json()
  return data.agents ?? data
}

export async function getAgent(name: string): Promise<Agent> {
  const res = await fetch(`${API_BASE}/api/agents/${encodeURIComponent(name)}`)
  if (!res.ok) throw new Error(`Agent fetch failed: ${res.statusText}`)
  return res.json()
}

export async function updateAgent(name: string, data: Partial<Agent>): Promise<Agent> {
  const res = await fetch(`${API_BASE}/api/agents/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getAgentPrompt(name: string): Promise<{ content: string; prompt_variables: string[] }> {
  const res = await fetch(`${API_BASE}/api/agents/${encodeURIComponent(name)}/prompt`)
  if (!res.ok) throw new Error(`Prompt fetch failed: ${res.statusText}`)
  return res.json()
}

export async function updateAgentPrompt(name: string, content: string): Promise<{ prompt_variables: string[]; prompt_preview: string }> {
  const res = await fetch(`${API_BASE}/api/agents/${encodeURIComponent(name)}/prompt`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getPostCallPrompt(name: string, analysisName: string): Promise<{ name: string; content: string }> {
  const res = await fetch(`${API_BASE}/api/agents/${encodeURIComponent(name)}/post-call/${analysisName}`)
  if (!res.ok) throw new Error(`Post-call prompt fetch failed: ${res.statusText}`)
  return res.json()
}

export async function updatePostCallPrompt(name: string, analysisName: string, content: string): Promise<{ name: string; content: string }> {
  const res = await fetch(`${API_BASE}/api/agents/${encodeURIComponent(name)}/post-call/${analysisName}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
