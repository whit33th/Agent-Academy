"use client";

import { useSyncExternalStore } from "react";

const MOBILE_QUERY = "(max-width: 768px)";

function subscribeMobile(onStoreChange: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function mobileSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

export function useMobileOnboardingSkip(): boolean {
  return useSyncExternalStore(subscribeMobile, mobileSnapshot, () => false);
}
