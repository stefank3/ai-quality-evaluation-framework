/** CLI/environment boundary called before loading data or constructing an adapter.
 * Converts explicit arguments and selected environment keys into bounded configuration.
 * No I/O; rejects unknown arguments, CI live use, unsafe URLs and implicit authorization. */
import { z } from "zod";
import { EvaluationError } from "./errors.js";

/** Explicit live options; HTTPS only, one request at a time and no automatic retries. */
export const LiveConfigSchema = z.strictObject({
  authorized: z.literal("I_AUTHORIZE_LIVE"),
  model: z.string().regex(/^[a-zA-Z0-9._:/-]{1,100}$/),
  endpoint: z.url().refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  }),
  apiKey: z
    .string()
    .min(1)
    .max(500)
    .regex(/^[\x21-\x7e]+$/)
    .optional(),
  maxCases: z.coerce.number().int().min(1).max(20),
  timeoutMs: z.coerce.number().int().min(100).max(30000),
});
/** Validated options kept in memory, never placed in reports or logs. */
export type LiveConfig = z.infer<typeof LiveConfigSchema>;
/** Parsed CLI selection. Case filters use stable IDs, not file paths. */
export interface Config {
  readonly command: "eval" | "list" | "live";
  readonly caseId?: string;
  readonly live?: LiveConfig;
}
/** Parse CLI arguments and environment; throws CONFIG before any provider operation. */
export function parseConfig(
  args: readonly string[],
  env: NodeJS.ProcessEnv,
): Config {
  const [command, flag, caseId, ...rest] = args;
  if (
    !["eval", "list", "live"].includes(command ?? "") ||
    rest.length > 0 ||
    (flag !== undefined &&
      (flag !== "--case" || !caseId || !/^[a-z][a-z0-9-]{1,63}$/.test(caseId)))
  ) {
    throw new EvaluationError("CONFIG");
  }
  const selection = caseId === undefined ? {} : { caseId };
  if (command === "eval" || command === "list")
    return { command, ...selection };
  if (env.CI !== undefined || env.GITHUB_ACTIONS !== undefined)
    throw new EvaluationError("CONFIG");
  const parsed = LiveConfigSchema.safeParse({
    authorized: env.AI_EVAL_LIVE,
    endpoint: env.AI_EVAL_ENDPOINT,
    model: env.AI_EVAL_MODEL,
    maxCases: env.AI_EVAL_MAX_CASES,
    timeoutMs: env.AI_EVAL_TIMEOUT_MS,
    ...(env.AI_EVAL_API_KEY === undefined
      ? {}
      : { apiKey: env.AI_EVAL_API_KEY }),
  });
  if (!parsed.success) throw new EvaluationError("CONFIG");
  return { command: "live", ...selection, live: parsed.data };
}
