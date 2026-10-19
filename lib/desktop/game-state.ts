import mapIds from "./maps.json";
import agents from "./agents.json";
import { initialSnapshot, type GameSnapshot } from "./protocol";

const agentIds: Record<string, string> = agents;
const maps = new Map(Object.entries(mapIds));
export function createGameState(sessionPrefix: string) {
  let state = initialSnapshot();
  let session = 0;
  const clear = () => ({ mapSlug: null, agentSlug: null, agentLocked: false, sessionId: null });
  const begin = () => ({ ...clear(), sessionId: `${sessionPrefix}-${++session}` });
  return {
    get: () => state,
    reset() { state = { ...initialSnapshot(), revision: state.revision }; },
    line(line: string) {
      // Parse named log events only. Audio assets and arbitrary URL substrings are not events.
      const transition = /LogGameFlowStateManager:.*Transitioning from \w+ to (\w+)/.exec(line)?.[1];
      if (transition) {
        if (/Replay/i.test(transition)) state = { ...state, ...clear(), phase: "replay" };
        else if (transition === "TransitionToMainMenu" || transition === "MainMenu") state = { ...state, ...clear(), phase: "menu" };
        else if (transition === "TransitionToPregame" || transition === "Pregame") {
          state = { ...state, ...(state.phase !== "pregame" ? begin() : {}), phase: "pregame" };
        } else if (transition === "TransitionToInGame" || transition === "InGame") {
          state = { ...state, ...(!state.sessionId ? begin() : {}), phase: transition === "InGame" ? "match" : "loading" };
        }
      }
      const success = /Response Code:\s*\[200\]/.test(line);
      if (success && /MatchmakingQueue\]/.test(line) && /\/matchmaking\/join\]/.test(line)) state = { ...state, ...clear(), phase: "queue" };
      if (success && /MatchmakingQueue\]/.test(line) && /\/matchmaking\/leave\]/.test(line) && state.phase === "queue") state = { ...state, ...clear(), phase: "menu" };
      if (success && /Pregame_LockCharacter/.test(line) && state.phase === "pregame") {
        const uuid = /\/lock\/([a-f\d-]{36})/i.exec(line)?.[1]?.toLowerCase();
        if (uuid) state = { ...state, agentSlug: agentIds[uuid] ?? null, agentLocked: true };
      }
      const map = /LogMapLoadModel:.*\[Map Name:\s*([^\]]+)/.exec(line)?.[1]?.trim();
      if (map && ["pregame", "loading", "match"].includes(state.phase)) {
        // Character-select/menu levels aren't playable maps. Unknown playable levels clear stale routes.
        if (!/CharacterSelect|MainMenu|^Init$/i.test(map)) state = { ...state, mapSlug: maps.get(map.toLowerCase()) ?? null };
      }
      return state;
    },
    snapshot(metadata: Pick<GameSnapshot, "gameRunning" | "sourceStatus" | "reason" | "observedAt">): GameSnapshot {
      if (metadata.gameRunning === false) state = { ...state, ...clear(), phase: "unknown" };
      state = { ...state, ...metadata, revision: state.revision + 1 };
      return { ...state };
    },
  };
}
