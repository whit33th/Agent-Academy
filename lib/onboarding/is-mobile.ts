/** True on phones/tablets — Live Sync step is skipped (companion is desktop-only). */
export function isMobileOnboardingSkip(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}
