/** Phone numbers: routing, search, buy, release (Daily provider). Routes: `/api/phone-numbers/*`. */

import { request } from "./http"
import type { PhoneNumber } from "../types"

export async function getPhoneNumbers(): Promise<PhoneNumber[]> {
  const data = await request<{ phone_numbers?: PhoneNumber[] } | PhoneNumber[]>(
    "GET",
    "/api/phone-numbers",
  )
  return Array.isArray(data) ? data : (data.phone_numbers ?? [])
}

export function updatePhoneNumber(id: string, data: Record<string, unknown>): Promise<PhoneNumber> {
  return request("PUT", `/api/phone-numbers/${encodeURIComponent(id)}`, { json: data })
}

/**
 * Search available Daily numbers. The backend accepts camelCase `areaCode`
 * (kept here for compatibility) alongside the other snake_case filters.
 */
export function searchAvailableNumbers(params: {
  area_code?: string
  country?: string
  contains?: string
  limit?: number
}): Promise<Record<string, unknown>> {
  return request("GET", "/api/phone-numbers/search", {
    query: {
      provider: "daily",
      areaCode: params.area_code,
      country: params.country,
      contains: params.contains,
      limit: params.limit,
    },
  })
}

/** Buy a Daily number. Returns the persisted row (incl. `daily_number_id`). */
export function purchaseNumber(data: { number: string; friendly_name: string }): Promise<PhoneNumber> {
  return request("POST", "/api/phone-numbers/buy", {
    json: { provider: "daily", number: data.number, friendly_name: data.friendly_name },
  })
}

/** Release a number: Daily's API first, then the DB row. */
export function releaseNumber(id: string): Promise<{ released: boolean; provider: string }> {
  return request("DELETE", `/api/phone-numbers/${encodeURIComponent(id)}`)
}
