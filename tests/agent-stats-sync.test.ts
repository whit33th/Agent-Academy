import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import componentSchema from "../node_modules/convex-firecrawl-scrape/src/component/schema";
import { api, internal } from "../convex/_generated/api";
import diamond from "./fixtures/agent-stats/abyss-diamond.json";
import allRanks from "./fixtures/agent-stats/abyss-all.json";
import { parseTrackerStats } from "../lib/agent-stats/parser";
import { DAY, RETRY_DELAYS } from "../lib/agent-stats/model";

const modules = import.meta.glob("../convex/**/*.ts");
const componentModules = import.meta.glob(
  "../node_modules/convex-firecrawl-scrape/src/component/**/*.ts",
);
const html = `<script>window.__INITIAL_STATE__ = ${JSON.stringify(diamond)}</script>`;
const agents = parseTrackerStats(html, "abyss", "diamond");
function setup() {
  const t = convexTest(schema, modules);
  t.registerComponent("firecrawlScrape", componentSchema, componentModules);
  return t;
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("FIRECRAWL_API_KEY", "fc-test-key");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("statistics ingestion durability", () => {
  it("runs the component to ingestion, holds one scrape slot and recovers an expired ingestion lease", async () => {
    const t = setup();
    const fetch = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => {
        void _input;
        void _init;
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              rawHtml: `<script>window.__INITIAL_STATE__ = ${JSON.stringify(allRanks)}</script>`,
              metadata: { statusCode: 200 },
            },
          }),
          { status: 200 },
        );
      },
    );
    vi.stubGlobal("fetch", fetch);
    await t.mutation(internal.agentStatsSync.enqueueDaily, {});
    await t.mutation(internal.agentStatsSync.tick, {});
    await t.mutation(internal.agentStatsSync.tick, {});
    expect(
      (await t.query(internal.agentStatsSync.health, {})).stages.scraping,
    ).toBe(1);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetch.mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      formats: ["rawHtml"],
      proxy: "auto",
      onlyMainContent: false,
    });
    const requested = new URL(body.url);
    expect(requested.searchParams.get("aa_stats_refresh")).toBe(
      String(Date.now()),
    );
    requested.searchParams.delete("aa_stats_refresh");
    expect(requested.toString()).toBe(
      "https://tracker.gg/valorant/insights/agents?playlist=competitive&map=abyss&region=eu",
    );
    await t.mutation(internal.agentStatsSync.tick, {});
    await t.run(async (ctx) => {
      const target = await ctx.db
        .query("agentStatTargets")
        .withIndex("by_stage_and_nextAttemptAt", (q) =>
          q.eq("stage", "reading"),
        )
        .first();
      await ctx.db.patch(target!._id, { readLeaseUntil: Date.now() - 1 });
    });
    await t.mutation(internal.agentStatsSync.tick, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const result = await t.query(api.agentStats.getByMap, {
      mapSlug: "abyss",
      division: "all",
    });
    expect(result.status).toBe("ready");
    expect(result.snapshot?.agents).toHaveLength(29);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((await t.query(internal.agentStatsSync.health, {})).ready).toBe(1);
  });

  it("stops paid work on credit errors and requires operator recovery", async () => {
    const t = setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "Insufficient credits" }), {
            status: 402,
          }),
      ),
    );
    await t.mutation(internal.agentStatsSync.enqueueDaily, {});
    await t.mutation(internal.agentStatsSync.tick, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    await t.mutation(internal.agentStatsSync.tick, {});
    expect(
      (await t.query(internal.agentStatsSync.health, {})).disabledReason,
    ).toBe("credits");
    await t.mutation(internal.agentStatsSync.tick, {});
    expect(fetch).toHaveBeenCalledTimes(1);
    await t.mutation(internal.agentStatsSync.resume, {});
    expect(
      (await t.query(internal.agentStatsSync.health, {})).disabledReason,
    ).toBeNull();
  });
  it("daily enqueue is idempotent, unsupported maps are empty, no public function starts a scrape", async () => {
    const t = setup();
    await t.mutation(internal.agentStatsSync.enqueueDaily, {});
    await t.mutation(internal.agentStatsSync.enqueueDaily, {});
    expect((await t.query(internal.agentStatsSync.health, {})).total).toBe(130);
    expect(
      (
        await t.query(api.agentStats.getByMap, {
          mapSlug: "district",
          division: "all",
        })
      ).status,
    ).toBe("unsupported");
    expect(
      (
        await t.query(api.agentStats.getByMap, {
          mapSlug: "abyss",
          division: "diamond",
        })
      ).status,
    ).toBe("unavailable");
    await t.finishAllScheduledFunctions(vi.runAllTimers);
  });
  it("publishes whole snapshots once, retains the previous snapshot, rejects stale completion and invalid data", async () => {
    const t = setup();
    await t.mutation(internal.agentStatsSync.enqueueDaily, {});
    const id = await t.run(async (ctx) => {
      const target = await ctx.db
        .query("agentStatTargets")
        .withIndex("by_mapSlug_and_division", (q) =>
          q.eq("mapSlug", "abyss").eq("division", "diamond"),
        )
        .unique();
      await ctx.db.patch(target!._id, { stage: "reading", jobId: "job-1" });
      return target!._id;
    });
    const args = {
      targetId: id,
      jobId: "job-1",
      fetchedAt: Date.now(),
      agents,
    };
    await t.mutation(internal.agentStatsSync.publish, args);
    await t.mutation(internal.agentStatsSync.publish, args);
    let stored = await t.run((ctx) => ctx.db.get(id));
    expect(stored?.current?.agents).toHaveLength(29);
    expect(stored?.previous).toBeUndefined();
    await t.run((ctx) =>
      ctx.db.patch(id, { stage: "reading", jobId: "job-2" }),
    );
    await t.mutation(internal.agentStatsSync.publish, args);
    await expect(
      t.mutation(internal.agentStatsSync.publish, {
        ...args,
        jobId: "job-2",
        agents: agents.slice(1),
      }),
    ).rejects.toThrow("Invalid statistics");
    expect(
      (
        await t.query(api.agentStats.getByMap, {
          mapSlug: "abyss",
          division: "diamond",
        })
      ).snapshot?.agents,
    ).toHaveLength(29);
    await t.mutation(internal.agentStatsSync.publish, {
      ...args,
      jobId: "job-2",
      fetchedAt: args.fetchedAt + 1,
    });
    stored = await t.run((ctx) => ctx.db.get(id));
    expect(stored?.previous?.fetchedAt).toBe(args.fetchedAt);
    expect(stored?.current?.fetchedAt).toBe(args.fetchedAt + 1);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
  });
  it("bounds retries, opens the blocking circuit and never erases good statistics", async () => {
    const t = setup();
    await t.mutation(internal.agentStatsSync.enqueueDaily, {});
    const id = await t.run(async (ctx) => {
      const row = await ctx.db
        .query("agentStatTargets")
        .withIndex("by_mapSlug_and_division", (q) =>
          q.eq("mapSlug", "abyss").eq("division", "diamond"),
        )
        .unique();
      await ctx.db.patch(row!._id, { stage: "reading", jobId: "initial" });
      return row!._id;
    });
    await t.mutation(internal.agentStatsSync.publish, {
      targetId: id,
      jobId: "initial",
      fetchedAt: Date.now(),
      agents,
    });
    for (let attempt = 0; attempt < 4; attempt++) {
      await t.run((ctx) =>
        ctx.db.patch(id, { stage: "reading", jobId: `retry-${attempt}` }),
      );
      await t.mutation(internal.agentStatsSync.recordFailure, {
        targetId: id,
        jobId: `retry-${attempt}`,
        kind: "blocked",
        message: "Tracker returned HTTP 403",
      });
      const row = await t.run((ctx) => ctx.db.get(id));
      expect(row?.stage).toBe(attempt < 3 ? "queued" : "failed");
      expect(row?.nextAttemptAt).toBe(
        Date.now() + (RETRY_DELAYS[attempt] ?? DAY),
      );
      expect(row?.current?.agents).toHaveLength(29);
    }
    const health = await t.query(internal.agentStatsSync.health, {});
    expect(health.pausedUntil).toBe(Date.now() + 6 * 60 * 60_000);
    expect(health.lastErrors).toHaveLength(4);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
  });
  it("explicit empty data retains the last snapshot internally and errors are retained for 30 days", async () => {
    const t = setup();
    await t.mutation(internal.agentStatsSync.enqueueDaily, {});
    const id = await t.run(async (ctx) => {
      const row = await ctx.db
        .query("agentStatTargets")
        .withIndex("by_mapSlug_and_division", (q) =>
          q.eq("mapSlug", "abyss").eq("division", "diamond"),
        )
        .unique();
      await ctx.db.patch(row!._id, { stage: "reading", jobId: "first" });
      await ctx.db.insert("agentStatErrors", {
        mapSlug: "abyss",
        division: "diamond",
        at: Date.now() - 31 * DAY,
        kind: "old",
        message: "old error",
      });
      return row!._id;
    });
    await t.mutation(internal.agentStatsSync.publish, {
      targetId: id,
      jobId: "first",
      fetchedAt: Date.now(),
      agents,
    });
    await t.run((ctx) =>
      ctx.db.patch(id, { stage: "reading", jobId: "empty" }),
    );
    await t.mutation(internal.agentStatsSync.publish, {
      targetId: id,
      jobId: "empty",
      fetchedAt: Date.now(),
      agents: [],
    });
    expect(
      (
        await t.query(api.agentStats.getByMap, {
          mapSlug: "abyss",
          division: "diamond",
        })
      ).status,
    ).toBe("no_data");
    expect(
      (await t.run((ctx) => ctx.db.get(id)))?.current?.agents,
    ).toHaveLength(29);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(
      (await t.query(internal.agentStatsSync.health, {})).lastErrors,
    ).toHaveLength(0);
  });
});
