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
  body: "Agent Academy detects VALORANT and opens confirmed maps and agents. You can also choose a map and agent manually.",
};

export const STEP2_SUBSTEPS: OnboardingStepContent[] = [
  {
    target: "side-tabs",
    placement: "bottom",
    title: "Attack vs Defense",
    body: "Choose a side when saving a setup, then use these tabs to filter Attack, Defense or Both sides.",
  },
  {
    target: "ability-filter",
    placement: "left",
    title: "Filter by ability",
    body: "Choose an ability icon to show setups saved for that ability. Use All to clear the ability filter.",
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
  body: "Keep Agent Academy on your second monitor between rounds. Press ? anytime for keyboard shortcuts.",
};
