import type { Agent } from "@/lib/types";

export type ViabilityTier = "S" | "A" | "B" | "C" | "D";

const RANK_PRIORITY: Record<string, number> = {
  S: 1,
  A: 2,
  B: 3,
  C: 4,
  D: 5,
};

/** Sort agents: ranked agents (by tier) first, then alphabetical. */
export function sortAgentsByViability(agents: Agent[]): Agent[] {
  return [...agents].sort((a, b) => {
    const aRank = a.viability ? RANK_PRIORITY[a.viability.toUpperCase()] ?? 99 : null;
    const bRank = b.viability ? RANK_PRIORITY[b.viability.toUpperCase()] ?? 99 : null;

    if (aRank !== null && bRank === null) return -1;
    if (aRank === null && bRank !== null) return 1;
    if (aRank !== null && bRank !== null && aRank !== bRank) return aRank - bRank;

    return (a.name ?? "").localeCompare(b.name ?? "");
  });
}

export const TIER_LIST: ViabilityTier[] = ["S", "A", "B", "C", "D"];
