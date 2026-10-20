import type { Screenshot } from "@/lib/types";
import {
  EMPTY_METADATA,
  type LineupAbility,
  type SideFilter,
  type SiteFilter,
} from "@/lib/lineups/metadata";
export interface LineupFilters {
  favoritesOnly: boolean;
  favoriteIds: ReadonlySet<string>;
  side: SideFilter;
  site: SiteFilter;
  ability: "all" | LineupAbility;
}
export function filterLineups(
  rows: Screenshot[],
  filters: LineupFilters,
): Screenshot[] {
  return rows.filter((row) => {
    const metadata = row.metadata ?? EMPTY_METADATA;
    return (
      (!filters.favoritesOnly || filters.favoriteIds.has(row._id)) &&
      (filters.side === "all" ||
        metadata.side === filters.side ||
        ((filters.side === "atk" || filters.side === "def") &&
          metadata.side === "both")) &&
      (filters.site === "all" || metadata.site === filters.site) &&
      (filters.ability === "all" || metadata.abilitySlot === filters.ability)
    );
  });
}
