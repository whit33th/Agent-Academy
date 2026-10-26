export const DEFAULT_AIM_BACKGROUND = "#737373";
const BACKGROUND_KEY = "agent-academy:aim:background:v1";

function validColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

export function loadAimBackground(): string {
  try {
    const saved = localStorage.getItem(BACKGROUND_KEY);
    return validColor(saved) ? saved.toLowerCase() : DEFAULT_AIM_BACKGROUND;
  } catch {
    return DEFAULT_AIM_BACKGROUND;
  }
}

export function saveAimBackground(color: string) {
  if (!validColor(color)) return;
  try {
    localStorage.setItem(BACKGROUND_KEY, color.toLowerCase());
  } catch {
    /* Color changes remain usable when storage is unavailable. */
  }
}
