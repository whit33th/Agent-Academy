"use client";

import { useSyncExternalStore } from "react";
import {
  getOnboardingSnapshot,
  getOnboardingServerSnapshot,
  subscribeOnboarding,
  type OnboardingState,
} from "@/lib/onboarding/state";

export function useOnboardingState(): OnboardingState {
  return useSyncExternalStore(
    subscribeOnboarding,
    getOnboardingSnapshot,
    getOnboardingServerSnapshot,
  );
}
