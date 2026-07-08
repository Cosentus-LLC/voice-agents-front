/**
 * Core HTTP layer for the Cosentus voice dashboard.
 *
 * Every resource module (agents, calls, batches, …) goes through `request()`
 * here so there is exactly one place that knows about the base URL, auth,
 * query-string building, and the backend's two error-body shapes. Resource
 * modules stay thin: they name a route, pass a typed body, and get a typed
 * result back.
 *
 * The backend (`api-lambda-v2`) is the source of truth for shapes; the types
 * in `../types.ts` mirror it. This file does not guess shapes — callers assert
 * the response type they expect from the documented route.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

/**
 * Auth header for every request.
 *
 * Today the API is gated at API Gateway and the dashboard presents a static
 * `X-API-Key`. This is deliberately the ONLY place auth is assembled, so
 * moving to a Cognito bearer token later is a one-function change and never
 * touches a resource module. Returns an empty object when no key is set
 * (local dev against an unauthenticated backend).
 */
function authHeaders(): Record<string, string> {
  const key = process.env.NEXT_PUBLIC_COSENTUS_API_KEY
  return key ? { "X-API-Key": key } : {}
}

/** Error thrown for any non-2xx response. Carries the parsed body for callers that want it. */
export class ApiError extends Error {
  readonly status: number
  readonly body: unknown
  readonly details?: string[]

  constructor(message: string, status: number, body: unknown, details?: string[]) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.body = body
    this.details = details
  }
}

/**
 * The backend returns two distinct error shapes:
 *   - Handler errors (FastAPI-legacy):  `{ detail: string | [{ msg }] }`
 *   - Zod validation failures:          `{ error: "Validation failed", details: string[] }`
 * Plain strings and anything else fall through to a stringified fallback.
 */
function messageFromBody(body: unknown): { message: string; details?: string[] } {
  if (typeof body === "string") return { message: body }
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>

    if (Array.isArray(o.details) && o.details.length > 0) {
      const details = o.details.map((d) => String(d))
      const head = typeof o.error === "string" ? o.error : "Validation failed"
      return { message: `${head}: ${details.join("; ")}`, details }
    }

    const detail = o.detail
    if (typeof detail === "string") return { message: detail }
    if (Array.isArray(detail)) {
      const msgs = detail.map((x) =>
        x && typeof x === "object" && "msg" in x
          ? String((x as { msg: unknown }).msg)
          : String(x),
      )
      return { message: msgs.join("; ") || "Request failed" }
    }

    if (typeof o.error === "string") return { message: o.error }
  }
  return { message: "Request failed" }
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

type QueryValue = string | number | boolean | null | undefined

export interface RequestOptions {
  /** Query params; null/undefined entries are skipped. */
  query?: Record<string, QueryValue>
  /** JSON body — serialized and sent with `Content-Type: application/json`. */
  json?: unknown
  /** Multipart body — sent as-is; the browser sets the boundary content-type. */
  form?: FormData
  signal?: AbortSignal
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = `${API_BASE}${path}`
  if (!query) return url
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v !== null && v !== undefined && v !== "") qs.set(k, String(v))
  }
  const s = qs.toString()
  return s ? `${url}?${s}` : url
}

function buildInit(method: string, opts: RequestOptions): RequestInit {
  const headers: Record<string, string> = { ...authHeaders() }
  let body: BodyInit | undefined

  if (opts.form) {
    body = opts.form // do NOT set Content-Type — the browser adds the multipart boundary
  } else if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json"
    body = JSON.stringify(opts.json)
  }

  return { method, headers, body, signal: opts.signal }
}

/**
 * Perform a request and parse a JSON result of type `T`.
 * Throws {@link ApiError} on any non-2xx status.
 */
export async function request<T>(
  method: string,
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const res = await fetch(buildUrl(path, opts.query), buildInit(method, opts))
  const body = await parseBody(res)
  if (!res.ok) {
    const { message, details } = messageFromBody(body)
    throw new ApiError(message, res.status, body, details)
  }
  return body as T
}

/**
 * Perform a request and return the raw {@link Response} (for blob downloads,
 * 302 redirects, etc.). Still throws {@link ApiError} on non-2xx so callers
 * don't have to re-check `res.ok`.
 */
export async function requestRaw(
  method: string,
  path: string,
  opts: RequestOptions = {},
): Promise<Response> {
  const res = await fetch(buildUrl(path, opts.query), buildInit(method, opts))
  if (!res.ok) {
    const body = await parseBody(res)
    const { message, details } = messageFromBody(body)
    throw new ApiError(message, res.status, body, details)
  }
  return res
}
