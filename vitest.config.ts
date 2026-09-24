/** Offline test runner configuration. Invoked by npm test; discovers unit/contract/CLI
 * tests and installs the network-denial preload in each worker. No provider credentials.
 * Fork isolation prevents mutated globals crossing files; failing tests exit nonzero. */
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["scripts/offline.mjs"],
    pool: "forks",
    maxWorkers: 2,
    testTimeout: 20000,
  },
});
