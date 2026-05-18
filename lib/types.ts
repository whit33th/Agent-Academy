/**
 * Single source of truth for domain types.
 * All data shapes used across the app.
 */

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

export interface SanityAgent {
  _id: string;
  name?: string;
  slug?: { current: string } | null;
  role?: string | null;
  image?: any;
  accentColor?: string | null;
}

export interface SanityMap {
  _id: string;
  name?: string;
  slug?: { current: string } | null;
  image?: any;
  accentColor?: string | null;
}

// ─── Sanity + API merged ───

export interface Agent {
  _id: string;
  slug: { current: string } | null;
  /** Pulled from Valorant API (single source of truth). */
  name: string;
  /** Pulled from Valorant API. */
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
  /** Optional Sanity override (kept for backwards-compat). */
  accentColor?: string | null;
  /** Optional map-specific meta (e.g. viability from mapAgentMeta). */
  viability?: string | null;
  notes?: string | null;
}

export interface GameMap {
  _id: string;
  slug: { current: string } | null;
  /** Pulled from Valorant API. */
  name: string;
  imageUrl: string | null;
  listViewIcon: string | null;
  stylizedBackgroundImage: string | null;
  /** Optional Sanity override. */
  accentColor?: string | null;
}

export interface Screenshot {
  _id: string;
  title: string;
  image: any; // Sanity image asset (opaque)
  abilityType: string | null;
  description: string | null;
  map?: { name: string } | null;
  agent?: { name: string } | null;
}

export interface MapAgentMeta {
  _id: string;
  viability: string | null;
  notes: string | null;
  agent: Agent;
}
