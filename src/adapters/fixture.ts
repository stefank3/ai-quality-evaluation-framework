/** Offline adapter called by the deterministic runner. Reads prevalidated in-memory
 * synthetic fixtures, returns fresh payload copies and fixed duration, never uses network.
 * Unknown case IDs fail closed rather than returning a generic successful answer. */
import { z } from "zod";
import { ModelRequestSchema, type ModelRequest } from "../domain.js";
import { EvaluationError } from "../errors.js";
import type { ModelAdapter, AdapterResponse } from "./model.js";
/** Fixture envelope permits intentionally malformed response payloads, but validates timing. */
export const FixtureSchema = z.record(
  z.string(),
  z.strictObject({
    payloads: z.array(z.unknown()).min(1).max(3),
    durationMs: z.number().finite().nonnegative().max(60000),
  }),
);
/** Deterministic fixture adapter; per-case counters model intentional repeat instability. */
export class FixtureAdapter implements ModelAdapter {
  /** Stable report identity without environment-specific values. */
  readonly identity = "fixture-v1";
  private readonly fixtures: z.infer<typeof FixtureSchema>;
  private readonly calls = new Map<string, number>();
  /** Copy and validate fixtures. Throws DATASET on invalid fixture envelopes; no I/O. */
  constructor(fixtures: unknown) {
    const parsed = FixtureSchema.safeParse(fixtures);
    if (!parsed.success) throw new EvaluationError("DATASET");
    this.fixtures = structuredClone(parsed.data);
  }
  /** Return isolated payload and fixed latency for a known request; throws ADAPTER on mismatch. */
  async generate(request: ModelRequest): Promise<AdapterResponse> {
    if (!ModelRequestSchema.safeParse(request).success)
      throw new EvaluationError("ADAPTER");
    if (!Object.hasOwn(this.fixtures, request.caseId))
      throw new EvaluationError("ADAPTER");
    const fixture = this.fixtures[request.caseId];
    if (!fixture) throw new EvaluationError("ADAPTER");
    const count = this.calls.get(request.caseId) ?? 0;
    this.calls.set(request.caseId, count + 1);
    return {
      payload: structuredClone(
        fixture.payloads[count % fixture.payloads.length],
      ),
      durationMs: fixture.durationMs,
    };
  }
}
