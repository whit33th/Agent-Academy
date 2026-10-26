import type { ViabilityTier } from "@/lib/utils/viability";
import type { Id } from "@/convex/_generated/dataModel";
import type { AbilitySlot, LineupMetadata } from "@/lib/lineups/metadata";
/**
 * Single source of truth for domain types.
 */

// ─── Valorant API ───

export interface AgentAbility {
  slot: AbilitySlot;
  displayName: string;
  description: string;
  displayIcon: string | null;
}

export interface Agent {
  _id: string;
  slug: { current: string } | null;
  /** Pulled from Valorant API. */
  name: string;
  roleName: string;
  roleIcon: string | null;
  imageUrl: string | null;
  displayIcon: string | null;
  background: string | null;
  artBackground: string | null;
  backgroundGradientColors: string[];
  description: string | null;
  abilities: AgentAbility[];
  /** Optional accent override. */
  accentColor?: string | null;
  voiceLineUrl: string | null;
  /** Map-specific meta. */
  viability?: ViabilityTier | null;
  notes?: string | null;
}

export interface GameMap {
  _id: string;
  slug: { current: string } | null;
  name: string;
  imageUrl: string;
  displayIcon: string | null;
  accentColor?: string | null;
}

export interface LineupImageMedia {
  storageId?: Id<"_storage">;
  imageUrl: string;
  imageAssetId?: string;
  caption: string;
}

export interface LineupSource {
  url: string;
  author: string;
  publishedAt?: string;
  checkedAt: number;
  patch: string;
  evidence: string;
  rightsBasis: string;
  testedInGame: boolean;
}

export interface Screenshot {
  images?: LineupImageMedia[];
  coverIndex?: number;
  videoUrl?: string;
  source?: LineupSource;
  _id: Id<"lineups">;
  title: string;
  /** Resolved cloud image URL. */
  image: string | null;
  metadata?: LineupMetadata;
  description: string | null;
  isPublic?: boolean;
  canEdit?: boolean;
  map?: { name: string } | null;
  agent?: { name: string } | null;
  /** Client-only: data URL preview while optimistic. */
  tempPreview?: string;
}

// ─── Collection operation result ───

export type ActionResult<T = void> =
  { ok: true; data: T } | { ok: false; error: string };
