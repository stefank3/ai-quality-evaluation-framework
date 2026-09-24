/** Provider-independent transport contract between runner and adapters. No I/O here;
 * adapter implementations return unknown payloads so malformed responses remain testable.
 * Errors must use safe developer-authored messages, never provider text. */
import type { ModelRequest } from "../domain.js";
/** Transport observation with explicit adapter timing; payload remains untrusted. */
export interface AdapterResponse {
  readonly payload: unknown;
  readonly durationMs: number;
}
/** Minimal interchangeable adapter; each call must return isolated mutable data. */
export interface ModelAdapter {
  /** Stable non-secret identity included in reports. */
  readonly identity: "fixture-v1" | "openai-compatible-v1";
  /** Generate from validated request. May perform authorized I/O and throw a safe error. */
  generate(request: ModelRequest): Promise<AdapterResponse>;
}
