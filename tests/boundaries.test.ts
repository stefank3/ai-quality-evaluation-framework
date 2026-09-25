/** Offline configuration/HTTP adapter contract tests. Transport is an in-memory fake;
 * network is prohibited, including in the tests that exercise authorized configuration.
 * Checks sanitized errors, HTTPS, redirects, timeouts, body bounds and mutable requests. */
import { afterEach, it, expect, vi } from "vitest";
import { parseConfig, type LiveConfig } from "../src/config.js";
import { LiveAdapter } from "../src/adapters/live.js";
const config: LiveConfig = {
  authorized: "I_AUTHORIZE_LIVE",
  model: "synthetic-model",
  endpoint: "https://example.invalid/chat/completions",
  maxCases: 1,
  timeoutMs: 100,
};
const request = {
  caseId: "test-case",
  input: "synthetic input",
  context: [{ id: "kb-test", title: "Test", text: "synthetic evidence" }],
};
const authorizedEnvironment = {
  AI_EVAL_LIVE: "I_AUTHORIZE_LIVE",
  AI_EVAL_MODEL: config.model,
  AI_EVAL_ENDPOINT: config.endpoint,
  AI_EVAL_MAX_CASES: "1",
  AI_EVAL_TIMEOUT_MS: "100",
};
it.each([{ CI: "true" }, { CI: "" }, { GITHUB_ACTIONS: "true" }])(
  "rejects otherwise valid live configuration with CI marker %j",
  (marker) => {
    expect(() =>
      parseConfig(["live"], { ...authorizedEnvironment, ...marker }),
    ).toThrow("Configuration");
  },
);
it("parses fully authorized manual live settings outside CI", () => {
  expect(
    parseConfig(["live", "--case", "grounded-answer"], authorizedEnvironment),
  ).toEqual({ command: "live", caseId: "grounded-answer", live: config });
});
it.each(["1", "20"])("converts the valid case-count boundary %s", (value) => {
  expect(
    parseConfig(["live"], {
      ...authorizedEnvironment,
      AI_EVAL_MAX_CASES: value,
    }).live?.maxCases,
  ).toBe(Number(value));
});
it.each([undefined, "", "0", "21", "1.5", "NaN", "Infinity", "invalid"])(
  "rejects invalid live case count %s",
  (value) => {
    expect(() =>
      parseConfig(["live"], {
        ...authorizedEnvironment,
        AI_EVAL_MAX_CASES: value,
      }),
    ).toThrow("Configuration");
  },
);
it.each([
  ["CI", "true"],
  ["CI", ""],
  ["GITHUB_ACTIONS", "true"],
])("adapter rejects %s=%s before any transport call", (name, value) => {
  localEnvironment();
  vi.stubEnv(name, value);
  const transport = vi.fn<typeof fetch>();
  expect(() => new LiveAdapter(config, transport)).toThrow("Configuration");
  expect(transport).not.toHaveBeenCalled();
});
/** Temporarily remove CI markers for in-memory transport tests; restored after each test. */
function localEnvironment(): void {
  vi.stubEnv("CI", undefined);
  vi.stubEnv("GITHUB_ACTIONS", undefined);
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
it("fails live closed without explicit opt-in and rejects malformed arguments", () => {
  expect(() => parseConfig(["live"], {})).toThrow("Configuration");
  for (const args of [
    [],
    ["unknown"],
    ["eval", "--oops"],
    ["eval", "--case"],
    ["eval", "--case", "../escape"],
  ])
    expect(() => parseConfig(args, {})).toThrow();
  expect(parseConfig(["eval"], { AI_EVAL_LIVE: "I_AUTHORIZE_LIVE" })).toEqual({
    command: "eval",
  });
});
it("rejects live in CI and unsafe endpoint or unbounded options", () => {
  localEnvironment();
  for (const endpoint of [
    "http://localhost:3000",
    "https://user:pass@example.invalid",
    "https://example.invalid?key=x",
    "https://example.invalid#fragment",
  ])
    expect(() => new LiveAdapter({ ...config, endpoint })).toThrow();
  expect(() => new LiveAdapter({ ...config, maxCases: 21 })).toThrow();
  vi.stubEnv("CI", "true");
  expect(() => new LiveAdapter(config)).toThrow();
});
it("sends only the minimum request with disabled redirects and returns parsed unknown payload", async () => {
  localEnvironment();
  const transport = vi.fn<typeof fetch>(async (_url, options) => {
    expect(options?.redirect).toBe("error");
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(options?.body).not.toContain("requiredConcepts");
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              answer: "synthetic evidence",
              refused: false,
              citations: [{ documentId: "kb-test" }],
            }),
          },
        },
      ],
    });
  });
  const result = await new LiveAdapter(config, transport).generate(request);
  expect(result.durationMs).toBeGreaterThanOrEqual(0);
  expect(result.payload).toHaveProperty("answer", "synthetic evidence");
  expect(transport).toHaveBeenCalledTimes(1);
});
it.each([401, 429, 500, 302])(
  "sanitizes HTTP %s without reading the provider payload or retrying",
  async (status) => {
    localEnvironment();
    const transport = vi.fn<typeof fetch>(
      async () => new Response("PRIVATE-PROVIDER-PAYLOAD", { status }),
    );
    await expect(
      new LiveAdapter(config, transport).generate(request),
    ).rejects.toThrow("Provider request failed");
    expect(transport).toHaveBeenCalledTimes(1);
  },
);
it("sanitizes transport exceptions and malformed or oversized envelopes", async () => {
  localEnvironment();
  for (const transport of [
    vi.fn<typeof fetch>(async () => {
      throw new Error("PRIVATE-TOKEN");
    }),
    vi.fn<typeof fetch>(async () => new Response("not JSON")),
    vi.fn<typeof fetch>(async () => new Response("x".repeat(65537))),
    vi.fn<typeof fetch>(async () => Response.json({ choices: [] })),
  ]) {
    await expect(
      new LiveAdapter(config, transport).generate(request),
    ).rejects.toThrow(
      /^Provider request failed, timed out or returned an invalid envelope\.$/,
    );
  }
});
it("aborts a pending request at the configured timeout without network", async () => {
  localEnvironment();
  vi.useFakeTimers();
  const transport = vi.fn<typeof fetch>(
    (_url, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () =>
          reject(new Error("unsafe timeout detail")),
        );
      }),
  );
  const result = new LiveAdapter(config, transport).generate(request);
  const assertion = expect(result).rejects.toThrow("Provider request failed");
  await vi.advanceTimersByTimeAsync(101);
  await assertion;
});
it("bounds simultaneous requests and total calls independently of the runner", async () => {
  localEnvironment();
  const transport = vi.fn<typeof fetch>(async () =>
    Response.json({ choices: [{ message: { content: "{}" } }] }),
  );
  const adapter = new LiveAdapter(config, transport);
  const pending = adapter.generate(request);
  await expect(adapter.generate(request)).rejects.toThrow("Adapter contract");
  await pending;
  await adapter.generate(request);
  await expect(adapter.generate(request)).rejects.toThrow("Adapter contract");
  expect(transport).toHaveBeenCalledTimes(2);
});
