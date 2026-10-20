import { defineApp } from "convex/server";
import { v } from "convex/values";
import firecrawlScrape from "convex-firecrawl-scrape/convex.config.js";
const app = defineApp({ env: { FIRECRAWL_API_KEY: v.optional(v.string()) } });
app.use(firecrawlScrape);
export default app;
