import { app } from "electron";
import { NsisUpdater } from "electron-updater";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createUpdateController } from "../desktop/src/update-controller";

async function main() {
  const output = path.resolve("outputs/update-qa");
  await mkdir(output, { recursive: true });
  const profile = await mkdtemp(path.join(output, "profile-"));
  app.setPath("userData", profile);
  app.getVersion = () => "0.7.1";
  await app.whenReady();
  const evidence: Record<string, unknown> = {};
  const config = path.join(profile, "app-update.yml");
  await writeFile(config, "updaterCacheDirName: updater\n");

  class UpdateQaDriver extends NsisUpdater {
    get testApp() {
      return this.app;
    }
  }
  function setup(
    feed: NonNullable<ConstructorParameters<typeof NsisUpdater>[0]>,
    version = "0.7.1",
  ) {
    app.getVersion = () => version;
    const driver = new UpdateQaDriver(feed);
    driver.forceDevUpdateConfig = true;
    driver.updateConfigPath = config;
    driver.setFeedURL(feed);
    // Give each case its own download cache without touching the installed app.
    Object.defineProperty(driver.testApp, "baseCachePath", {
      value: path.join(profile, version),
    });
    driver.autoDownload = false;
    driver.autoInstallOnAppQuit = false;
    driver.allowPrerelease = false;
    driver.allowDowngrade = false;
    driver.disableWebInstaller = true;
    const failures: string[] = [];
    const controller = createUpdateController(
      driver,
      version,
      () => {},
      (error) => {
        if (error && typeof error === "object" && "code" in error)
          failures.push(String(error.code));
      },
    );
    return { driver, controller, failures };
  }

  try {
    const installer = Buffer.from("Local updater fixture; never executable.");
    const digest = createHash("sha512").update(installer).digest("base64");
    let broken = true;
    let corrupt = true;
    let requestedBlockmap = false;
    const server = createServer((request, response) => {
      if (request.url?.split("?")[0] === "/latest.yml") {
        response.end(
          broken
            ? "invalid: ["
            : `version: 0.7.3\nfiles:\n  - url: setup.exe\n    sha512: ${digest}\n    size: ${installer.length}\npath: setup.exe\nsha512: ${digest}\n`,
        );
      } else if (request.url?.split("?")[0] === "/setup.exe") {
        response.end(corrupt ? Buffer.alloc(installer.length) : installer);
      } else {
        requestedBlockmap = true;
        response.writeHead(404).end();
      }
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    try {
      const address = server.address();
      assert(address && typeof address !== "string");
      const feed = {
        provider: "generic" as const,
        url: `http://127.0.0.1:${address.port}`,
      };
      const { driver, controller, failures } = setup(feed);
      await controller.check();
      assert.equal(controller.get().status, "error");
      assert.match(controller.get().message!, /invalid update information/);
      broken = false;
      await controller.check();
      assert.equal(controller.get().status, "available");
      await controller.download();
      assert.equal(controller.get().status, "error");
      assert.match(controller.get().message!, /file verification/);
      corrupt = false;
      await controller.check();
      await controller.download();
      assert.equal(controller.get().status, "downloaded");
      assert(
        requestedBlockmap,
        "Missing blockmaps must exercise the full-download fallback",
      );
      const calls: { command: string; args: string[] }[] = [];
      // Exercise the real NSIS install handoff, while preventing a fixture from executing.
      Object.assign(driver, {
        spawnLog: async (command: string, args: string[]) => {
          calls.push({ command, args });
          return true;
        },
      });
      let quit = false;
      driver.testApp.quit = () => {
        quit = true;
      };
      controller.install();
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(controller.get().status, "installing");
      assert.equal(calls.length, 1);
      assert.deepEqual(calls[0].args, ["--updated", "/S", "--force-run"]);
      assert(quit, "Explicit installation must quit the old process");
      const current = setup(feed, "0.7.3");
      await current.controller.check();
      assert.equal(current.controller.get().status, "current");
      evidence.local = {
        malformedMetadataRetry: true,
        checksumFailureRetry: true,
        missingBlockmapFallback: true,
        downloaded: true,
        explicitInstallHandoff: true,
        quitRequested: quit,
        currentVersionCheck: true,
        failures,
        installerExecuted: false,
      };
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
    if (process.argv.includes("--live")) {
      const { controller } = setup(
        { provider: "github", owner: "whit33th", repo: "Agent-Academy" },
        "0.7.1",
      );
      await controller.check();
      assert.equal(controller.get().status, "available");
      const availableVersion = controller.get().availableVersion;
      await controller.download();
      assert.equal(controller.get().status, "downloaded");
      const same = setup(
        { provider: "github", owner: "whit33th", repo: "Agent-Academy" },
        availableVersion!,
      );
      await same.controller.check();
      assert.equal(same.controller.get().status, "current");
      evidence.live = {
        from: "0.7.1",
        availableVersion,
        checksumVerifiedDownload: true,
        currentVersionCheck: true,
        installed: false,
      };
    }
    await writeFile(
      path.join(output, "result.json"),
      JSON.stringify(evidence, null, 2),
    );
    console.log(JSON.stringify(evidence, null, 2));
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
}

void main();
