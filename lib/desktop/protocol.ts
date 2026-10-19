export const DESKTOP_PORT = 37491;
export const DESKTOP_ORIGIN = `http://127.0.0.1:${DESKTOP_PORT}`;
export const AUTH_SCHEME = "agent-academy";
export const DESKTOP_CHANNELS = {
  snapshot: "agent-academy:snapshot",
  changed: "agent-academy:changed",
} as const;

export type GamePhase = "unknown" | "menu" | "queue" | "pregame" | "loading" | "match" | "replay";
export interface GameSnapshot {
  revision: number;
  source: "windows-log";
  gameRunning: boolean | null;
  phase: GamePhase;
  mapSlug: string | null;
  agentSlug: string | null;
  agentLocked: boolean;
  sessionId: string | null;
  observedAt: string | null;
  sourceStatus: "initializing" | "ready" | "missing" | "error" | "unsupported";
  reason: string | null;
}
export interface DesktopBridge {
  readonly version: 1;
  getSnapshot(): Promise<GameSnapshot>;
  subscribe(listener: (snapshot: GameSnapshot) => void): () => void;
}
export function initialSnapshot(): GameSnapshot {
  return { revision: 0, source: "windows-log", gameRunning: null, phase: "unknown", mapSlug: null, agentSlug: null, agentLocked: false, sessionId: null, observedAt: null, sourceStatus: "initializing", reason: null };
}
declare global {
  interface Window { agentAcademy?: DesktopBridge }
}
