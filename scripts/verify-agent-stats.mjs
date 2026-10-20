// Exercise the deployed, internal pipeline without changing its concurrency or retry policy.
// Uses the current Convex CLI deployment selection; never passes keys as process arguments.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout } from "node:timers/promises";
const exec = promisify(execFile);
const cli = "node_modules/convex/bin/main.js";
const run = async (name) => {
  const { stdout } = await exec(
    process.execPath,
    [cli, "run", `agentStatsSync:${name}`],
    {
      cwd: process.cwd(),
      windowsHide: true,
      maxBuffer: 1_000_000,
    },
  );
  return stdout.trim() ? JSON.parse(stdout) : null;
};
const deadline = Date.now() + 45 * 60_000;
let previous = "";
while (Date.now() < deadline) {
  await run("tick");
  const health = await run("health");
  const output = JSON.stringify(health);
  if (output !== previous) {
    console.log(output);
    previous = output;
  }
  if (health.disabledReason || health.pausedUntil > Date.now()) {
    throw new Error(
      "Collection paused; inspect agentStatsSync:health before retrying",
    );
  }
  if (
    !health.stages.queued &&
    !health.stages.scraping &&
    !health.stages.reading
  ) {
    if (health.stages.failed) throw new Error("Some targets exhausted retries");
    console.log(
      `PASS: ${health.ready} snapshots and ${health.noData} explicit empty results`,
    );
    process.exit(0);
  }
  await setTimeout(1000);
}
throw new Error(
  "Verification timed out; the scheduled collector will continue in Convex",
);
