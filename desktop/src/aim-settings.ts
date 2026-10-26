import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { parseValorantCrosshair } from "../../lib/aim/crosshair";
import {
  parseLastKnownUser,
  parseValorantSensitivity,
  type ValorantAimSettings,
} from "../../lib/aim/game-settings";

export async function readValorantAimSettings(
  root = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "VALORANT", "Saved", "Config")
    : "",
): Promise<ValorantAimSettings> {
  if (!root)
    return {
      status: "unsupported",
      message: "VALORANT settings can only be read in the Windows app.",
    };
  try {
    const user = parseLastKnownUser(
      await readFile(
        path.join(root, "WindowsClient", "RiotLocalMachine.ini"),
        "utf8",
      ),
    );
    if (!user)
      return {
        status: "invalid",
        message:
          "Could not identify the current profile. Open VALORANT and try again.",
      };
    const profiles = (await readdir(root, { withFileTypes: true })).filter(
      (entry) =>
        entry.isDirectory() && entry.name.toLowerCase().startsWith(`${user}-`),
    );
    if (profiles.length > 1)
      return {
        status: "ambiguous",
        message:
          "Multiple regional profiles were found for the current player. Open VALORANT with the profile you want to use.",
      };
    if (!profiles.length)
      return {
        status: "missing",
        message:
          "The current player has no saved settings yet. Open VALORANT and try again.",
      };
    const file = path.join(
      root,
      profiles[0].name,
      "Windows",
      "RiotUserSettings.ini",
    );
    const [text, metadata] = await Promise.all([
      readFile(file, "utf8"),
      stat(file),
    ]);
    const sensitivity = parseValorantSensitivity(text);
    if (sensitivity === null)
      return {
        status: "invalid",
        message:
          "The game config has no valid, unambiguous sensitivity value. Save your settings in VALORANT and try again.",
      };
    const crosshair = parseValorantCrosshair(text);
    if (!crosshair)
      return {
        status: "invalid",
        message:
          "Could not read the selected crosshair. Save your crosshair profile in VALORANT and try again.",
      };
    return {
      status: "ready",
      sensitivity,
      crosshair,
      profileKey: profiles[0].name,
      modifiedAt: metadata.mtime.toISOString(),
    };
  } catch {
    return {
      status: "missing",
      message:
        "Could not read your local VALORANT settings. Launch the game, then try again.",
    };
  }
}
