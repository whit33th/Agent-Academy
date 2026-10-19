import type { GameSnapshot } from "./protocol";

const NAMES: Record<string, string> = { kayo: "KAY/O" };
const MODES: Record<string, string> = {
  competitive: "Ranked",
  unrated: "Unrated",
  swiftplay: "Swiftplay",
  spikerush: "Spike Rush",
  deathmatch: "Deathmatch",
  ggteam: "Escalation",
  hurm: "Team Deathmatch",
  onefa: "Replication",
  snowball: "Snowball",
  premier: "Premier",
  custom: "Custom",
  range: "Range",
};

export function prettySlug(slug: string) {
  return NAMES[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}

function modeName(mode: string) {
  return MODES[mode] ?? prettySlug(mode);
}

/** Short chrome status: map, locked agent, and queue when the log named one. */
export function syncStatusLabel(state: GameSnapshot | null): string {
  if (!state || state.gameRunning === false) return "Offline";
  if (state.gameRunning === null) return state.sourceStatus === "initializing" ? "Connecting" : "Offline";
  if (state.sourceStatus === "missing" || state.sourceStatus === "error") return "No sync";
  const active = state.phase === "pregame" || state.phase === "loading" || state.phase === "match" || state.phase === "queue";
  const map = state.mapSlug ? prettySlug(state.mapSlug) : null;
  const agent = state.agentLocked && state.agentSlug ? prettySlug(state.agentSlug) : null;
  const mode = active && state.mode ? modeName(state.mode) : null;
  const place = [map, agent, mode].filter(Boolean).join(" · ");
  if (place && (state.phase === "pregame" || state.phase === "loading" || state.phase === "match")) return place;
  if (state.phase === "menu") return "Lobby";
  if (state.phase === "queue") return place || "Queue";
  if (state.phase === "pregame") return "Select";
  if (state.phase === "loading") return "Loading";
  if (state.phase === "replay") return "Replay";
  if (state.phase === "match") return "Live";
  return "Live";
}
