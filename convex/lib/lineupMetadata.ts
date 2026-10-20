import { v } from "convex/values";
import {
  LINEUP_SIDES,
  LINEUP_SITES,
  LINEUP_ABILITIES,
} from "../../lib/lineups/metadata";

export const lineupMetadata = v.object({
  side: v.union(...LINEUP_SIDES.map((value) => v.literal(value))),
  site: v.union(...LINEUP_SITES.map((value) => v.literal(value))),
  abilitySlot: v.union(...LINEUP_ABILITIES.map((value) => v.literal(value))),
});
