import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.cron(
  "Refresh EU agent statistics",
  "0 3 * * *",
  internal.agentStatsSync.enqueueDaily,
  {},
);
crons.interval(
  "Reconcile agent statistics scrape",
  { minutes: 1 },
  internal.agentStatsSync.tick,
  {},
);
export default crons;
