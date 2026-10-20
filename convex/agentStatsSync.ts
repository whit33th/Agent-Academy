import { FirecrawlScrape } from "convex-firecrawl-scrape";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import {
  env,
  internalAction,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  DAY,
  DIVISIONS,
  RETRY_DELAYS,
  STATS_MAPS,
  trackerUrl,
  trackerScrapeUrl,
  isStatsDivision,
  isAgentStat,
  hasCompletePlayedShare,
  sortAgentStats,
} from "../lib/agent-stats/model";
import { parseTrackerStats } from "../lib/agent-stats/parser";
import catalog from "../lib/generated/valorant-catalog.json";
import { agentStat } from "./lib/agentStatsValidators";

const client = () =>
  new FirecrawlScrape(components.firecrawlScrape, {
    FIRECRAWL_API_KEY: env.FIRECRAWL_API_KEY,
    defaultTtlMs: DAY,
  });
const syncState = (ctx: MutationCtx) =>
  ctx.db
    .query("agentStatSync")
    .withIndex("by_key", (q) => q.eq("key", "tracker"))
    .unique();

async function fail(
  ctx: MutationCtx,
  target: Doc<"agentStatTargets">,
  kind: string,
  message: string,
) {
  const now = Date.now();
  await ctx.db.insert("agentStatErrors", {
    mapSlug: target.mapSlug,
    division: target.division,
    at: now,
    // Never persist provider response bodies: they may contain reflected credentials or full HTML.
    kind,
    message: message.slice(0, 240),
  });
  const failures = target.failures + 1;
  const delay = RETRY_DELAYS[failures - 1];
  await ctx.db.patch(target._id, {
    stage: delay === undefined ? "failed" : "queued",
    failures,
    nextAttemptAt: now + (delay ?? DAY),
    jobId: undefined,
    jobStartedAt: undefined,
    readLeaseUntil: undefined,
  });
  const control = await syncState(ctx);
  if (!control) return;
  if (kind === "credentials" || kind === "credits") {
    await ctx.db.patch(control._id, { disabledReason: kind });
  } else {
    const consecutiveBlocks =
      kind === "blocked" ? control.consecutiveBlocks + 1 : 0;
    await ctx.db.patch(control._id, {
      consecutiveBlocks,
      ...(consecutiveBlocks >= 3
        ? { pausedUntil: now + 6 * 60 * 60_000, consecutiveBlocks: 0 }
        : {}),
    });
  }
}

export const enqueueDaily = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const day = Math.floor(now / DAY);
    if (!(await syncState(ctx)))
      await ctx.db.insert("agentStatSync", {
        key: "tracker",
        consecutiveBlocks: 0,
        pausedUntil: 0,
      });
    for (const mapSlug of STATS_MAPS)
      for (const division of DIVISIONS) {
        const target = await ctx.db
          .query("agentStatTargets")
          .withIndex("by_mapSlug_and_division", (q) =>
            q.eq("mapSlug", mapSlug).eq("division", division),
          )
          .unique();
        if (!target) {
          await ctx.db.insert("agentStatTargets", {
            mapSlug,
            division,
            requestedDay: day,
            stage: "queued",
            nextAttemptAt: now,
            failures: 0,
            resultState: "pending",
          });
        } else if (
          target.requestedDay < day &&
          (target.stage === "idle" || target.stage === "failed")
        ) {
          await ctx.db.patch(target._id, {
            requestedDay: day,
            stage: "queued",
            nextAttemptAt: now,
            failures: 0,
          });
        }
      }
    // Retention is independent of scraper health and runs even while collection is disabled.
    await ctx.scheduler.runAfter(0, internal.agentStatsSync.cleanupErrors, {});
    return null;
  },
});

export const cleanupErrors = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const old = await ctx.db
      .query("agentStatErrors")
      .withIndex("by_at", (q) => q.lt("at", Date.now() - 30 * DAY))
      .take(100);
    for (const entry of old) await ctx.db.delete(entry._id);
    if (old.length === 100)
      await ctx.scheduler.runAfter(
        0,
        internal.agentStatsSync.cleanupErrors,
        {},
      );
    return null;
  },
});

export const tick = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const control = await syncState(ctx);
    if (!control || control.disabledReason || control.pausedUntil > Date.now())
      return null;
    // One app-owned scrape slot, held until the component reaches a terminal state.
    // This transaction also starts the component job, so concurrent ticks cannot overlap.
    const active =
      (await ctx.db
        .query("agentStatTargets")
        .withIndex("by_stage_and_nextAttemptAt", (q) =>
          q.eq("stage", "scraping"),
        )
        .first()) ??
      (await ctx.db
        .query("agentStatTargets")
        .withIndex("by_stage_and_nextAttemptAt", (q) =>
          q.eq("stage", "reading"),
        )
        .first());
    if (active?.jobId) {
      const status = await client().getStatus(ctx, active.jobId);
      if (!status) {
        await fail(
          ctx,
          active,
          "missing_job",
          "Scrape record disappeared before ingestion",
        );
      } else if (status.status === "failed") {
        const code = String(status.errorCode ?? "");
        const detail = status.error ?? "";
        const kind =
          code === "402" || /credits|billing|payment/i.test(detail)
            ? "credits"
            : code === "401" || /invalid.*api.?key|unauthorized/i.test(detail)
              ? "credentials"
              : code === "403" ||
                  code === "429" ||
                  /rate limit|blocked|forbidden/i.test(detail)
                ? "blocked"
                : "provider";
        await fail(
          ctx,
          active,
          kind,
          `Firecrawl scrape failed (${code || "unknown status"})`,
        );
      } else if (status.status === "completed") {
        if (
          active.stage !== "reading" ||
          (active.readLeaseUntil ?? 0) <= Date.now()
        ) {
          await ctx.db.patch(active._id, {
            stage: "reading",
            readLeaseUntil: Date.now() + 90_000,
          });
          await ctx.scheduler.runAfter(0, internal.agentStatsSync.ingest, {
            targetId: active._id,
            jobId: active.jobId,
          });
        }
      } else if (
        (active.jobStartedAt ?? Date.now()) + 15 * 60_000 <
        Date.now()
      ) {
        // Do not release a still-running component job and accidentally start a second request.
        await ctx.db.patch(control._id, {
          pausedUntil: Date.now() + 6 * 60 * 60_000,
        });
        await ctx.db.insert("agentStatErrors", {
          mapSlug: active.mapSlug,
          division: active.division,
          at: Date.now(),
          kind: "stuck_job",
          message:
            "Component job has not reached a terminal state in 15 minutes; collection paused",
        });
      }
      return null;
    }
    const next = await ctx.db
      .query("agentStatTargets")
      .withIndex("by_stage_and_nextAttemptAt", (q) =>
        q.eq("stage", "queued").lte("nextAttemptAt", Date.now()),
      )
      .first();
    if (!next) return null;
    if (!env.FIRECRAWL_API_KEY) {
      await fail(
        ctx,
        next,
        "credentials",
        "FIRECRAWL_API_KEY is missing in this Convex deployment",
      );
      return null;
    }
    const { jobId } = await client().scrape(
      ctx,
      trackerScrapeUrl(next.mapSlug, next.division, Date.now()),
      {
        formats: ["rawHtml"],
        proxy: "auto",
        force: true,
        ttlMs: DAY,
        onlyMainContent: false,
      },
    );
    await ctx.db.patch(next._id, {
      jobId,
      stage: "scraping",
      jobStartedAt: Date.now(),
    });
    return null;
  },
});

export const getIngestion = internalQuery({
  args: { targetId: v.id("agentStatTargets"), jobId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      mapSlug: v.string(),
      division: v.string(),
      rawHtml: v.optional(v.string()),
      rawHtmlFileUrl: v.optional(v.union(v.string(), v.null())),
      statusCode: v.optional(v.number()),
      fetchedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.targetId);
    if (!target || target.jobId !== args.jobId || target.stage !== "reading")
      return null;
    const content = await ctx.runQuery(
      components.firecrawlScrape.lib.getContent,
      { id: args.jobId },
    );
    if (!content || content.status !== "completed") return null;
    return {
      mapSlug: target.mapSlug,
      division: target.division,
      rawHtml: content.rawHtml,
      rawHtmlFileUrl: content.rawHtmlFileUrl,
      statusCode: content.metadata?.statusCode,
      fetchedAt: content.scrapedAt ?? content.startedAt,
    };
  },
});

export const ingest = internalAction({
  args: { targetId: v.id("agentStatTargets"), jobId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const data = await ctx.runQuery(
        internal.agentStatsSync.getIngestion,
        args,
      );
      if (!data) return null;
      if (data.statusCode && data.statusCode >= 400) {
        await ctx.runMutation(internal.agentStatsSync.recordFailure, {
          ...args,
          kind:
            data.statusCode === 403 || data.statusCode === 429
              ? "blocked"
              : "provider",
          message: `Tracker returned HTTP ${data.statusCode}`,
        });
        return null;
      }
      let html = data.rawHtml;
      if (!html && data.rawHtmlFileUrl) {
        // URL is issued by component storage, never accepted from a client or scraped HTML.
        const response = await fetch(data.rawHtmlFileUrl, {
          signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) throw new Error("Tracker: stored HTML unavailable");
        if (Number(response.headers.get("content-length")) > 8_000_000)
          throw new Error("Tracker: response too large");
        html = await response.text();
      }
      if (!html) throw new Error("Tracker: raw HTML missing");
      if (!isStatsDivision(data.division))
        throw new Error("Tracker: invalid target division");
      const agents = parseTrackerStats(html, data.mapSlug, data.division);
      await ctx.runMutation(internal.agentStatsSync.publish, {
        ...args,
        agents,
        fetchedAt: data.fetchedAt,
      });
    } catch (error) {
      // Parser messages are authored locally; provider/fetch errors are deliberately not persisted verbatim.
      const message =
        error instanceof Error && error.message.startsWith("Tracker:")
          ? error.message
          : "Could not ingest scraped statistics";
      await ctx.runMutation(internal.agentStatsSync.recordFailure, {
        ...args,
        kind: message === "Tracker: blocked page" ? "blocked" : "validation",
        message,
      });
    }
    return null;
  },
});

export const publish = internalMutation({
  args: {
    targetId: v.id("agentStatTargets"),
    jobId: v.string(),
    fetchedAt: v.number(),
    agents: v.array(agentStat),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.targetId);
    if (!target || target.stage !== "reading" || target.jobId !== args.jobId)
      return null;
    if (
      !Number.isFinite(args.fetchedAt) ||
      args.fetchedAt > Date.now() + 60_000 ||
      !args.agents.every(isAgentStat) ||
      (args.agents.length > 0 &&
        (!hasCompletePlayedShare(args.agents) ||
          new Set(args.agents.map((a) => a.agentSlug)).size !==
            args.agents.length ||
          args.agents.some((a) => !Object.hasOwn(catalog.agents, a.agentSlug))))
    )
      throw new Error("Invalid statistics snapshot");
    const current = args.agents.length
      ? {
          mapSlug: target.mapSlug,
          division: target.division,
          region: "eu" as const,
          playlist: "competitive" as const,
          windowDays: 14 as const,
          fetchedAt: args.fetchedAt,
          sourceUrl: trackerUrl(target.mapSlug, target.division),
          agents: sortAgentStats(args.agents),
        }
      : undefined;
    await ctx.db.patch(target._id, {
      stage: "idle",
      completedDay: target.requestedDay,
      lastCheckedAt: Date.now(),
      resultState: current ? "ready" : "no_data",
      failures: 0,
      ...(current ? { current, previous: target.current } : {}),
      jobId: undefined,
      jobStartedAt: undefined,
      readLeaseUntil: undefined,
    });
    const control = await syncState(ctx);
    if (control) await ctx.db.patch(control._id, { consecutiveBlocks: 0 });
    return null;
  },
});

export const recordFailure = internalMutation({
  args: {
    targetId: v.id("agentStatTargets"),
    jobId: v.string(),
    kind: v.string(),
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.targetId);
    if (target?.jobId === args.jobId && target.stage === "reading")
      await fail(ctx, target, args.kind, args.message);
    return null;
  },
});

// Operator-only recovery after configuring a valid key / replenishing credits.
export const resume = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    if (!env.FIRECRAWL_API_KEY)
      throw new Error("Configure FIRECRAWL_API_KEY before resuming");
    const control = await syncState(ctx);
    if (control)
      await ctx.db.patch(control._id, {
        disabledReason: undefined,
        pausedUntil: 0,
        consecutiveBlocks: 0,
      });
    return null;
  },
});

export const health = internalQuery({
  args: {},
  returns: v.object({
    total: v.number(),
    ready: v.number(),
    noData: v.number(),
    stages: v.record(v.string(), v.number()),
    disabledReason: v.union(v.string(), v.null()),
    pausedUntil: v.number(),
    lastErrors: v.array(
      v.object({
        mapSlug: v.string(),
        division: v.string(),
        kind: v.string(),
        message: v.string(),
        at: v.number(),
      }),
    ),
  }),
  handler: async (ctx) => {
    const targets = await ctx.db
      .query("agentStatTargets")
      .withIndex("by_stage_and_nextAttemptAt")
      .take(200);
    const control = await ctx.db
      .query("agentStatSync")
      .withIndex("by_key", (q) => q.eq("key", "tracker"))
      .unique();
    const errors = await ctx.db
      .query("agentStatErrors")
      .withIndex("by_at")
      .order("desc")
      .take(10);
    const stages: Record<string, number> = {};
    for (const t of targets) stages[t.stage] = (stages[t.stage] ?? 0) + 1;
    return {
      total: targets.length,
      ready: targets.filter((t) => t.resultState === "ready").length,
      noData: targets.filter((t) => t.resultState === "no_data").length,
      stages,
      disabledReason: control?.disabledReason ?? null,
      pausedUntil: control?.pausedUntil ?? 0,
      lastErrors: errors.map(({ mapSlug, division, kind, message, at }) => ({
        mapSlug,
        division,
        kind,
        message,
        at,
      })),
    };
  },
});
