import type { Metadata } from "next";

const SITE_NAME = "Agent Academy";
const DEFAULT_DESCRIPTION =
  "Agent Academy — browse Valorant maps, agents, and tactical lineups for every round.";

export function buildRootMetadata(): Metadata {
  return {
    title: {
      default: SITE_NAME,
      template: `%s · ${SITE_NAME}`,
    },
    description: DEFAULT_DESCRIPTION,
    applicationName: SITE_NAME,
    formatDetection: {
      telephone: false,
    },
    icons: {
      icon: "/valorant-icon.svg",
    },
  };
}

export function buildPageMetadata(opts: {
  title: string;
  description: string;
}): Metadata {
  return {
    title: opts.title,
    description: opts.description,
  };
}
