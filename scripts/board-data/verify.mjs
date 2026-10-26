import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { verifyRelease } from "./verification.mjs";
const input = path.resolve(
  process.argv.find((arg) => arg.startsWith("--input="))?.slice(8) ??
    "outputs/board-data-research",
);
const candidate = JSON.parse(
  await readFile(path.join(input, "normalization/board-data.json"), "utf8"),
);
const evidencePath = process.argv
  .find((arg) => arg.startsWith("--verification="))
  ?.slice(15);
const evidence = evidencePath
  ? JSON.parse(await readFile(evidencePath, "utf8"))
  : null;
const failures = verifyRelease(candidate, evidence);
await writeFile(
  path.join(input, "normalization/verification-failures.json"),
  JSON.stringify(failures, null, 2),
);
console.log(
  JSON.stringify(
    {
      candidate: candidate.dataVersion,
      releasable: failures.length === 0,
      failures,
    },
    null,
    2,
  ),
);
if (failures.length) process.exitCode = 1;
