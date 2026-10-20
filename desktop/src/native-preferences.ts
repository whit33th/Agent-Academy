import { readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import type { NativePreferences } from "../../lib/desktop/protocol";

function isNativePreferences(value: unknown): value is NativePreferences {
  return (
    !!value &&
    typeof value === "object" &&
    "autoStart" in value &&
    typeof value.autoStart === "boolean" &&
    "closeToTray" in value &&
    typeof value.closeToTray === "boolean"
  );
}

export async function createNativePreferences(
  directory: string,
  system: { getAutoStart(): boolean; setAutoStart(value: boolean): void },
) {
  const file = path.join(directory, "native-preferences.json");
  let closeToTray = true;
  try {
    const saved: unknown = JSON.parse(await readFile(file, "utf8"));
    if (
      saved &&
      typeof saved === "object" &&
      "closeToTray" in saved &&
      typeof saved.closeToTray === "boolean"
    )
      closeToTray = saved.closeToTray;
  } catch {
    /* Missing or damaged preferences use the default tray behavior. */
  }
  const get = (): NativePreferences => ({
    autoStart: system.getAutoStart(),
    closeToTray,
  });
  let saving = false;
  return {
    get,
    async apply(value: unknown): Promise<NativePreferences> {
      if (!isNativePreferences(value))
        throw new Error("Invalid Windows settings.");
      if (saving)
        throw new Error("Windows settings are already being saved. Try again.");
      const previous = get();
      saving = true;
      try {
        if (value.autoStart !== previous.autoStart) {
          system.setAutoStart(value.autoStart);
          if (system.getAutoStart() !== value.autoStart)
            throw new Error("Windows could not change automatic startup.");
        }
        await writeFile(
          file + ".tmp",
          JSON.stringify({ closeToTray: value.closeToTray }),
        );
        await rename(file + ".tmp", file);
        closeToTray = value.closeToTray;
        return get();
      } catch (error) {
        if (system.getAutoStart() !== previous.autoStart)
          system.setAutoStart(previous.autoStart);
        throw error;
      } finally {
        saving = false;
      }
    },
  };
}
