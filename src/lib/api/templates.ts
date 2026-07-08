/** Call template catalog (read-only for the dashboard). Routes: `/api/call-templates/*`. */

import { request } from "./http"
import type { CallTemplate } from "../types"

export async function listCallTemplates(): Promise<CallTemplate[]> {
  const data = await request<{ templates?: CallTemplate[] }>("GET", "/api/call-templates")
  const list = data.templates ?? data
  return Array.isArray(list) ? list : []
}

/** Fetch a single template by id or name. */
export function getCallTemplate(idOrName: string): Promise<CallTemplate> {
  return request<CallTemplate>("GET", `/api/call-templates/${encodeURIComponent(idOrName)}`)
}
