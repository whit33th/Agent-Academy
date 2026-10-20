import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { createNativePreferences } from "../desktop/src/native-preferences";

it("persists tray behavior, validates IPC values and rolls startup back if disk saving fails", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "aa-native-preferences-"),
  );
  let startup = false;
  const system = {
    getAutoStart: () => startup,
    setAutoStart: (value: boolean) => {
      startup = value;
    },
  };
  try {
    const preferences = await createNativePreferences(directory, system);
    expect(preferences.get()).toEqual({ autoStart: false, closeToTray: true });
    await preferences.apply({ autoStart: true, closeToTray: false });
    expect((await createNativePreferences(directory, system)).get()).toEqual({
      autoStart: true,
      closeToTray: false,
    });
    await expect(
      preferences.apply({ autoStart: "true", closeToTray: true }),
    ).rejects.toThrow("Invalid");
    const file = path.join(directory, "not-a-directory");
    await writeFile(file, "fixture");
    const damaged = await createNativePreferences(file, system);
    await expect(
      damaged.apply({ autoStart: false, closeToTray: true }),
    ).rejects.toThrow();
    expect(startup).toBe(true);
  } finally {
    if (
      path.dirname(directory) !== tmpdir() ||
      !path.basename(directory).startsWith("aa-native-preferences-")
    )
      throw new Error("Unsafe test cleanup");
    await rm(directory, { recursive: true, force: true });
  }
});
