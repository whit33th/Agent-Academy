import { VALORANT_WIKI_ABILITY_STATS } from "@/lib/generated/valorant-wiki-abilities";
import { findMapRecord } from "@/lib/generated/valorant-maps";

/**
 * Real in-game VALORANT ability dimensions, sourced from community wikis and
 * the official VALORANT API descriptions. Radii / lengths are expressed in
 * **in-game meters** and converted to map-radar fractions via
 * {@link metersToFraction}.
 *
 * The radar baseline assumes a typical map radar covers ~70 m horizontally.
 * This is an empirical average across Bind / Haven / Ascent / Split / Lotus.
 * If a future map is significantly different, callers can pass a per-map
 * `meterScale` override.
 */

export type AbilityShape = "circle" | "wall" | "cone" | "cross" | "point";

export interface AbilityStats {
  /** Lower-case ability display name (matches API) */
  key: string;
  shape: AbilityShape;
  /** Effective radius in meters (for `circle`) */
  radiusM?: number;
  /** Maximum cast length in meters (for `wall`) */
  lengthM?: number;
  /** Cone angle in degrees (for `cone`) */
  coneAngleDeg?: number;
  /** Cone reach in meters (for `cone`) */
  coneRangeM?: number;
  /** Duration in seconds (effective, not cast) */
  durationSec?: number;
  /** Short tactical label */
  label: string;
}

/**
 * Per-ability data. Keys are lowercased ability `displayName` strings.
 *
 * Numbers are pulled from the in-game tooltips and community measurement
 * threads. They are intentionally conservative вЂ” meant to communicate
 * *relative* size accurately on the strat board, not pixel-perfect realism.
 */
const ABILITY_STATS: AbilityStats[] = [
  // в”Ђв”Ђ SMOKES в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  {
    key: "sky smoke",
    shape: "circle",
    radiusM: 5,
    durationSec: 19.25,
    label: "Sky Smoke",
  },
  {
    key: "stim beacon",
    shape: "circle",
    radiusM: 8,
    durationSec: 8,
    label: "Stim",
  },
  {
    key: "incendiary",
    shape: "circle",
    radiusM: 4,
    durationSec: 6,
    label: "Incendiary",
  },
  {
    key: "orbital strike",
    shape: "circle",
    radiusM: 9,
    durationSec: 5,
    label: "Orbital Strike",
  },
  {
    key: "dark cover",
    shape: "circle",
    radiusM: 4,
    durationSec: 15,
    label: "Dark Cover",
  },
  { key: "shrouded step", shape: "point", label: "Shrouded Step" },
  {
    key: "paranoia",
    shape: "cone",
    coneAngleDeg: 25,
    coneRangeM: 35,
    durationSec: 3.25,
    label: "Paranoia",
  },
  { key: "from the shadows", shape: "point", label: "From the Shadows" },
  {
    key: "nebula",
    shape: "circle",
    radiusM: 4,
    durationSec: 15,
    label: "Nebula",
  },
  {
    key: "gravity well",
    shape: "circle",
    radiusM: 5,
    durationSec: 2.75,
    label: "Gravity Well",
  },
  { key: "nova pulse", shape: "circle", radiusM: 7, label: "Nova Pulse" },
  {
    key: "cosmic divide",
    shape: "wall",
    lengthM: 100,
    durationSec: 20,
    label: "Cosmic Divide",
  },
  {
    key: "cloudburst",
    shape: "circle",
    radiusM: 4,
    durationSec: 4.5,
    label: "Cloudburst",
  },
  {
    key: "meddle",
    shape: "circle",
    radiusM: 4,
    durationSec: 4,
    label: "Meddle",
  },
  {
    key: "pick-me-up",
    shape: "circle",
    radiusM: 4,
    durationSec: 12,
    label: "Pick-Me-Up",
  },
  { key: "ruse", shape: "circle", radiusM: 4, durationSec: 10, label: "Ruse" },

  // в”Ђв”Ђ WALLS в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  {
    key: "barrier orb",
    shape: "wall",
    lengthM: 10,
    durationSec: 30,
    label: "Barrier",
  },
  { key: "blaze", shape: "wall", lengthM: 12, durationSec: 8, label: "Blaze" },
  {
    key: "toxic screen",
    shape: "wall",
    lengthM: 30,
    durationSec: 999,
    label: "Toxic Screen",
  },
  {
    key: "high tide",
    shape: "wall",
    lengthM: 24,
    durationSec: 15,
    label: "High Tide",
  },
  {
    key: "fortify",
    shape: "wall",
    lengthM: 18,
    durationSec: 999,
    label: "Fortify",
  },
  {
    key: "barrier mesh",
    shape: "cross",
    lengthM: 13,
    radiusM: 2.5,
    durationSec: 30,
    label: "Barrier Mesh",
  },

  // в”Ђв”Ђ MOLLIES в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  {
    key: "hot hands",
    shape: "circle",
    radiusM: 3,
    durationSec: 4,
    label: "Hot Hands",
  },
  {
    key: "snake bite",
    shape: "circle",
    radiusM: 3,
    durationSec: 6.5,
    label: "Snake Bite",
  },
  {
    key: "nanoswarm",
    shape: "circle",
    radiusM: 5,
    durationSec: 4,
    label: "Nanoswarm",
  },
  {
    key: "aftershock",
    shape: "wall",
    lengthM: 12,
    durationSec: 1.5,
    label: "Aftershock",
  },
  { key: "spike rush", shape: "circle", radiusM: 5, label: "Spike Rush" },
  {
    key: "mosh pit",
    shape: "circle",
    radiusM: 6,
    durationSec: 1.5,
    label: "Mosh Pit",
  },
  { key: "annihilation", shape: "circle", radiusM: 6, label: "Annihilation" },
  {
    key: "poison cloud",
    shape: "circle",
    radiusM: 4.5,
    durationSec: 999,
    label: "Poison Cloud",
  },
  {
    key: "petrify",
    shape: "circle",
    radiusM: 8,
    durationSec: 4,
    label: "Petrify",
  },
  { key: "bonzai", shape: "point", label: "Bonzai" },
  { key: "showstopper", shape: "circle", radiusM: 7, label: "Showstopper" },

  // в”Ђв”Ђ RECON / INFO в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  {
    key: "recon bolt",
    shape: "circle",
    radiusM: 12,
    durationSec: 3,
    label: "Recon",
  },
  {
    key: "owl drone",
    shape: "cone",
    coneAngleDeg: 80,
    coneRangeM: 25,
    label: "Owl Drone",
  },
  {
    key: "haunt",
    shape: "circle",
    radiusM: 12,
    durationSec: 2,
    label: "Haunt",
  },
  {
    key: "prowler",
    shape: "cone",
    coneAngleDeg: 70,
    coneRangeM: 30,
    label: "Prowler",
  },
  {
    key: "spycam",
    shape: "cone",
    coneAngleDeg: 60,
    coneRangeM: 20,
    label: "Spycam",
  },
  {
    key: "trapwire",
    shape: "wall",
    lengthM: 15,
    durationSec: 999,
    label: "Trapwire",
  },
  {
    key: "neural theft",
    shape: "circle",
    radiusM: 999,
    durationSec: 6,
    label: "Neural Theft",
  },
  {
    key: "alarmbot",
    shape: "circle",
    radiusM: 7,
    durationSec: 999,
    label: "Alarmbot",
  },
  {
    key: "turret",
    shape: "cone",
    coneAngleDeg: 100,
    coneRangeM: 40,
    durationSec: 999,
    label: "Turret",
  },
  {
    key: "lockdown",
    shape: "circle",
    radiusM: 19,
    durationSec: 8,
    label: "Lockdown",
  },
  { key: "seekers", shape: "circle", radiusM: 999, label: "Seekers" },
  {
    key: "trailblazer",
    shape: "cone",
    coneAngleDeg: 80,
    coneRangeM: 25,
    label: "Trailblazer",
  },
  {
    key: "guiding light",
    shape: "wall",
    lengthM: 35,
    durationSec: 1.5,
    label: "Guiding Light",
  },
  {
    key: "zero/point",
    shape: "circle",
    radiusM: 12,
    durationSec: 5,
    label: "Zero/Point",
  },
  { key: "frag/ment", shape: "circle", radiusM: 4, label: "Frag/ment" },
  {
    key: "null/cmd",
    shape: "circle",
    radiusM: 16,
    durationSec: 12,
    label: "Null/cmd",
  },
  {
    key: "fault line",
    shape: "wall",
    lengthM: 30,
    durationSec: 4,
    label: "Fault Line",
  },
  { key: "seize", shape: "circle", radiusM: 5, durationSec: 4, label: "Seize" },
  {
    key: "neon overdrive",
    shape: "cone",
    coneAngleDeg: 5,
    coneRangeM: 25,
    label: "Overdrive",
  },
  {
    key: "fast lane",
    shape: "wall",
    lengthM: 25,
    durationSec: 4,
    label: "Fast Lane",
  },
  {
    key: "relay bolt",
    shape: "circle",
    radiusM: 4,
    durationSec: 0.5,
    label: "Relay Bolt",
  },
  { key: "high gear", shape: "point", label: "High Gear" },
  { key: "tour de force", shape: "point", label: "Tour de Force" },
  {
    key: "killing floor",
    shape: "circle",
    radiusM: 4,
    durationSec: 10,
    label: "Killing Floor",
  },

  // Iso
  { key: "double tap", shape: "point", label: "Double Tap" },
  { key: "undercut", shape: "wall", lengthM: 25, label: "Undercut" },
  {
    key: "contingency",
    shape: "wall",
    lengthM: 12,
    durationSec: 8,
    label: "Contingency",
  },
  {
    key: "kill contract",
    shape: "circle",
    radiusM: 25,
    label: "Kill Contract",
  },

  // Vyse
  {
    key: "shear",
    shape: "wall",
    lengthM: 15,
    durationSec: 999,
    label: "Shear",
  },
  {
    key: "arc rose",
    shape: "circle",
    radiusM: 6,
    durationSec: 1,
    label: "Arc Rose",
  },
  {
    key: "razorvine",
    shape: "circle",
    radiusM: 4,
    durationSec: 30,
    label: "Razorvine",
  },
  {
    key: "steel garden",
    shape: "circle",
    radiusM: 25,
    durationSec: 8,
    label: "Steel Garden",
  },

  // Tejo
  {
    key: "stealth drone",
    shape: "cone",
    coneAngleDeg: 60,
    coneRangeM: 30,
    label: "Stealth Drone",
  },
  { key: "guided salvo", shape: "circle", radiusM: 6, label: "Guided Salvo" },
  {
    key: "special delivery",
    shape: "circle",
    radiusM: 4,
    label: "Special Delivery",
  },
  {
    key: "armageddon",
    shape: "wall",
    lengthM: 40,
    durationSec: 4,
    label: "Armageddon",
  },

  // Waylay
  {
    key: "lightspeed",
    shape: "circle",
    radiusM: 6,
    durationSec: 1.5,
    label: "Lightspeed",
  },
  {
    key: "saturate",
    shape: "wall",
    lengthM: 15,
    durationSec: 6,
    label: "Saturate",
  },
  {
    key: "rolling thunder",
    shape: "wall",
    lengthM: 60,
    label: "Rolling Thunder",
  },
  {
    key: "convergent paths",
    shape: "circle",
    radiusM: 30,
    label: "Convergent Paths",
  },
];

interface AbilityShapeOverride {
  key: string;
  shape: AbilityShape;
  /** Optional override for cone angle in degrees — Wiki rarely encodes this directly. */
  coneAngleDeg?: number;
}

/**
 * Shape overrides ensure the tactical board renders the correct primitive for
 * each ability even when the Wiki numeric data alone could be ambiguous.
 *
 * Only `shape` (and optionally `coneAngleDeg` for cones) lives here. All numeric
 * metrics — radius, length, cone range, duration — come from the generated
 * wiki dataset, and `ABILITY_STATS` is used only as a last-resort fallback.
 */
const ABILITY_SHAPE_OVERRIDES: AbilityShapeOverride[] = [
  // Smokes
  { key: "sky smoke", shape: "circle" },
  { key: "dark cover", shape: "circle" },
  { key: "nebula", shape: "circle" },
  { key: "cloudburst", shape: "circle" },
  { key: "meddle", shape: "circle" },
  { key: "pick-me-up", shape: "circle" },
  { key: "ruse", shape: "circle" },
  { key: "poison cloud", shape: "circle" },
  { key: "cyber cage", shape: "circle" },
  { key: "cove", shape: "circle" },

  // Walls
  { key: "barrier orb", shape: "wall" },
  { key: "blaze", shape: "wall" },
  { key: "toxic screen", shape: "wall" },
  { key: "high tide", shape: "wall" },
  { key: "fortify", shape: "wall" },
  { key: "cosmic divide", shape: "wall" },
  { key: "aftershock", shape: "wall" },
  { key: "fault line", shape: "wall" },
  { key: "rolling thunder", shape: "wall" },
  { key: "fast lane", shape: "wall" },
  { key: "guiding light", shape: "wall" },
  { key: "tailwind", shape: "wall" },
  { key: "cascade", shape: "wall" },
  { key: "shear", shape: "wall" },
  { key: "armageddon", shape: "wall" },
  { key: "saturate", shape: "wall" },
  { key: "undercut", shape: "wall" },
  { key: "contingency", shape: "wall" },
  { key: "tripwire", shape: "wall" },
  { key: "trapwire", shape: "wall" },

  // Cones
  { key: "boom bot", shape: "cone", coneAngleDeg: 55 },
  { key: "owl drone", shape: "cone", coneAngleDeg: 80 },
  { key: "spycam", shape: "cone", coneAngleDeg: 60 },
  { key: "prowler", shape: "cone", coneAngleDeg: 70 },
  { key: "trailblazer", shape: "cone", coneAngleDeg: 80 },
  { key: "turret", shape: "cone", coneAngleDeg: 100 },
  { key: "wingman", shape: "cone", coneAngleDeg: 70 },
  { key: "dizzy", shape: "cone", coneAngleDeg: 90 },
  { key: "thrash", shape: "cone", coneAngleDeg: 70 },
  { key: "stealth drone", shape: "cone", coneAngleDeg: 60 },
  { key: "flashpoint", shape: "cone", coneAngleDeg: 60 },
  { key: "curveball", shape: "cone", coneAngleDeg: 60 },
  { key: "paranoia", shape: "cone", coneAngleDeg: 25 },
  { key: "headhunter", shape: "cone", coneAngleDeg: 5 },
  { key: "tour de force", shape: "cone", coneAngleDeg: 5 },
  { key: "blade storm", shape: "cone", coneAngleDeg: 10 },
  { key: "overdrive", shape: "cone", coneAngleDeg: 5 },
  { key: "annihilation", shape: "cone", coneAngleDeg: 18 },
  { key: "flash/drive", shape: "cone", coneAngleDeg: 65 },
  { key: "flash-drive", shape: "cone", coneAngleDeg: 65 },

  // Compound / special
  { key: "barrier mesh", shape: "cross" },
];

/**
 * Fallback map-radar size in meters used when we cannot match the map to
 * Riot's official scale data. Valorant playable areas typically fit into
 * an 80–90 m square on the minimap, so 85 m is a safe neutral default.
 */
const DEFAULT_METERS_PER_MAP = 85;

/**
 * Convert in-game meters to a 0–1 fraction of the map radar width.
 *
 * When `mapName` is provided, we look up the exact `metersPerMinimap` from the
 * generated valorant-api dataset (driven by Riot's `xMultiplier`). Otherwise we
 * fall back to {@link DEFAULT_METERS_PER_MAP}.
 */
export function metersToFraction(meters: number, mapName?: string): number {
  const mapMeters = mapName
    ? (findMapRecord(mapName)?.metersPerMinimap ?? DEFAULT_METERS_PER_MAP)
    : DEFAULT_METERS_PER_MAP;
  return Math.max(0.005, meters / mapMeters);
}

function findShapeOverride(name: string): AbilityShapeOverride | undefined {
  return (
    ABILITY_SHAPE_OVERRIDES.find((entry) => entry.key === name) ||
    ABILITY_SHAPE_OVERRIDES.find((entry) => name.includes(entry.key)) ||
    ABILITY_SHAPE_OVERRIDES.find((entry) => entry.key.includes(name))
  );
}

function findWikiStat(name: string): AbilityStats | undefined {
  return (
    VALORANT_WIKI_ABILITY_STATS.find((entry) => entry.key === name) ||
    VALORANT_WIKI_ABILITY_STATS.find((entry) => name.includes(entry.key)) ||
    VALORANT_WIKI_ABILITY_STATS.find((entry) => entry.key.includes(name))
  );
}

function findBaseStat(name: string): AbilityStats | undefined {
  return (
    ABILITY_STATS.find((entry) => entry.key === name) ||
    ABILITY_STATS.find((entry) => name.includes(entry.key)) ||
    ABILITY_STATS.find((entry) => entry.key.includes(name))
  );
}

/**
 * Build the final `AbilityStats` used by the tactical board:
 *   shape   — from manual override, falling back to wiki/base inference.
 *   metrics — strictly from Wiki, falling back to base only when Wiki is silent.
 */
export function findAbilityStats(displayName: string): AbilityStats | null {
  const name = (displayName || "").toLowerCase();
  const shapeOverride = findShapeOverride(name);
  const wiki = findWikiStat(name);
  const base = findBaseStat(name);

  if (!wiki && !base && !shapeOverride) return null;

  const shape = shapeOverride?.shape ?? wiki?.shape ?? base?.shape ?? "point";
  const label = wiki?.label ?? base?.label ?? displayName;

  return {
    key: name,
    shape,
    label,
    radiusM: wiki?.radiusM ?? base?.radiusM,
    lengthM: wiki?.lengthM ?? base?.lengthM,
    coneAngleDeg:
      shapeOverride?.coneAngleDeg ?? wiki?.coneAngleDeg ?? base?.coneAngleDeg,
    coneRangeM: wiki?.coneRangeM ?? base?.coneRangeM,
    durationSec: wiki?.durationSec ?? base?.durationSec,
  };
}
