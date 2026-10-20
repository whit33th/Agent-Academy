import data from "./valorant-wiki-abilities.json";
import type { AbilityStats } from "@/lib/data/ability-stats";

interface WikiAbilityDatum {
  agent: string;
  ability: string;
  page: string;
  url: string;
  extractedAt: string;
  durationSec?: number;
  radiusM?: number;
  rangeM?: number;
  widthM?: number;
  rawMatches: string[];
  confidence: "low" | "medium" | "high";
}

const VALORANT_WIKI_ABILITIES = data as readonly WikiAbilityDatum[];

export const VALORANT_WIKI_ABILITY_STATS = VALORANT_WIKI_ABILITIES.map((item): AbilityStats => ({
  key: item.ability.toLowerCase(),
  shape: item.radiusM != null ? "circle" : item.rangeM != null ? "wall" : "point",
  radiusM: item.radiusM,
  lengthM: item.rangeM,
  durationSec: item.durationSec,
  label: item.ability,
}));
