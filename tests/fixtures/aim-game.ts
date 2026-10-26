import raw from "./valorant-crosshair.json";
import { parseValorantCrosshair } from "../../lib/aim/crosshair";

export function crosshairIni(data: unknown = raw) {
  return `EAresStringSettingName::SavedCrosshairProfileData=${JSON.stringify(JSON.stringify(data))}\r\n`;
}
export const importedCrosshair = parseValorantCrosshair(crosshairIni())!;
export const crosshairData = () => structuredClone(raw);
