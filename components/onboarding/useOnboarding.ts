"use client";

import { usePathname } from "next/navigation";
import { isMobileOnboardingSkip } from "@/lib/onboarding/is-mobile";
import {
  getEffectiveOnboardingStep,
  isLineupPath,
  shouldShowOnboarding,
} from "@/lib/onboarding/state";
import { useOnboardingState } from "./useOnboardingState";

export function useOnboarding() {
  return useOnboardingState();
}

/** Desktop home tour: force Live Sync visible for step 1 spotlight. */
export function useOnboardingStep1Active(): boolean {
  const pathname = usePathname();
  const state = useOnboarding();
  if (isMobileOnboardingSkip()) return false;
  return (
    pathname === "/" &&
    shouldShowOnboarding(pathname) &&
    getEffectiveOnboardingStep(state.step) === 1
  );
}

/** Lineup page: reveal shortcuts control during step 3. */
export function useOnboardingStep3Active(): boolean {
  const pathname = usePathname();
  const state = useOnboarding();
  return (
    isLineupPath(pathname) &&
    shouldShowOnboarding(pathname) &&
    state.step === 3 &&
    (state.step3Immediate === true || state.step3Eligible === true)
  );
}
