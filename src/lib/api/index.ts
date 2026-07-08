/**
 * Public API surface for the Cosentus voice dashboard.
 *
 * Import from `@/lib/api` — this barrel re-exports every resource module so
 * call sites don't need to know which file a function lives in. Each module
 * owns one backend resource and routes through the shared `request()` in
 * `./http`, which is the single place that knows the base URL, auth, and error
 * shapes. Data contracts live in `@/lib/types`.
 */

export { API_BASE, ApiError } from "./http"
export type { RequestOptions } from "./http"

export * from "./agents"
export * from "./calls"
export * from "./batches"
export * from "./voices"
export * from "./phones"
export * from "./flows"
export * from "./templates"
export * from "./payers"
export * from "./intelligence"
export * from "./call-requests"
export * from "./test-call"
