export const LINEUP_SIDES = ["atk", "def", "both", "unspecified"] as const;
export type LineupSide = (typeof LINEUP_SIDES)[number];
const PLANT_SITES = ["A", "B", "C"] as const;
export type PlantSite = (typeof PLANT_SITES)[number];
export const LINEUP_SITES = [...PLANT_SITES, "none", "unspecified"] as const;
export type LineupSite = (typeof LINEUP_SITES)[number];
const ABILITY_SLOTS = [
  "Ability1",
  "Ability2",
  "Grenade",
  "Ultimate",
  "Passive",
] as const;
export type AbilitySlot = (typeof ABILITY_SLOTS)[number];
export const LINEUP_ABILITIES = [...ABILITY_SLOTS, "unspecified"] as const;
export type LineupAbility = (typeof LINEUP_ABILITIES)[number];
export interface LineupMetadata {
  side: LineupSide;
  site: LineupSite;
  abilitySlot: LineupAbility;
}
export type SideFilter = "all" | LineupSide;
export type SiteFilter = "all" | LineupSite;
export const EMPTY_METADATA: Readonly<LineupMetadata> = {
  side: "unspecified",
  site: "unspecified",
  abilitySlot: "unspecified",
};
export const SIDE_LABELS: Record<LineupSide, string> = {
  atk: "Attack",
  def: "Defense",
  both: "Both sides",
  unspecified: "Not specified",
};
export const SITE_LABELS: Record<LineupSite, string> = {
  A: "A Site",
  B: "B Site",
  C: "C Site",
  none: "General / no site",
  unspecified: "Not specified",
};
export function isAbilitySlot(value: unknown): value is AbilitySlot {
  return ABILITY_SLOTS.some((slot) => slot === value);
}
export function isPlantSite(value: unknown): value is PlantSite {
  return PLANT_SITES.some((site) => site === value);
}
export function isSideFilter(value: unknown): value is SideFilter {
  return value === "all" || LINEUP_SIDES.some((side) => side === value);
}
export function isLineupMetadata(value: unknown): value is LineupMetadata {
  return (
    typeof value === "object" &&
    value !== null &&
    "side" in value &&
    LINEUP_SIDES.some((side) => side === value.side) &&
    "site" in value &&
    LINEUP_SITES.some((site) => site === value.site) &&
    "abilitySlot" in value &&
    LINEUP_ABILITIES.some((slot) => slot === value.abilitySlot)
  );
}
