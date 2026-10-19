"use client";

import { useEffect } from "react";
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
  type OnboardingState,
} from "@/lib/onboarding/state";
import { useMobileOnboardingSkip } from "@/lib/onboarding/use-mobile";
import { STEP1, STEP2_SUBSTEPS, STEP3 } from "@/lib/onboarding/steps";
import OnboardingSpotlight from "./OnboardingSpotlight";
import HomeTourBanner from "./HomeTourBanner";
import { useOnboardingState } from "./useOnboardingState";
import { useSpotlightRect } from "./useSpotlightRect";
import { useSyncExternalStore } from "react";

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function selectTour(input: {
  pathname: string;
  state: OnboardingState;
  mobileSkip: boolean;
  ready: boolean;
}) {
  const effectiveStep = getEffectiveOnboardingStep(input.state.step, input.mobileSkip);
  const lineupSub = input.state.lineupSubStep ?? 0;
  const onLineupPage = isLineupPath(input.pathname);
  const onHome = input.pathname === "/";
  const step2Content = STEP2_SUBSTEPS[lineupSub];
  const visible = input.ready && shouldShowOnboarding(input.pathname) && effectiveStep !== "done";
  return {
    visible,
    mobileSkip: input.mobileSkip,
    lineupSub,
    step2Content,
    showHomeContinueBanner:
      visible &&
      onHome &&
      (effectiveStep === 2 ||
        (effectiveStep === 3 && !input.state.step3Immediate && !input.state.step3Eligible)),
    homeBannerStep: effectiveStep === 3 ? 3 : 2,
    step1Active: visible && effectiveStep === 1 && !input.mobileSkip && onHome,
    step2Active: visible && effectiveStep === 2 && onLineupPage && Boolean(step2Content),
    step3Active:
      visible &&
      effectiveStep === 3 &&
      onLineupPage &&
      (input.state.step3Immediate === true || input.state.step3Eligible === true),
    step3Target: input.state.step3Immediate === true ? null : (STEP3.target ?? null),
  } as const;
}

export default function OnboardingRoot() {
  const pathname = usePathname();
  const state = useOnboardingState();
  const mobileSkip = useMobileOnboardingSkip();
  const ready = useHydrated();

  useEffect(() => {
    document.body.style.overflow = "";
    if (mobileSkip) skipStep1ForMobileIfNeeded();
  }, [mobileSkip]);

  const tour = selectTour({ pathname, state, mobileSkip, ready });
  const step1Rect = useSpotlightRect("live-sync", tour.step1Active);
  const step2Rect = useSpotlightRect(tour.step2Content?.target ?? null, tour.step2Active);
  const step3Rect = useSpotlightRect(tour.step3Target, tour.step3Active);

  if (!tour.visible) return null;

  return (
    <OnboardingSurfaces
      tour={tour}
      step1Rect={step1Rect}
      step2Rect={step2Rect}
      step3Rect={step3Rect}
    />
  );
}

function OnboardingSurfaces({
  tour,
  step1Rect,
  step2Rect,
  step3Rect,
}: {
  tour: ReturnType<typeof selectTour>;
  step1Rect: ReturnType<typeof useSpotlightRect>;
  step2Rect: ReturnType<typeof useSpotlightRect>;
  step3Rect: ReturnType<typeof useSpotlightRect>;
}) {
  return (
    <>
      {tour.showHomeContinueBanner && (
        <HomeTourBanner step={tour.homeBannerStep as 2 | 3} />
      )}

      {tour.step1Active && (
        <OnboardingSpotlight
          open
          rect={step1Rect}
          title={STEP1.title}
          body={STEP1.body}
          stepLabel="Step 1 of 3"
          totalDots={3}
          activeDot={0}
          onNext={() => setOnboardingStep(2)}
          onSkip={skipOnboarding}
        />
      )}

      {tour.step2Active && tour.step2Content && (
        <OnboardingSpotlight
          open
          rect={step2Rect}
          title={tour.step2Content.title}
          body={tour.step2Content.body}
          stepLabel="Step 2 of 3"
          totalDots={3}
          activeDot={tour.lineupSub}
          onNext={advanceLineupSubStep}
          nextLabel={tour.lineupSub === 2 ? "Continue" : "Next"}
          onBack={tour.lineupSub > 0 || !tour.mobileSkip ? retreatLineupSubStep : undefined}
          onSkip={skipOnboarding}
          showBack={tour.lineupSub > 0 || !tour.mobileSkip}
        />
      )}

      {tour.step3Active && (
        <OnboardingSpotlight
          open
          rect={step3Rect}
          title={STEP3.title}
          body={STEP3.body}
          stepLabel="Step 3 of 3"
          totalDots={3}
          activeDot={2}
          onNext={completeOnboarding}
          onSkip={skipOnboarding}
          nextLabel="Done"
        />
      )}
    </>
  );
}
