import type { ValorantCrosshair } from "./crosshair";

export type ValorantAimSettings =
  | {
      status: "ready";
      sensitivity: number;
      profileKey: string;
      modifiedAt: string;
      crosshair: ValorantCrosshair;
    }
  | {
      status: "missing" | "ambiguous" | "invalid" | "unsupported";
      message: string;
    };

/** Read only the exact hipfire setting; ADS and zoom have separate meanings. */
export function parseValorantSensitivity(ini: string): number | null {
  const values = [
    ...ini.matchAll(
      /^\s*EAresFloatSettingName::MouseSensitivity\s*=\s*([^\r\n;]+)\s*$/gm,
    ),
  ].map((match) => Number(match[1].trim()));
  if (
    values.length === 0 ||
    values.some((value) => !Number.isFinite(value) || value <= 0 || value > 100)
  )
    return null;
  return values.every((value) => value === values[0]) ? values[0] : null;
}

export function parseLastKnownUser(ini: string): string | null {
  const values = [
    ...ini.matchAll(/^\s*LastKnownUser\s*=\s*([^\r\n]+)\s*$/gm),
  ].map((match) => match[1].trim().toLowerCase());
  const first = values[0];
  return first &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
      first,
    ) &&
    values.every((value) => value === first)
    ? first
    : null;
}
