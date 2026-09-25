/** Safe error vocabulary for boundary failures. Used throughout the CLI flow;
 * accepts only developer-authored codes, emits fixed messages and performs no I/O.
 * Provider payloads and validation values must never become error messages. */
const messages = {
  CONFIG: "Configuration is invalid or live authorization is missing.",
  DATASET: "Dataset, knowledge or fixture validation failed.",
  PROVIDER:
    "Provider request failed, timed out or returned an invalid envelope.",
  FILE: "Unable to read or write an evaluation file.",
  ADAPTER: "Adapter contract failed.",
} as const;
/** Typed error with fixed public messages and no unsafe cause attachment. */
export class EvaluationError extends Error {
  /** Construct a safe failure. No I/O; code selects a fixed message. */
  constructor(public readonly code: keyof typeof messages) {
    super(messages[code]);
    this.name = "EvaluationError";
  }
}
