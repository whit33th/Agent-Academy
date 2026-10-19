"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  advanceLineupSubStep,
  completeOnboarding,
  getEffectiveOnboardingStep,
  isLineupPath,
  retreatLineupSubStep,
  setOnboardingStep,
  shouldShowOnboarding,
  skipOnboarding,
  skipStep1ForMobileIfNeeded,
} from "@/lib/onboarding/state";
import { isMobileOnboardingSkip } from "@/lib/onboarding/is-mobile";
import { STEP1, STEP2_SUBSTEPS, STEP3 } from "@/lib/onboarding/steps";
import OnboardingSpotlight from "./OnboardingSpotlight";
import HomeTourBanner from "./HomeTourBanner";
import { useOnboardingState } from "./useOnboardingState";
import { useSpotlightRect } from "./useSpotlightRect";

export default function OnboardingRoot() {
  const pathname = usePathname();
  const state = useOnboardingState();
  const [ready, setReady] = useState(false);
  const [mobileSkip, setMobileSkip] = useState(false);

  useLayoutEffect(() => {
    document.body.style.overflow = "";

    const mobile = isMobileOnboardingSkip();
    setMobileSkip(mobile);
    if (mobile) skipStep1ForMobileIfNeeded();

    const onViewportChange = () => {
      const nextMobile = isMobileOnboardingSkip();
      setMobileSkip(nextMobile);
      if (nextMobile) skipStep1ForMobileIfNeeded();
    };

    const mqNarrow = window.matchMedia("(max-width: 768px)");
    mqNarrow.addEventListener("change", onViewportChange);
    setReady(true);

    return () => {
      mqNarrow.removeEventListener("change", onViewportChange);
    };
  }, []);

  const effectiveStep = getEffectiveOnboardingStep(state.step);
  const lineupSub = state.lineupSubStep ?? 0;
  const onLineupPage = isLineupPath(pathname);
  const onHome = pathname === "/";

  const step2Content = STEP2_SUBSTEPS[lineupSub];
  const step2Target = step2Content?.target ?? null;
  const step2Active =
    ready &&
    effectiveStep === 2 &&
    onLineupPage &&
    Boolean(step2Content);

  const step1Active =
    ready && effectiveStep === 1 && !mobileSkip && onHome;

  const step3Active =
    ready &&
    effectiveStep === 3 &&
    onLineupPage &&
    (state.step3Immediate === true || state.step3Eligible === true);

  const showHomeContinueBanner =
    ready &&
    onHome &&
    (effectiveStep === 2 ||
      (effectiveStep === 3 &&
        !state.step3Immediate &&
        !state.step3Eligible));

  const step3Target =
    state.step3Immediate === true ? null : (STEP3.target ?? null);

  const step1Rect = useSpotlightRect("live-sync", step1Active);
  const step2Rect = useSpotlightRect(step2Target, step2Active);
  const step3Rect = useSpotlightRect(step3Target, step3Active);

  const handleSkip = useCallback(() => {
    skipOnboarding();
  }, []);

  const handleStep1Next = useCallback(() => {
    setOnboardingStep(2);
  }, []);

  const handleStep2Next = useCallback(() => {
    advanceLineupSubStep();
  }, []);

  const handleStep2Back = useCallback(() => {
    retreatLineupSubStep();
  }, []);

  const handleStep3Next = useCallback(() => {
    completeOnboarding();
  }, []);

  if (!ready || !shouldShowOnboarding(pathname) || effectiveStep === "done") {
    return null;
  }

  return (
    <>
      {showHomeContinueBanner && (
        <HomeTourBanner step={effectiveStep === 3 ? 3 : 2} />
      )}

      {step1Active && (
        <OnboardingSpotlight
          open
          rect={step1Rect}
          title={STEP1.title}
          body={STEP1.body}
          stepLabel="Step 1 of 3"
          totalDots={3}
          activeDot={0}
          onNext={handleStep1Next}
          onSkip={handleSkip}
        />
      )}

      {step2Active && step2Content && (
        <OnboardingSpotlight
          open
          rect={step2Rect}
          title={step2Content.title}
          body={step2Content.body}
          stepLabel="Step 2 of 3"
          totalDots={3}
          activeDot={lineupSub}
          onNext={handleStep2Next}
          nextLabel={lineupSub === 2 ? "Continue" : "Next"}
          onBack={lineupSub > 0 || !mobileSkip ? handleStep2Back : undefined}
          onSkip={handleSkip}
          showBack={lineupSub > 0 || !mobileSkip}
        />
      )}

      {step3Active && (
        <OnboardingSpotlight
          open
          rect={step3Rect}
          title={STEP3.title}
          body={STEP3.body}
          stepLabel="Step 3 of 3"
          totalDots={3}
          activeDot={2}
          onNext={handleStep3Next}
          onSkip={handleSkip}
          nextLabel="Done"
        />
      )}
    </>
  );
}
