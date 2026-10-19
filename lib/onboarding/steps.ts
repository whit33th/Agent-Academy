export interface OnboardingStepContent {
  title: string;
  body: string;
  target?: string;
  placement?: "bottom" | "top" | "left" | "right" | "center";
}

export const STEP1: OnboardingStepContent = {
  target: "live-sync",
  placement: "bottom",
  title: "Live Sync with VALORANT",
  body: "The desktop app detects VALORANT automatically and opens confirmed maps and agents. In the browser, choose them manually.",
};

export const STEP2_SUBSTEPS: OnboardingStepContent[] = [
  {
    target: "side-tabs",
    placement: "bottom",
    title: "Attack vs Defense",
    body: "Name setups with atk or def in the title — use these tabs to filter the side you need between rounds.",
  },
  {
    target: "ability-filter",
    placement: "left",
    title: "Filter by ability",
    body: "Tap an ability icon — matching setups glow on the grid, everything else fades back.",
  },
  {
    target: "lineup-card",
    placement: "top",
    title: "Open a setup",
    body: "Click a card for fullscreen. Press F to favorite, R for a random lineup from your current filter.",
  },
];

export const STEP3: OnboardingStepContent = {
  target: "lineup-hotkeys",
  placement: "bottom",
  title: "Between rounds",
  body: "Add Agent Academy to your home screen for a second-monitor view. Press ? anytime for keyboard shortcuts.",
};
