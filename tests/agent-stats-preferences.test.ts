import { afterEach, expect, it, vi } from "vitest";
import { readStatsRank, writeStatsRank } from "../lib/agent-stats/preferences";
afterEach(() => vi.unstubAllGlobals());
it("keeps each account and the guest rank separate and rejects invalid stored values", () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  expect(readStatsRank("guest")).toBe("all");
  writeStatsRank("guest", "diamond");
  writeStatsRank("alice", "gold");
  expect(readStatsRank("guest")).toBe("diamond");
  expect(readStatsRank("alice")).toBe("gold");
  expect(readStatsRank("bob")).toBe("all");
  values.set("agent-academy:stats-rank:v1:alice", "diamond3");
  expect(readStatsRank("alice")).toBe("all");
});
it("recovers when local storage is disabled", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("disabled");
    },
    setItem: () => {
      throw new Error("disabled");
    },
  });
  expect(() => writeStatsRank("guest", "diamond")).not.toThrow();
  expect(readStatsRank("guest")).toBe("all");
});
