export const DESKTOP_PORT = 37491;
export const DESKTOP_ORIGIN = `http://127.0.0.1:${DESKTOP_PORT}`;
export const AUTH_SCHEME = "agent-academy";
export const DESKTOP_REQUEST_HEADER = "x-agent-academy-desktop";
export const DESKTOP_CHANNELS = {
  snapshot: "agent-academy:snapshot",
  changed: "agent-academy:changed",
  window: "agent-academy:window",
  windowState: "agent-academy:window-state",
} as const;

export type GamePhase = "unknown" | "menu" | "queue" | "pregame" | "loading" | "match" | "replay";
export interface GameSnapshot {
  revision: number;
  source: "windows-log";
  gameRunning: boolean | null;
  phase: GamePhase;
  mapSlug: string | null;
  agentSlug: string | null;
  /** Queue id from the game log, such as `competitive` or `custom`. */
  mode: string | null;
  agentLocked: boolean;
  sessionId: string | null;
  observedAt: string | null;
  sourceStatus: "initializing" | "ready" | "missing" | "error" | "unsupported";
  reason: string | null;
}
export interface DesktopWindowControls {
  minimize(): Promise<void>;
  toggleMaximize(): Promise<void>;
  close(): Promise<void>;
  isMaximized(): Promise<boolean>;
  onState(listener: (maximized: boolean) => void): () => void;
}
export interface DesktopBridge {
  readonly version: 1;
  getSnapshot(): Promise<GameSnapshot>;
  subscribe(listener: (snapshot: GameSnapshot) => void): () => void;
  window: DesktopWindowControls;
}
export function initialSnapshot(): GameSnapshot {
  return { revision: 0, source: "windows-log", gameRunning: null, phase: "unknown", mapSlug: null, agentSlug: null, mode: null, agentLocked: false, sessionId: null, observedAt: null, sourceStatus: "initializing", reason: null };
}
declare global {
  interface Window { agentAcademy?: DesktopBridge }
}
