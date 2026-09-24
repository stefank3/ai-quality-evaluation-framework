/** Local bounded file boundary called by CLI and regression tests. Loads synthetic JSONL,
 * knowledge, fixtures and policy into fresh validated data with reproducibility digests.
 * Reads repository files only; duplicate IDs, unknown context and invalid data fail closed. */
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { z } from "zod";
import { EvaluationCaseSchema, KnowledgeDocumentSchema } from "./domain.js";
import { FixtureSchema } from "./adapters/fixture.js";
import { PolicySchema } from "./policy.js";
import { EvaluationError } from "./errors.js";

/** Compute SHA-256 of an exact string; pure and stable across operating systems. */
export function digest(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
/** Read at most one MiB as UTF-8; throws FILE without disclosing local paths. */
async function readBounded(path: string): Promise<string> {
  try {
    if ((await stat(path)).size > 1048576) throw new EvaluationError("FILE");
    const text = await readFile(path, "utf8");
    if (Buffer.byteLength(text) > 1048576) throw new EvaluationError("FILE");
    return text.replace(/\r\n/g, "\n");
  } catch {
    throw new EvaluationError("FILE");
  }
}
/** Validate related files and return isolated parsed data. Throws DATASET for any mismatch. */
export function parseDataset(
  lines: string,
  knowledge: unknown,
  fixtures: unknown,
  policy: unknown,
) {
  try {
    const rows = lines.trim().split("\n");
    if (rows.length > 100 || rows.some((row) => !row.trim()))
      throw new EvaluationError("DATASET");
    const cases = rows.map((row) =>
      EvaluationCaseSchema.parse(JSON.parse(row)),
    );
    const documents = z
      .array(KnowledgeDocumentSchema)
      .min(1)
      .max(50)
      .parse(knowledge);
    const validatedFixtures = FixtureSchema.parse(fixtures);
    const validatedPolicy = PolicySchema.parse(policy);
    const documentIds = new Set(documents.map((doc) => doc.id));
    const caseIds = new Set(cases.map((item) => item.id));
    if (
      documentIds.size !== documents.length ||
      caseIds.size !== cases.length ||
      cases.some((item) =>
        item.knowledgeIds.some((id) => !documentIds.has(id)),
      ) ||
      cases.some((item) => !Object.hasOwn(validatedFixtures, item.id)) ||
      Object.keys(validatedFixtures).some((id) => !caseIds.has(id))
    )
      throw new EvaluationError("DATASET");
    return {
      cases,
      documents,
      fixtures: validatedFixtures,
      policy: validatedPolicy,
      datasetDigest: digest(
        JSON.stringify([cases, documents, validatedFixtures]),
      ),
      policyDigest: digest(JSON.stringify(validatedPolicy)),
    };
  } catch {
    throw new EvaluationError("DATASET");
  }
}
/** Load fixed repository-relative files. No user-supplied paths or external requests. */
export async function loadDataset() {
  const [lines, knowledge, fixtures, policy] = await Promise.all([
    readBounded("data/cases.jsonl"),
    readBounded("data/knowledge.json"),
    readBounded("data/fixtures.json"),
    readBounded("config/policy.json"),
  ]);
  try {
    return parseDataset(
      lines,
      JSON.parse(knowledge),
      JSON.parse(fixtures),
      JSON.parse(policy),
    );
  } catch {
    throw new EvaluationError("DATASET");
  }
}
/** Fully validated dataset bundle returned to the runner. */
export type Dataset = Awaited<ReturnType<typeof loadDataset>>;
