import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
const publish = args.includes("--publish");
const refreshDescription = args.includes("--refresh-description");
const refreshReview = args.includes("--refresh-review") || refreshDescription;
if (refreshReview && !publish)
  throw new Error("Refreshing stored provenance requires --publish.");
const filename = args.find((arg) => !arg.startsWith("--"));
if (!filename)
  throw new Error(
    "Usage: node scripts/import-public-lineups.mjs <reviewed-manifest.json> [--publish]",
  );
const envText = await readFile(path.join(root, ".env.local"), "utf8");
const configuredDeployment =
  process.env.CONVEX_DEPLOYMENT ??
  /^CONVEX_DEPLOYMENT=([^\s#]+)/m.exec(envText)?.[1];
if (
  configuredDeployment !== "dev:scrupulous-barracuda-795" ||
  process.env.CONVEX_DEPLOY_KEY
)
  throw new Error(
    "This importer is restricted to dev:scrupulous-barracuda-795 without a deploy-key override.",
  );

const manifest = JSON.parse(await readFile(path.resolve(filename), "utf8"));
if (
  !/^[a-zA-Z0-9_-]{1,100}$/.test(manifest.batchId) ||
  !Array.isArray(manifest.records) ||
  manifest.records.length > 500
)
  throw new Error("Manifest needs batchId and at most 500 reviewed records");
const records = manifest.records.map((record) => ({
  ...record,
  contentHash: createHash("sha256")
    .update(
      JSON.stringify({
        map: record.mapSlug,
        agent: record.agentSlug,
        metadata: record.metadata,
        // Chapter positions distinguish genuinely different setups in one guide.
        video: record.videoUrl ?? "",
        description: record.description
          ?.trim()
          .replace(/\s+/g, " ")
          .toLowerCase(),
      }),
    )
    .digest("hex"),
}));

async function convex(name, input) {
  const output = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        path.join(root, "node_modules/convex/bin/main.js"),
        "run",
        name,
        JSON.stringify(input),
      ],
      {
        cwd: root,
        env: { ...process.env, CONVEX_DEPLOYMENT: configuredDeployment },
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve(stdout)
        : reject(new Error(`Convex ${name} failed: ${stderr.slice(-2000)}`)),
    );
  });
  return JSON.parse(output);
}

console.log(
  `target: dev (scrupulous-barracuda-795); ${publish ? "publish reviewed batch" : "preview only"}`,
);
const report = {
  batchId: manifest.batchId,
  target: configuredDeployment,
  mode: publish ? "publish" : "preview",
  at: new Date().toISOString(),
  results: [],
};
const outputDirectory = path.join(root, "outputs/lineup-import");
await mkdir(outputDirectory, { recursive: true });
const outputFile = path.join(
  outputDirectory,
  `${manifest.batchId}-${publish ? "publish" : "preview"}.json`,
);
for (let offset = 0; offset < records.length;) {
  const batch = [];
  let argumentSize = 0;
  while (offset + batch.length < records.length && batch.length < 20) {
    const record = records[offset + batch.length];
    const size = JSON.stringify(record).length;
    if (size > 12000)
      throw new Error(
        "A candidate is too large for the operator CLI; shorten its evidence and instructions.",
      );
    if (batch.length && argumentSize + size > 12000) break;
    batch.push(record);
    argumentSize += size;
  }
  // Preview the complete pilot before the first write. No retry loop on provider/auth/quota failures.
  const reviewed = await convex("lineupImport:preview", { records: batch });
  const readyKeys = new Set(
    reviewed
      .filter((row) => row.status === "ready")
      .map((row) => row.sourceKey),
  );
  const accepted = batch.filter((row) => readyKeys.has(row.sourceKey));
  const written =
    publish && accepted.length
      ? await convex("lineupImport:publish", {
          batchId: manifest.batchId,
          records: accepted,
        })
      : [];
  if (refreshReview) {
    const permittedKeys = new Set(
      reviewed
        .filter((row) => row.status !== "rejected")
        .map((row) => row.sourceKey),
    );
    const reviewRecords = batch.filter((row) =>
      permittedKeys.has(row.sourceKey),
    );
    if (reviewRecords.length) {
      const refreshed = await convex("lineupImport:refreshReviews", {
        records: reviewRecords,
        ...(refreshDescription ? { refreshDescription: true } : {}),
      });
      report.refreshedReviews =
        (report.refreshedReviews ?? 0) + refreshed.updated;
    }
  }
  report.results.push(
    ...reviewed.map((row) => ({
      ...row,
      published: written.some(
        (value) =>
          value.sourceKey === row.sourceKey && value.status === "ready",
      ),
    })),
  );
  await writeFile(outputFile, JSON.stringify(report, null, 2) + "\n");
  console.log(
    `Reviewed ${offset + batch.length}/${records.length}; ${accepted.length} eligible in this batch`,
  );
  offset += batch.length;
}
report.summary = await convex("lineupImport:batchStatus", {
  batchId: manifest.batchId,
});
await writeFile(outputFile, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report.summary, null, 2));
console.log(`Report: ${outputFile}`);
