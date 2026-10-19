"use client";

import LiveSyncStatus from "@/components/hud/LiveSyncStatus";
import { useOnboardingStep1Active } from "@/components/onboarding/useOnboarding";

export default function HomeHeaderNav() {
  const step1 = useOnboardingStep1Active();

  return (
    <div className="flex items-center">
      <div className={step1 ? "flex items-center" : "hidden sm:flex items-center"}>
        <LiveSyncStatus />
      </div>
    </div>
  );
}
