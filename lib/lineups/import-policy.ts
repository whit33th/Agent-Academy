import { getTrackerEmbedUrl, isSafeSourceUrl } from "./media";
import { validateLineupSelection } from "../catalog/lineup-options";
import type { LineupMetadata } from "./metadata";

import { LINEUP_BASELINE } from "./competitive-pool";
export { LINEUP_BASELINE } from "./competitive-pool";
export const IMPORT_OWNER = "curated-library|public-lineups";

export interface ImportCandidate {
  sourceKey: string;
  contentHash: string;
  mapSlug: string;
  agentSlug: string;
  title: string;
  description: string;
  metadata: LineupMetadata;
  videoUrl?: string;
  source: {
    url: string;
    embedUrl?: string;
    author: string;
    publishedAt?: string;
    checkedAt: number;
    patch: string;
    evidence: string;
    rightsBasis: string;
    testedInGame: boolean;
  };
}

export function validateImportCandidate(record: ImportCandidate): void {
  validateLineupSelection(record.mapSlug, record.agentSlug, record.metadata);
  if (!(LINEUP_BASELINE.maps as readonly string[]).includes(record.mapSlug))
    throw new Error("Map is outside the confirmed Competitive rotation");
  if (
    !record.title.trim() ||
    record.title.length > 160 ||
    !record.description.trim() ||
    record.description.length > 5000
  )
    throw new Error("A concise title and complete instructions are required");
  if (
    record.metadata.side === "unspecified" ||
    record.metadata.site === "unspecified" ||
    record.metadata.abilitySlot === "unspecified"
  )
    throw new Error("Explicit side, site and ability are required");
  if (
    !record.sourceKey.trim() ||
    record.sourceKey.length > 512 ||
    !/^[a-f0-9]{64}$/.test(record.contentHash)
  )
    throw new Error(
      "A stable source key and SHA-256 content hash are required",
    );
  const source = record.source;
  if (
    !isSafeSourceUrl(source.url) ||
    !source.author.trim() ||
    !source.evidence.trim() ||
    !source.rightsBasis.trim()
  )
    throw new Error(
      "Author, source, compatibility evidence and media usage basis are required",
    );
  const host = new URL(source.url).hostname;
  if (
    source.embedUrl !== undefined &&
    !getTrackerEmbedUrl(source.url, source.embedUrl)
  )
    throw new Error("Only a verified Tracker Stream player may be embedded");
  if (/(^|\.)(strats\.gg|valorantscout\.com)$/.test(host))
    throw new Error("This source is excluded from systematic import");
  const reviewedDay = Date.parse(`${LINEUP_BASELINE.checkedOn}T00:00:00Z`);
  const reviewStart = Date.parse(
    `${LINEUP_BASELINE.reviewWindowStartedOn}T00:00:00Z`,
  );
  if (
    source.patch !== LINEUP_BASELINE.patch ||
    !Number.isFinite(source.checkedAt) ||
    source.checkedAt < reviewStart ||
    source.checkedAt >= reviewedDay + 86400000
  )
    throw new Error(
      "Compatibility must be reviewed against the current baseline",
    );
  if (
    source.publishedAt &&
    (!Number.isFinite(Date.parse(source.publishedAt)) ||
      Date.parse(source.publishedAt) > source.checkedAt)
  )
    throw new Error("Invalid source publication date");
  if (
    record.videoUrl &&
    (record.videoUrl.length > 2048 || !isSafeSourceUrl(record.videoUrl))
  )
    throw new Error("Invalid external video URL");
}

export function hasVideoSource(record: Pick<ImportCandidate, "videoUrl">) {
  return Boolean(record.videoUrl && isSafeSourceUrl(record.videoUrl));
}
