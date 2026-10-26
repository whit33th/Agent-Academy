import { FirecrawlScrape } from "convex-firecrawl-scrape";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { env, internalMutation, internalQuery } from "./_generated/server";
import { isSafeSourceUrl } from "../lib/lineups/media";

const allowedHosts = new Set([
  "lineupsvalorant.com",
  "www.lineupsvalorant.com",
  "valoplant.gg",
  "www.valoplant.gg",
  "tracker.gg",
  "www.youtube.com",
  "playvalorant.com",
  "wiki.playvalorant.com",
]);
const client = () =>
  new FirecrawlScrape(components.firecrawlScrape, {
    FIRECRAWL_API_KEY: env.FIRECRAWL_API_KEY,
    defaultTtlMs: 60 * 60 * 1000,
  });

// Operator-only. Discovery never directly publishes extracted or generated content.
export const start = internalMutation({
  args: { url: v.string() },
  returns: v.object({ jobId: v.string() }),
  handler: async (ctx, args) => {
    if (
      !isSafeSourceUrl(args.url) ||
      !allowedHosts.has(new URL(args.url).hostname)
    )
      throw new Error("Source is not approved for discovery");
    if (!env.FIRECRAWL_API_KEY)
      throw new Error("Firecrawl is not configured on this deployment");
    const { jobId } = await client().scrape(ctx, args.url, {
      formats: ["markdown", "links", "images"],
      onlyMainContent: true,
      force: true,
      ttlMs: 60 * 60 * 1000,
      waitFor: 2000,
    });
    return { jobId };
  },
});

export const read = internalQuery({
  args: { jobId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      status: v.string(),
      markdown: v.optional(v.string()),
      markdownFileUrl: v.optional(v.union(v.string(), v.null())),
      links: v.optional(v.array(v.string())),
      images: v.optional(v.array(v.string())),
      error: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const content = await ctx.runQuery(
      components.firecrawlScrape.lib.getContent,
      { id: args.jobId },
    );
    if (!content) return null;
    return {
      status: content.status,
      markdown: content.markdown,
      markdownFileUrl: content.markdownFileUrl,
      links: content.links,
      images: content.images,
      // Do not expose reflected provider bodies, credentials or scraped error pages.
      error:
        content.status === "failed"
          ? "Scrape failed; stop on credit or credential errors and inspect provider status"
          : undefined,
    };
  },
});
