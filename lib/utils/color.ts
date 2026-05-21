/**
 * Convert a Valorant gradient color string (8-char hex with alpha) to a 6-char hex.
 */
export function toHex6(c: string): string {
  return `#${c.slice(0, 6)}`;
}

/** Pick a primary accent color from an agent's gradient list. Falls back to Valorant red. */
export function accentFromGradient(
  gradientColors: readonly string[] | undefined,
  fallback = "#ff4655",
): string {
  if (!gradientColors || gradientColors.length === 0) return fallback;
  return toHex6(gradientColors[0]);
}

/** Two-stop card background for an agent card. */
export function agentCardBackground(gradientColors: readonly string[] | undefined): string {
  if (!gradientColors || gradientColors.length < 2) {
    return "linear-gradient(180deg, #1b2733 0%, #0f1923 100%)";
  }
  const a = toHex6(gradientColors[0]);
  const b = toHex6(gradientColors[1]);
  return `linear-gradient(180deg, ${a}99 0%, ${b}66 60%, #0a0a0a 100%)`;
}
