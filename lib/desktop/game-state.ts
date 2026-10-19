import mapIds from "./maps.json";
import agents from "./agents.json";
import { initialSnapshot, type GameSnapshot } from "./protocol";

const agentIds: Record<string, string> = agents;
const maps = new Map(Object.entries(mapIds));
const RULESET_MODES: Record<string, string> = {
  ShootingRange: "range",
  Deathmatch: "deathmatch",
  GunGame: "ggteam",
  HURM: "hurm",
  OneForAll: "onefa",
};
export function createGameState(sessionPrefix: string) {
  let state = initialSnapshot();
  let session = 0;
  const clearRound = () => ({ mapSlug: null, agentSlug: null, agentLocked: false, sessionId: null });
  const clear = () => ({ ...clearRound(), mode: null });
  const begin = () => ({ ...clearRound(), sessionId: `${sessionPrefix}-${++session}` });
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
      if (success && /MatchmakingQueue\]/.test(line) && /\/matchmaking\/join\]/.test(line)) state = { ...state, ...clearRound(), phase: "queue" };
      if (success && /MatchmakingQueue\]/.test(line) && /\/matchmaking\/leave\]/.test(line) && state.phase === "queue") state = { ...state, ...clear(), phase: "menu" };
      if (success && /Party_ChangeQueue/.test(line)) state = { ...state, mode: null };
      const queueId = success ? /[?&]queueID=([a-z0-9_]+)/i.exec(line)?.[1]?.toLowerCase() : undefined;
      if (queueId) state = { ...state, mode: queueId };
      if (success && /Party_(?:StartCustomGame|MakePartyIntoCustomGame)/.test(line)) state = { ...state, mode: "custom" };
      if (success && /Party_StartSoloExperience/.test(line)) state = { ...state, mode: "range" };
      const ruleset = RULESET_MODES[/\/GameModes\/([A-Za-z0-9_]+)\//.exec(line)?.[1] ?? ""];
      if (ruleset && !state.mode) state = { ...state, mode: ruleset };
      if (success && /Pregame_LockCharacter/.test(line) && state.phase === "pregame") {
        const uuid = /\/lock\/([a-f\d-]{36})/i.exec(line)?.[1]?.toLowerCase();
        if (uuid) state = { ...state, agentSlug: agentIds[uuid] ?? null, agentLocked: true };
      }
      const map = /LogMapLoadModel:.*\[Map Name:\s*([^|\]]+)/.exec(line)?.[1]?.trim();
      if (map && !/CharacterSelect|MainMenu|^Init$/i.test(map)) {
        const slug = maps.get(map.toLowerCase());
        if (slug) state = { ...state, mapSlug: slug };
        else if (["pregame", "loading", "match"].includes(state.phase)) state = { ...state, mapSlug: null };
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
