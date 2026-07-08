/** Payer knowledge base (read-only lookups). Routes: `/api/payers/*`. */

import { request } from "./http"
import type { Payer } from "../types"

/** All payers in the knowledge base. Backend wraps as `{ payers, total }`; we unwrap. */
export async function listPayers(): Promise<Payer[]> {
  const data = await request<{ payers: Payer[]; total: number }>("GET", "/api/payers")
  return data.payers
}

/** Single payer by uuid, `payer_id` slug, or normalized name. */
export function getPayer(idOrSlug: string): Promise<Payer> {
  return request<Payer>("GET", `/api/payers/${encodeURIComponent(idOrSlug)}`)
}
