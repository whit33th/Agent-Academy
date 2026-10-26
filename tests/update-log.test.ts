import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { createUpdateLog } from "../desktop/src/update-log";

it("retains the failure code and phase without saving URL credentials or access tokens", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "academy-updates-"));
  try {
    const log = createUpdateLog(directory);
    log.write(
      "error",
      { status: "downloading", currentVersion: "0.7.1" },
      Object.assign(
        new Error(
          "Failed https://user:secret@example.com/setup.exe?token=private#secret\nAuthorization: Bearer private-value",
        ),
        { code: "ERR_CHECKSUM_MISMATCH" },
      ),
    );
    await log.flush();
    const contents = await readFile(
      path.join(directory, "updates.log"),
      "utf8",
    );
    expect(JSON.parse(contents)).toMatchObject({
      event: "error",
      code: "ERR_CHECKSUM_MISMATCH",
      status: "downloading",
      currentVersion: "0.7.1",
    });
    expect(contents).toContain("https://example.com/setup.exe");
    expect(contents).not.toMatch(/secret|private|Bearer/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("rotates bounded logs and serializes writes", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "academy-updates-"));
  try {
    const log = createUpdateLog(directory, 180);
    for (let index = 0; index < 8; index++) log.write("state", { index });
    await log.flush();
    const latest = await readFile(path.join(directory, "updates.log"), "utf8");
    const previous = await readFile(
      path.join(directory, "updates.log.1"),
      "utf8",
    );
    expect(latest.length).toBeLessThanOrEqual(180);
    expect(JSON.parse(latest.trim().split("\n").at(-1)!)).toMatchObject({
      index: 7,
    });
    expect(previous.length).toBeLessThanOrEqual(180);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
