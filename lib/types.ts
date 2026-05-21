/**
 * Single source of truth for domain types.
 */

import type { SanityImageSource } from "@sanity/image-url";

// ─── Valorant API ───

export interface AgentAbility {
  slot: string;
  displayName: string;
  description: string;
  displayIcon: string | null;
}

export interface AgentRole {
  uuid: string;
  displayName: string;
  description: string;
  displayIcon: string | null;
  assetPath: string;
}

// ─── Sanity raw shapes ───

export interface SanitySlug {
  current: string;
}

export interface SanityAgent {
  _id: string;
  name?: string;
  slug?: SanitySlug | null;
  role?: string | null;
  image?: SanityImageSource | null;
  accentColor?: string | null;
}

export interface SanityMap {
  _id: string;
  name?: string;
  slug?: SanitySlug | null;
  image?: SanityImageSource | null;
  accentColor?: string | null;
}

export interface SanityMapAgentMeta {
  _id: string;
  viability?: string | null;
  notes?: string | null;
  agent?: { _id: string } | null;
}

// ─── Sanity + API merged ───

export interface Agent {
  _id: string;
  slug: SanitySlug | null;
  /** Pulled from Valorant API. */
  name: string;
  roleName: string;
  roleIcon: string | null;
  imageUrl: string | null;
  fullPortraitV2: string | null;
  bustPortrait: string | null;
  displayIcon: string | null;
  background: string | null;
  backgroundGradientColors: string[];
  description: string | null;
  abilities: AgentAbility[];
  /** Optional Sanity override. */
  accentColor?: string | null;
  voiceLineUrl: string | null;
  /** Map-specific meta. */
  viability?: string | null;
  notes?: string | null;
}

export interface GameMap {
  _id: string;
  slug: SanitySlug | null;
  name: string;
  imageUrl: string | null;
  listViewIcon: string | null;
  displayIcon: string | null;
  stylizedBackgroundImage: string | null;
  accentColor?: string | null;
}

export interface Screenshot {
  _id: string;
  title: string;
  image: SanityImageSource | null;
  abilityType: string | null;
  description: string | null;
  map?: { name: string } | null;
  agent?: { name: string } | null;
  /** Client-only: data URL preview while optimistic. */
  tempPreview?: string;
}

export interface MapAgentMeta {
  _id: string;
  viability: string | null;
  notes: string | null;
  agent: Agent;
}

// ─── Server-action result envelope ───

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };
