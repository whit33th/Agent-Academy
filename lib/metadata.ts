import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

const SITE_NAME = "Agent Academy";
const DEFAULT_DESCRIPTION =
  "Agent Academy — browse Valorant maps, agents, and tactical lineups for every round.";

export function buildRootMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: SITE_NAME,
      template: `%s · ${SITE_NAME}`,
    },
    description: DEFAULT_DESCRIPTION,
    applicationName: SITE_NAME,
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: SITE_NAME,
    },
    formatDetection: {
      telephone: false,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: SITE_NAME,
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      url: siteUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
    },
    icons: {
      icon: "/valorant-icon.svg",
      apple: "/valorant-icon.svg",
    },
  };
}

export function buildPageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  imageUrl?: string | null;
}): Metadata {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}${opts.path}`;
  const images = opts.imageUrl
    ? [{ url: opts.imageUrl, width: 1200, height: 630, alt: opts.title }]
    : undefined;

  return {
    title: opts.title,
    description: opts.description,
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: opts.imageUrl ? [opts.imageUrl] : undefined,
    },
  };
}
