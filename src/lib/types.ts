/**
 * API data contracts for the Cosentus voice dashboard.
 *
 * These mirror the response shapes served by `api-lambda-v2` (the backend is
 * the source of truth). When the backend changes a shape, change it here — the
 * resource modules under `./api` and the components both read from this file,
 * so it is the single definition of "what the data looks like".
 *
 * Fields marked `@deprecated` are shapes the backend no longer sends; they are
 * kept optional so existing components still compile, and are the checklist for
 * the UI-migration phase.
 */

// ── Calls ───────────────────────────────────────────────────────────

export type CallDirection = "outbound" | "inbound" | "browser" | "test"

export type CallStatus =
  | "pending"
  | "queued"
  | "dialing"
  | "in_progress"
  | "completed"
  | "failed"
  | "no_answer"
  | "busy"
  | "cancelled"

/**
 * One turn of the call transcript.
 *
 * The backend emits `speaker` (`assistant` | `user` | `tool`) plus turn
 * metadata. The old `role` field never existed on the wire — components that
 * still read `.role` must migrate to `.speaker` in the UI phase.
 */
export interface TranscriptTurn {
  speaker: "user" | "assistant" | "tool"
  content: string
  timestamp: string
  interrupted?: boolean
  turn_number?: number
  /** @deprecated Not sent by the backend; use {@link TranscriptTurn.speaker}. */
  role?: "user" | "assistant"
}

/** Quality score attached to a single call detail (from `voice_call_scores`). */
export interface CallScore {
  overall: number
  criteria_total: number
  criteria_met: number
  rubric_source: string
  template_name: string | null
  use_case: string | null
  criteria: { name: string; met: boolean; note?: string }[]
}

export interface Call {
  id: string
  agent_name: string
  agent_display_name?: string | null
  from_number?: string | null
  target_number: string
  direction: CallDirection
  status: CallStatus
  started_at: string | null
  ended_at: string | null
  duration_secs: number | null
  case_data: Record<string, string>
  transcript: TranscriptTurn[]
  recording_path: string | null
  post_call_analyses: Record<string, unknown>
  error: string | null
  batch_id: string | null
  batch_row_index: number | null
  session_id?: string | null
  terminal_step?: string | null
  transferred?: boolean
  latency_ms?: number | null
  hidden?: boolean
  /** Present only on `GET /api/calls/:id` (detail), not on the list. */
  score?: CallScore | null
  created_at: string
  updated_at: string
}

export interface CallListResponse {
  calls: Call[]
  total: number
  page: number
  page_size: number
}

// ── Post-call extraction schema ─────────────────────────────────────

export interface PostCallField {
  name: string
  type: "text" | "selector"
  description?: string
  format_examples?: string[]
  choices?: string[]
}

export interface PostCallConfig {
  model: string
  fields: PostCallField[]
}

// ── Batches ─────────────────────────────────────────────────────────

export type BatchStatus =
  | "draft"
  | "validating"
  | "ready"
  | "scheduled"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled"

export interface Batch {
  id: string
  name: string
  agent_name: string
  agent_display_name?: string | null
  from_number: string
  status: BatchStatus
  total_rows: number
  completed_rows: number
  failed_rows: number
  input_file_path: string | null
  output_file_path: string | null
  timezone: string | null
  calling_window_start: string | null
  calling_window_end: string | null
  calling_window_days: string[] | null
  concurrency: number | null
  created_at: string
  updated_at: string
}

/** Per-status counts returned by batch detail / progress. */
export interface BatchProgress {
  total: number
  completed: number
  failed: number
  pending: number
  dialing: number
  queued: number
  skipped: number
  cancelled: number
}

export interface BatchDetailResponse {
  batch: Batch
  calls: Call[]
  progress: BatchProgress
}

/** One parsed row returned by `POST /api/batches/upload`. */
export interface UploadedRow {
  row_index: number
  phone: string
  phone_e164: string | null
  validation: "valid" | "fixable" | "invalid"
  data: Record<string, string>
  case_data: Record<string, string>
  missing_required_fields: string[]
  incomplete_reason: string | null
  /** @deprecated Old upload shape; the batch wizard still reads these until the UI phase. */
  index?: number
  /** @deprecated Use {@link UploadedRow.phone}. */
  phone_raw?: string
  /** @deprecated Use {@link UploadedRow.phone_e164}. */
  phone_normalized?: string
  /** @deprecated Use {@link UploadedRow.validation}. */
  status?: "valid" | "fixable" | "invalid"
  /** @deprecated Use {@link UploadedRow.incomplete_reason}. */
  error?: string | null
}

export interface UploadResponse {
  batch_id: string
  columns: string[]
  summary: { total: number; valid: number; fixable: number; invalid: number }
  rows: UploadedRow[]
}

// ── Agents ──────────────────────────────────────────────────────────

/** A conversation tool bound to an agent (end_call, press_digit, transfer_call). */
export interface AgentTool {
  type: string
  description: string
  settings: Record<string, unknown>
}

export interface Agent {
  id: string
  name: string
  display_name: string
  description: string
  llm_provider: string
  llm_model: string
  temperature: number
  max_tokens: number
  enable_prompt_caching: boolean
  tts_provider: string
  tts_voice_id: string
  tts_model: string
  tts_stability: number
  tts_similarity_boost: number
  tts_style: number
  tts_use_speaker_boost: boolean
  tts_speed: number
  stt_provider: string
  stt_language: string
  stt_keywords: string[]
  tools: AgentTool[]
  system_prompt: string
  first_message: string
  // v2 (June rebuild) — structured conversation + identity/IVR policy
  flow_definition: FlowDefinition | null
  ivr_goal: string
  identity_verification_keys: string[]
  call_kind: "payer" | "patient" | null
  required_fields: string[]
  success_criteria: string[]
  recording_enabled: boolean
  recording_channels: number
  post_call_analyses: PostCallConfig
  idle_timeout_secs: number
  idle_message: string
  max_call_duration_secs: number
  voicemail_action: string
  voicemail_message: string
  max_retries: number
  retry_delay_secs: number
  default_concurrency: number
  calling_window_start: string
  calling_window_end: string
  calling_window_days: string[]
  is_active: boolean
  speak_first: boolean
  created_at: string
  updated_at: string
}

/** Row in `agent_drafts` — same shape as Agent plus draft metadata. */
export interface AgentDraft extends Agent {
  agent_id: string
  has_unpublished_changes: boolean
}

export interface AgentVersion {
  id: string
  agent_id: string
  version_number: number
  version_name: string
  description: string
  config_snapshot: Record<string, unknown>
  phone_assignments: { number: string; friendly_name: string; direction: string }[]
  published_at: string
  published_by: string | null
}

/** Slim item from `GET /api/agents` (list); full fields come from the detail route. */
export interface AgentListItem {
  id?: string
  name: string
  display_name: string
  description?: string
  llm_model?: string | null
  tts_model?: string | null
  tts_voice_id?: string | null
}

export interface AgentSchema {
  llm_models: string[]
  tts_providers: string[]
  tts_models: Record<string, string[]> | string[]
  tts_models_by_provider?: Record<string, string[]>
  stt_providers: string[]
  stt_languages: string[]
  tool_types: string[]
  tool_settings_schema: Record<string, unknown>
  voicemail_actions: string[]
  calling_days?: string[]
  // v2 additions
  post_call_field_types?: string[]
  identity_verification_keys?: string[]
  call_kinds?: (string | null)[]
  max_prompt_length?: number
  max_display_name_length?: number
  max_first_message_length?: number
  valid_recording_channels?: number[]
  field_ranges: Record<string, { min: number; max: number; step: number; default: number }>
  defaults: Record<string, unknown>
}

// ── Flows (v2) ──────────────────────────────────────────────────────

/**
 * A structured conversation flow. The node graph is intentionally permissive
 * here — the backend validates the full graph (start present, reachability, no
 * cycles) on save/test; the dashboard only needs the envelope plus the common
 * node fields it renders.
 */
export interface FlowNode {
  type: string
  prompt?: string
  transitions?: Record<string, string>
  captures?: string[]
  [key: string]: unknown
}

export interface FlowDefinition {
  version: number
  start: string
  nodes: Record<string, FlowNode>
  [key: string]: unknown
}

export interface FlowResponse {
  agent_id: string
  flow_definition: FlowDefinition | null
}

/** Result of `POST /api/agents/:name/flow/test` — validate + dry-run, never dials. */
export interface FlowTestResult {
  agent_id: string
  valid: boolean
  errors: string[]
  status: string
  path: string[]
  captures: Record<string, unknown>
  warnings: string[]
  note?: string
}

// ── Call templates (v2) ─────────────────────────────────────────────

export interface CallTemplate {
  id: string
  name: string
  display_name: string
  use_case: string
  description: string
  system_prompt: string
  first_message: string
  required_fields: string[]
  success_criteria: string[]
  post_call_analyses: PostCallConfig
  llm_model: string
  flow_definition: FlowDefinition | null
  call_kind: "payer" | "patient" | null
  ivr_goal: string
  identity_verification_keys: string[]
}

// ── Payer knowledge base (v2) ───────────────────────────────────────

export interface Payer {
  id: string
  payer_name: string
  payer_id: string | null
  phone_claims: string | null
  phone_auth: string | null
  phone_eligibility: string | null
  phone_appeals: string | null
  fax_claims: string | null
  fax_appeals: string | null
  portal_url: string | null
  ivr_path_claims: string | null
  timely_filing_days: number | null
  appeal_deadline_days: number | null
  payer_type: string | null
}

// ── Post-call intelligence / analytics (v2) ─────────────────────────

export interface RoiSummary {
  calls: { total: number; completed: number; no_answer: number; completion_rate: number }
  costs: {
    total_spent: number
    avg_per_call: number
    calls_costed: number
    is_estimate: boolean
    estimate_note: string
  }
  quality: { avg_score: number; high_quality_pct: number }
  roi: {
    estimated_recovered: number
    total_spent: number
    roi_multiple: number
    is_estimate: boolean
    estimate_note: string
  }
  success_rate: number
  success_rate_definition: string
  transfer_rate: number
  avg_latency_ms: number
  dropoff_by_step: { step_name: string; count: number }[]
}

export interface DenialPattern {
  payer: string
  denial_reason: string
  call_count: number
  resolved: number
  common_actions: string[]
  avg_duration: number
}

/** Result of triggering the post-call auto-action pipeline for a call. */
export interface AutoActionResult {
  call_id: string
  actions_taken: number
  actions: { type: string; table: string }[]
  cost: number
  cost_is_estimate: boolean
  cost_estimate_note: string
  quality_score: number | null
}

// ── Call requests (v2 single-call queue) ────────────────────────────

export type CallRequestStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"

export interface CallRequest {
  id: string
  agent_name: string
  to_number: string
  from_number: string
  case_data: Record<string, string>
  trigger_source: string | null
  dedup_key: string | null
  status: CallRequestStatus
  attempt_count: number
  max_attempts: number | null
  call_id: string | null
  error_message: string | null
  scheduled_after: string | null
  calling_window_start: string | null
  calling_window_end: string | null
  calling_window_timezone: string | null
  calling_window_days: string[] | null
  created_at: string
  updated_at: string
}

// ── Phone numbers ───────────────────────────────────────────────────

export type PhoneNumberProvider = "daily" | "twilio"

export interface PhoneNumberAgentRef {
  id: string
  name: string
  display_name: string
}

export interface PhoneNumber {
  id: string
  number: string
  friendly_name: string
  inbound_agent: PhoneNumberAgentRef | null
  outbound_agent: PhoneNumberAgentRef | null
  is_active: boolean
  /** `'twilio'` for pre-migration numbers; `'daily'` for anything bought since. */
  provider?: PhoneNumberProvider
  /** Daily's UUID for the number; required to release a Daily number, null for twilio rows. */
  daily_number_id?: string | null
}

// ── Voices ──────────────────────────────────────────────────────────

export interface Voice {
  voice_id: string
  name: string
  custom_name: string | null
  description: string | null
  preview_url: string | null
  gender: string | null
  accent: string | null
  age: string | null
  category: string | null
  labels: Record<string, string> | null
  created_at: string
}

// ── Test call (browser) ─────────────────────────────────────────────

/** Response from the engine's `POST /start { direction: "browser" }`. */
export interface BrowserCallSession {
  call_id: string
  room_name: string
  room_url: string
  viewer_token: string
  status: string
}
