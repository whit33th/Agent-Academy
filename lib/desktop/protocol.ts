export const DESKTOP_PORT = 37491;
export const DESKTOP_ORIGIN = `http://127.0.0.1:${DESKTOP_PORT}`;
export const AUTH_SCHEME = "agent-academy";
export const DESKTOP_REQUEST_HEADER = "x-agent-academy-desktop";
export const DESKTOP_CHANNELS = {
  snapshot: "agent-academy:snapshot",
  changed: "agent-academy:changed",
  window: "agent-academy:window",
  windowState: "agent-academy:window-state",
  cache: "agent-academy:cache",
  copyBoard: "agent-academy:copy-board",
  preferences: "agent-academy:preferences",
  updates: "agent-academy:updates",
  updateState: "agent-academy:update-state",
  openSettings: "agent-academy:open-settings",
} as const;

export interface NativePreferences {
  autoStart: boolean;
  closeToTray: boolean;
}
export interface UpdateState {
  status:
    | "idle"
    | "checking"
    | "available"
    | "current"
    | "unpublished"
    | "downloading"
    | "downloaded"
    | "installing"
    | "error";
  currentVersion: string;
  availableVersion: string | null;
  percent: number;
  message: string | null;
}

type GamePhase =
  "unknown" | "menu" | "queue" | "pregame" | "loading" | "match" | "replay";
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
interface DesktopWindowControls {
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
  copyBoardLink(mapSlug: string, payload: string): Promise<void>;
  window: DesktopWindowControls;
  preferences: {
    get(): Promise<NativePreferences>;
    apply(value: NativePreferences): Promise<NativePreferences>;
    onOpen(listener: () => void): () => void;
  };
  updates: {
    get(): Promise<UpdateState>;
    check(): Promise<UpdateState>;
    download(): Promise<UpdateState>;
    install(): Promise<void>;
    subscribe(listener: (state: UpdateState) => void): () => void;
  };
  cache: {
    authorize(token: string | null): Promise<boolean>;
    read(key: string, privateData: boolean): Promise<unknown | null>;
    write(key: string, value: unknown, privateData: boolean): Promise<void>;
    image(url: string, privateData: boolean): Promise<string | null>;
  };
}
export function initialSnapshot(): GameSnapshot {
  return {
    revision: 0,
    source: "windows-log",
    gameRunning: null,
    phase: "unknown",
    mapSlug: null,
    agentSlug: null,
    mode: null,
    agentLocked: false,
    sessionId: null,
    observedAt: null,
    sourceStatus: "initializing",
    reason: null,
  };
}
declare global {
  interface Window {
    agentAcademy?: DesktopBridge;
  }
}
