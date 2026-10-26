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
  expect(() => writeStatsRank("disabled-guest", "diamond")).not.toThrow();
  expect(readStatsRank("disabled-guest")).toBe("diamond");
  writeStatsRank("disabled-account", "gold");
  expect(readStatsRank("disabled-account")).toBe("gold");
  expect(readStatsRank("disabled-guest")).toBe("diamond");
  expect(readStatsRank("disabled-other")).toBe("all");
});
it("uses the selected rank when reads work but writes fail, then recovers persistence", () => {
  const values = new Map<string, string>();
  let full = true;
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? "iron",
    setItem: (key: string, value: string) => {
      if (full) throw new Error("quota exceeded");
      values.set(key, value);
    },
  });
  writeStatsRank("quota-account", "radiant");
  expect(readStatsRank("quota-account")).toBe("radiant");
  full = false;
  writeStatsRank("quota-account", "silver");
  expect(readStatsRank("quota-account")).toBe("silver");
  values.set("agent-academy:stats-rank:v1:quota-account", "gold");
  expect(readStatsRank("quota-account")).toBe("gold");
});
