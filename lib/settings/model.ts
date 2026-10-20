export interface AppPreferences {
  musicEnabled: boolean;
  musicVolume: number;
  effectsEnabled: boolean;
  effectsVolume: number;
  voiceVolume: number;
  backgroundVideo: boolean;
  autoStart: boolean;
  closeToTray: boolean;
}
export const DEFAULT_PREFERENCES: Readonly<AppPreferences> = {
  musicEnabled: true,
  musicVolume: 0.4,
  effectsEnabled: true,
  effectsVolume: 0.4,
  voiceVolume: 0.1,
  backgroundVideo: true,
  autoStart: false,
  closeToTray: true,
};
function isVolume(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}
export function isAppPreferences(value: unknown): value is AppPreferences {
  if (!value || typeof value !== "object") return false;
  return (
    "musicEnabled" in value &&
    typeof value.musicEnabled === "boolean" &&
    "musicVolume" in value &&
    isVolume(value.musicVolume) &&
    "effectsEnabled" in value &&
    typeof value.effectsEnabled === "boolean" &&
    "effectsVolume" in value &&
    isVolume(value.effectsVolume) &&
    "voiceVolume" in value &&
    isVolume(value.voiceVolume) &&
    "backgroundVideo" in value &&
    typeof value.backgroundVideo === "boolean" &&
    "autoStart" in value &&
    typeof value.autoStart === "boolean" &&
    "closeToTray" in value &&
    typeof value.closeToTray === "boolean"
  );
}
