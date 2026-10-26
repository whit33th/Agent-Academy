export type AimMode = "flicks" | "moving" | "tracking";
export type AimDifficulty = "easy" | "medium" | "hard" | "custom";
export interface AimSettings {
  mode: AimMode;
  difficulty: AimDifficulty;
  diameter: number;
  speed: number;
  duration: 0 | 30 | 60;
}
export const AIM_PRESETS = {
  easy: { diameter: 3, speed: 8 },
  medium: { diameter: 2, speed: 12 },
  hard: { diameter: 1, speed: 20 },
} as const;
export const AIM_LIMITS = {
  diameter: { min: 0.6, max: 6 },
  speed: { min: 0, max: 40 },
} as const;
export const DEFAULT_AIM_SETTINGS: AimSettings = {
  mode: "flicks",
  difficulty: "medium",
  diameter: 2,
  speed: 12,
  duration: 0,
};
export const AIM_SETTINGS_KEY = "agent-academy:aim:v2";
const LEGACY_KEY = "agent-academy:aim:v1";
export function clampAimSettings(value: unknown): AimSettings {
  const record =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const numeric = (key: "diameter" | "speed") => {
    const number = typeof record[key] === "number" ? record[key] : Number.NaN;
    const { min, max } = AIM_LIMITS[key];
    return (
      Math.round(
        Math.min(
          max,
          Math.max(
            min,
            Number.isFinite(number) ? number : DEFAULT_AIM_SETTINGS[key],
          ),
        ) * 10,
      ) / 10
    );
  };
  const diameter = numeric("diameter"),
    speed = numeric("speed");
  const difficulty =
    record.difficulty === "easy" ||
    record.difficulty === "medium" ||
    record.difficulty === "hard"
      ? record.difficulty
      : "custom";
  const preset = difficulty === "custom" ? null : AIM_PRESETS[difficulty];
  return {
    mode:
      record.mode === "moving" || record.mode === "tracking"
        ? record.mode
        : "flicks",
    difficulty:
      preset && preset.diameter === diameter && preset.speed === speed
        ? difficulty
        : "custom",
    diameter,
    speed,
    duration:
      record.duration === 30 || record.duration === 60 ? record.duration : 0,
  };
}
export function loadAimSettings(): AimSettings {
  try {
    const saved = localStorage.getItem(AIM_SETTINGS_KEY),
      legacy = localStorage.getItem(LEGACY_KEY);
    const next = saved
      ? clampAimSettings(JSON.parse(saved))
      : legacy
        ? clampAimSettings(JSON.parse(legacy))
        : { ...DEFAULT_AIM_SETTINGS };
    saveAimSettings(next);
    localStorage.removeItem(LEGACY_KEY);
    return next;
  } catch {
    return { ...DEFAULT_AIM_SETTINGS };
  }
}
export function saveAimSettings(settings: AimSettings) {
  try {
    localStorage.setItem(
      AIM_SETTINGS_KEY,
      JSON.stringify(clampAimSettings(settings)),
    );
  } catch {
    /* Keep training usable without storage. */
  }
}
