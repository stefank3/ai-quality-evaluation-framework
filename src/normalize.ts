/** Pure deterministic text comparison used by concept, grounding and stability checks.
 * Called by evaluators; input text becomes NFKC lower-case Unicode word tokens.
 * Marker matching uses a separate compact substring policy. No I/O or semantic
 * inference; ordinary phrases retain word boundaries, synonyms are not interpreted. */
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
/** Compact synthetic markers: NFKC/lowercase, drop format characters and separators.
 * Substrings intentionally match adjoining letters/digits; not for ordinary phrases. */
export function normalizeMarker(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\p{Cf}/gu, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}
/** Detect a nonempty configured marker without exposing its value in a result. */
export function includesMarker(answer: string, marker: string): boolean {
  const expected = normalizeMarker(marker);
  return expected.length > 0 && normalizeMarker(answer).includes(expected);
}
