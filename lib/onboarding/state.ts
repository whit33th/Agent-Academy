import { isMobileOnboardingSkip } from "./is-mobile";

const ONBOARDING_STORAGE_KEY = "vp_onboarding_v1";
const ONBOARDING_VERSION = 1 as const;

export type OnboardingStep = 1 | 2 | 3 | "done";
type LineupSubStep = 0 | 1 | 2;

export interface OnboardingState {
  version: typeof ONBOARDING_VERSION;
  step: OnboardingStep;
  lineupSubStep?: LineupSubStep;
  step3Eligible?: boolean;
  /** Show step 3 immediately after step 2 (before lightbox/?). */
  step3Immediate?: boolean;
}

/** Stable SSR snapshot — must keep referential equality across server renders. */
const ONBOARDING_SERVER_SNAPSHOT: OnboardingState = Object.freeze({
  version: ONBOARDING_VERSION,
  step: 1,
  lineupSubStep: 0,
  step3Eligible: false,
  step3Immediate: false,
});

function createDefaultClientState(): OnboardingState {
  return {
    version: ONBOARDING_VERSION,
    step: 1,
    lineupSubStep: 0,
    step3Eligible: false,
    step3Immediate: false,
  };
}

/** In-memory client cache so getSnapshot returns a stable reference until state changes. */
let memoryState: OnboardingState | null = null;

function readRaw(): OnboardingState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    if (parsed.version !== ONBOARDING_VERSION) return null;
    if (
      parsed.step !== 1 &&
      parsed.step !== 2 &&
      parsed.step !== 3 &&
      parsed.step !== "done"
    ) {
      return null;
    }
    return {
      version: ONBOARDING_VERSION,
      step: parsed.step,
      lineupSubStep:
        parsed.lineupSubStep === 0 ||
        parsed.lineupSubStep === 1 ||
        parsed.lineupSubStep === 2
          ? parsed.lineupSubStep
          : 0,
      step3Eligible: Boolean(parsed.step3Eligible),
      step3Immediate: Boolean(parsed.step3Immediate),
    };
  } catch {
    return null;
  }
}

function write(state: OnboardingState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
}

function hydrateMemoryFromStorage(): OnboardingState {
  memoryState = readRaw() ?? createDefaultClientState();
  return memoryState;
}

function notify(next: OnboardingState): void {
  if (typeof window === "undefined") return;
  memoryState = next;
  window.dispatchEvent(
    new CustomEvent("vp-onboarding-change", {
      detail: next,
    }),
  );
}

function getOnboardingState(): OnboardingState {
  if (typeof window === "undefined") {
    return ONBOARDING_SERVER_SNAPSHOT;
  }
  if (!memoryState) {
    return hydrateMemoryFromStorage();
  }
  return memoryState;
}

/** Client snapshot for useSyncExternalStore — stable reference until state changes. */
export function getOnboardingSnapshot(): OnboardingState {
  return getOnboardingState();
}

/** Cached server snapshot for useSyncExternalStore — do not allocate per render. */
export function getOnboardingServerSnapshot(): OnboardingState {
  return ONBOARDING_SERVER_SNAPSHOT;
}

export function subscribeOnboarding(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = () => onStoreChange();
  window.addEventListener("vp-onboarding-change", handler);
  return () => window.removeEventListener("vp-onboarding-change", handler);
}

/** Step shown in UI; step 1 is suppressed on mobile/tablet. */
export function getEffectiveOnboardingStep(
  step: OnboardingStep,
  mobile = isMobileOnboardingSkip(),
): OnboardingStep {
  if (step === 1 && mobile) return 2;
  return step;
}

/** Persist step 2 when mobile users would still be on stored step 1. */
export function skipStep1ForMobileIfNeeded(): OnboardingState {
  const current = getOnboardingState();
  if (current.step !== 1 || !isMobileOnboardingSkip()) return current;
  return setOnboardingStep(2);
}

function setOnboardingState(
  partial: Partial<OnboardingState>,
): OnboardingState {
  const next = {
    ...getOnboardingState(),
    ...partial,
    version: ONBOARDING_VERSION,
  };
  write(next);
  notify(next);
  return next;
}

export function setOnboardingStep(step: OnboardingStep): OnboardingState {
  return setOnboardingState({ step });
}

export function advanceLineupSubStep(): OnboardingState {
  const current = getOnboardingState();
  const sub = current.lineupSubStep ?? 0;
  if (sub < 2) {
    return setOnboardingState({ lineupSubStep: (sub + 1) as LineupSubStep });
  }
  return setOnboardingState({
    step: 3,
    lineupSubStep: 0,
    step3Eligible: false,
    step3Immediate: true,
  });
}

export function retreatLineupSubStep(): OnboardingState {
  const current = getOnboardingState();
  const sub = current.lineupSubStep ?? 0;
  if (sub > 0) {
    return setOnboardingState({
      lineupSubStep: (sub - 1) as LineupSubStep,
    });
  }
  if (isMobileOnboardingSkip()) {
    return current;
  }
  return setOnboardingState({ step: 1, lineupSubStep: 0 });
}

export function markStep3Eligible(): OnboardingState {
  const current = getOnboardingState();
  if (current.step !== 3) return current;
  if (current.step3Eligible && !current.step3Immediate) return current;
  return setOnboardingState({ step3Eligible: true, step3Immediate: false });
}

export function completeOnboarding(): OnboardingState {
  return setOnboardingState({
    step: "done",
    step3Eligible: true,
    step3Immediate: false,
  });
}

export function skipOnboarding(): OnboardingState {
  return completeOnboarding();
}

export function restartOnboarding(): OnboardingState {
  const step: OnboardingStep = isMobileOnboardingSkip() ? 2 : 1;
  const next: OnboardingState = {
    version: ONBOARDING_VERSION,
    step,
    lineupSubStep: 0,
    step3Eligible: false,
    step3Immediate: false,
  };
  write(next);
  notify(next);
  return next;
}

export function shouldShowOnboarding(pathname: string): boolean {
  return !pathname.startsWith("/studio");
}

export function isLineupPath(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  return parts.length === 2;
}
