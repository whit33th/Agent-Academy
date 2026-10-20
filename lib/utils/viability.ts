export type ViabilityTier = "S" | "A" | "B" | "C" | "D";

const RANK_PRIORITY: Record<ViabilityTier, number> = {
  S: 1,
  A: 2,
  B: 3,
  C: 4,
  D: 5,
};

/** Sort agents: ranked agents (by tier) first, then alphabetical. */
export function sortAgentsByViability<
  T extends { viability?: ViabilityTier | null; name?: string | null },
>(agents: T[]): T[] {
  return [...agents].sort((a, b) => {
    const aRank = a.viability ? RANK_PRIORITY[a.viability] : null;
    const bRank = b.viability ? RANK_PRIORITY[b.viability] : null;

    if (aRank !== null && bRank === null) return -1;
    if (aRank === null && bRank !== null) return 1;
    if (aRank !== null && bRank !== null && aRank !== bRank)
      return aRank - bRank;

    return (a.name ?? "").localeCompare(b.name ?? "");
  });
}

export const TIER_LIST: ViabilityTier[] = ["S", "A", "B", "C", "D"];

export function getViabilityTier(value: unknown): ViabilityTier | null {
  if (typeof value !== "string") return null;
  const tier = value.toUpperCase();
  return TIER_LIST.find((option) => option === tier) ?? null;
}
