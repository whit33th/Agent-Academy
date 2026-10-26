import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readValorantAimSettings } from "../desktop/src/aim-settings";
import { crosshairIni, importedCrosshair } from "./fixtures/aim-game";
const user = "11111111-2222-3333-4444-555555555555";
const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aim-config-test-"));
  roots.push(root);
  await mkdir(path.join(root, "WindowsClient"));
  await writeFile(
    path.join(root, "WindowsClient", "RiotLocalMachine.ini"),
    `LastKnownUser=${user}\r\n`,
  );
  await profile(root, `${user}-eu`, 0.485000014);
  return root;
}
async function profile(root: string, name: string, sensitivity: number) {
  const dir = path.join(root, name, "Windows");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "RiotUserSettings.ini"),
    `EAresFloatSettingName::MouseSensitivity=${sensitivity}\r\n${crosshairIni()}`,
  );
}
describe("reading current VALORANT profile", () => {
  it("reads exact precision from the selected profile, ignoring other users", async () => {
    const root = await fixture();
    await profile(root, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-eu", 0.9);
    expect(await readValorantAimSettings(root)).toMatchObject({
      status: "ready",
      sensitivity: 0.485000014,
      profileKey: `${user}-eu`,
      crosshair: importedCrosshair,
    });
  });
  it("does not guess a region when the current user has multiple profiles", async () => {
    const root = await fixture();
    await profile(root, `${user}-na`, 0.9);
    expect(await readValorantAimSettings(root)).toMatchObject({
      status: "ambiguous",
    });
  });
  it("returns a usable failure when settings disappear", async () => {
    const root = await fixture();
    await rm(path.join(root, `${user}-eu`), { recursive: true });
    expect(await readValorantAimSettings(root)).toMatchObject({
      status: "missing",
    });
  });
  it("rejects unsafe or corrupted identity and never reads outside Config", async () => {
    const root = await fixture();
    await writeFile(
      path.join(root, "WindowsClient", "RiotLocalMachine.ini"),
      "LastKnownUser=../../escape",
    );
    expect(await readValorantAimSettings(root)).toMatchObject({
      status: "invalid",
    });
  });
  it("detects changed sensitivity without mutating the game file", async () => {
    const root = await fixture();
    await profile(root, `${user}-eu`, 0.123456789);
    expect(await readValorantAimSettings(root)).toMatchObject({
      status: "ready",
      sensitivity: 0.123456789,
    });
  });
  it("explains an unavailable crosshair instead of starting with a fixed default", async () => {
    const root = await fixture();
    await writeFile(
      path.join(root, `${user}-eu`, "Windows", "RiotUserSettings.ini"),
      "EAresFloatSettingName::MouseSensitivity=0.485000014",
    );
    expect(await readValorantAimSettings(root)).toMatchObject({
      status: "invalid",
      message: expect.stringContaining("crosshair"),
    });
  });
});
