import { describe, expect, it } from "vitest";
import diamond from "./fixtures/agent-stats/abyss-diamond.json";
import allRanks from "./fixtures/agent-stats/abyss-all.json";
import ascent from "./fixtures/agent-stats/ascent-diamond.json";
import radiant from "./fixtures/agent-stats/abyss-radiant.json";
import { parseTrackerStats } from "../lib/agent-stats/parser";
import {
  DIVISIONS,
  STATS_MAPS,
  isMapAgentStats,
  sortAgentStats,
  trackerUrl,
  trackerScrapeUrl,
} from "../lib/agent-stats/model";
import { getMaps } from "../lib/catalog/catalog";

const html = (data: unknown) =>
  `<html><script>window.__INITIAL_STATE__ = ${JSON.stringify(data)};</script></html>`;
const rows = () =>
  structuredClone(Object.values(diamond["insights-v2"].insights)[0].insights);
const withRows = (list: ReturnType<typeof rows>) => ({
  "insights-v2": {
    insights: {
      "valorant|agents|division:diamond,map:abyss,playlist:competitive,region:eu":
        { insights: list },
    },
  },
});

describe("real Tracker statistics fixtures captured 2026-10-20", () => {
  it("accepts a complete Radiant sample with zero-observation agents omitted", () => {
    const result = parseTrackerStats(html(radiant), "abyss", "radiant");
    expect(result).toHaveLength(27);
    expect(result.some((agent) => agent.agentSlug === "breach")).toBe(false);
  });
  it("reads precise numeric fields, not rounded display strings or Played %", () => {
    const result = parseTrackerStats(html(diamond), "abyss", "diamond");
    expect(result).toHaveLength(29);
    expect(result[0]).toMatchObject({
      agentSlug: "clove",
      tier: "S",
      nonMirroredWlPercentage: 55.5,
      wlPercentage: 52.79,
      pickRate: 32.36,
      playedPct: 9.67,
    });
    expect(result.find((r) => r.agentSlug === "kayo")).toBeDefined();
    expect(sortAgentStats(result)).toEqual(result);
  });
  it("handles All Ranks and a different map without mixing filter scopes", () => {
    expect(parseTrackerStats(html(allRanks), "abyss", "all")).toHaveLength(29);
    expect(parseTrackerStats(html(ascent), "ascent", "diamond")).toHaveLength(
      29,
    );
    expect(() => parseTrackerStats(html(diamond), "abyss", "all")).toThrow();
    expect(() => parseTrackerStats(html(ascent), "abyss", "diamond")).toThrow();
    const wrong = rows();
    wrong[0].attributes.region = "na";
    expect(() =>
      parseTrackerStats(html(withRows(wrong)), "abyss", "diamond"),
    ).toThrow("filter mismatch");
  });
  it("distinguishes explicit no data from missing, blocked, partial and duplicate results", () => {
    expect(parseTrackerStats(html(withRows([])), "abyss", "diamond")).toEqual(
      [],
    );
    expect(() =>
      parseTrackerStats(
        "<h1>Just a moment</h1><script src='/cf-chl-test'></script>",
        "abyss",
        "diamond",
      ),
    ).toThrow("blocked page");
    expect(() => parseTrackerStats(html({}), "abyss", "diamond")).toThrow();
    expect(() =>
      parseTrackerStats(html(withRows(rows().slice(1))), "abyss", "diamond"),
    ).toThrow("incomplete");
    const dup = rows();
    dup[1] = dup[0];
    expect(() =>
      parseTrackerStats(html(withRows(dup)), "abyss", "diamond"),
    ).toThrow("duplicate");
  });
  it("rejects absent stats, invalid numbers, unknown agents and executable state", () => {
    const bad = rows();
    bad[0].stats.pickRate.value = 101;
    expect(() =>
      parseTrackerStats(html(withRows(bad)), "abyss", "diamond"),
    ).toThrow("pickRate");
    bad[0].stats.pickRate.value = NaN;
    expect(() =>
      parseTrackerStats(html(withRows(bad)), "abyss", "diamond"),
    ).toThrow();
    const unknown = rows();
    unknown[0].attributes.agent = "future-agent";
    expect(() =>
      parseTrackerStats(html(withRows(unknown)), "abyss", "diamond"),
    ).toThrow("unknown");
    const missing = rows();
    Reflect.deleteProperty(missing[0].stats, "nonMirroredWlPercentage");
    expect(() =>
      parseTrackerStats(html(withRows(missing)), "abyss", "diamond"),
    ).toThrow();
    expect(() =>
      parseTrackerStats(
        "<script>window.__INITIAL_STATE__ = (() => { throw new Error('Executed'); })()</script>",
        "abyss",
        "diamond",
      ),
    ).toThrow(SyntaxError);
  });
  it("schedules 130 supported combinations and validates scoped offline snapshots", () => {
    expect(
      STATS_MAPS.every((slug) => getMaps().some((m) => m._id === slug)),
    ).toBe(true);
    expect(STATS_MAPS.length * DIVISIONS.length).toBe(130);
    expect(
      new URL(trackerUrl("abyss", "all")).searchParams.has("division"),
    ).toBe(false);
    expect(() => trackerUrl("district", "diamond")).toThrow();
    const fresh = new URL(trackerScrapeUrl("abyss", "diamond", 123));
    expect(fresh.searchParams.get("aa_stats_refresh")).toBe("123");
    expect(trackerScrapeUrl("abyss", "diamond", 123)).not.toBe(
      trackerScrapeUrl("abyss", "diamond", 124),
    );
    fresh.searchParams.delete("aa_stats_refresh");
    expect(fresh.toString()).toBe(trackerUrl("abyss", "diamond"));
    const result = {
      mapSlug: "abyss",
      division: "diamond",
      status: "ready",
      lastCheckedAt: 1,
      snapshot: {
        mapSlug: "abyss",
        division: "diamond",
        region: "eu",
        playlist: "competitive",
        windowDays: 14,
        fetchedAt: 1,
        sourceUrl: trackerUrl("abyss", "diamond"),
        agents: parseTrackerStats(html(diamond), "abyss", "diamond"),
      },
    };
    expect(isMapAgentStats(result)).toBe(true);
    expect(isMapAgentStats({ ...result, division: "gold" })).toBe(false);
    expect(
      isMapAgentStats({
        ...result,
        snapshot: { ...result.snapshot, sourceUrl: "https://example.com" },
      }),
    ).toBe(false);
  });
});
