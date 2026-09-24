/** Pure deterministic text comparison used by concept, grounding and stability checks.
 * Called by evaluators; input text becomes NFKC lower-case Unicode word tokens.
 * No I/O or semantic inference; punctuation/whitespace are ignored, synonyms are not. */
/** Normalize text to space-separated words; never throws for string input. */
export function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
/** Match a whole normalized phrase; empty normalized concepts cannot match. */
export function includesConcept(answer: string, concept: string): boolean {
  const expected = normalize(concept);
  return (
    expected.length > 0 && ` ${normalize(answer)} `.includes(` ${expected} `)
  );
}
