import type { AbilitySlot } from "@/lib/lineups/metadata";
const SLOT_KEYS: Record<AbilitySlot, string> = {
  Ability1: "Q",
  Ability2: "E",
  Grenade: "C",
  Ultimate: "X",
  Passive: "Passive",
};
export function getSlotKey(slot: AbilitySlot): string {
  return SLOT_KEYS[slot];
}
