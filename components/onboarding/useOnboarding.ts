"use client";

import { usePathname } from "next/navigation";
import { isLineupPath, shouldShowOnboarding } from "@/lib/onboarding/state";
import { useOnboardingState } from "./useOnboardingState";

/** Lineup page: reveal shortcuts control during step 3. */
export function useOnboardingStep3Active(): boolean {
  const pathname = usePathname();
  const state = useOnboardingState();
  return (
    isLineupPath(pathname) &&
    shouldShowOnboarding(pathname) &&
    state.step === 3 &&
    (state.step3Immediate === true || state.step3Eligible === true)
  );
}
