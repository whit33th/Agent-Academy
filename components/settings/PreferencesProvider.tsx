"use client";
import {
  Component,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  useConvexAuth,
  useConvexConnectionState,
  useMutation,
  useQuery,
} from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppSession } from "@/components/auth/SessionProvider";
import {
  DEFAULT_PREFERENCES,
  isAppPreferences,
  type AppPreferences,
} from "@/lib/settings/model";
import {
  readPreferences,
  writePreferences,
  subscribePreferences,
  hasPreferences,
} from "@/lib/settings/store";
import type { NativePreferences } from "@/lib/desktop/protocol";

type SyncState = "device" | "loading" | "synced" | "offline" | "error";
type SaveCloud = (patch: Partial<AppPreferences>) => Promise<AppPreferences>;
const PreferencesContext = createContext({
  settings: DEFAULT_PREFERENCES as AppPreferences,
  scope: "guest",
  syncState: "device" as SyncState,
  nativeError: "",
  retrySync: () => {},
  save: async (_patch: Partial<AppPreferences>): Promise<void> => {
    void _patch;
    throw new Error("Settings are unavailable.");
  },
});

class SyncBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

async function applyNative(value: AppPreferences) {
  const bridge = window.agentAcademy?.preferences;
  if (!bridge) return;
  const current = await bridge.get();
  if (
    current.autoStart !== value.autoStart ||
    current.closeToTray !== value.closeToTray
  )
    await bridge.apply({
      autoStart: value.autoStart,
      closeToTray: value.closeToTray,
    });
}

export default function PreferencesProvider({
  children,
  cloud = false,
}: {
  children: ReactNode;
  cloud?: boolean;
}) {
  const { signedIn, subject } = useAppSession();
  const scope = signedIn && subject ? subject : "guest";
  const settings = useSyncExternalStore(
    subscribePreferences,
    () => readPreferences(scope),
    () => DEFAULT_PREFERENCES,
  );
  const [syncState, setSyncState] = useState<SyncState>("loading");
  const [nativeError, setNativeError] = useState("");
  const [retry, setRetry] = useState(0);
  const cloudSave = useRef<SaveCloud | null>(null);
  const saving = useRef(false);
  const register = useCallback((save: SaveCloud | null) => {
    cloudSave.current = save;
  }, []);
  const onFailure = useCallback(() => setSyncState("error"), []);
  const receive = useCallback((account: string, value: AppPreferences) => {
    if (JSON.stringify(readPreferences(account)) !== JSON.stringify(value))
      writePreferences(account, value);
    void applyNative(value)
      .then(() => setNativeError(""))
      .catch(() =>
        setNativeError(
          "Windows settings could not be applied. Save again to retry.",
        ),
      );
  }, []);
  useEffect(() => {
    if (scope !== "guest" || hasPreferences(scope)) return;
    let active = true;
    void window.agentAcademy?.preferences
      ?.get()
      .then((native) => {
        if (active && !hasPreferences(scope))
          writePreferences(scope, { ...readPreferences(scope), ...native });
      })
      .catch(() => setNativeError("Windows settings could not be loaded."));
    return () => {
      active = false;
    };
  }, [scope]);

  async function save(patch: Partial<AppPreferences>) {
    if (saving.current) throw new Error("Settings are already being saved.");
    const previous = readPreferences(scope);
    const next = { ...previous, ...patch };
    if (!isAppPreferences(next)) throw new Error("Invalid settings.");
    if (signedIn && !cloudSave.current)
      throw new Error(
        "Account settings are unavailable. Reconnect and retry sync.",
      );
    if (signedIn && syncState !== "synced")
      throw new Error(
        "Reconnect and wait for your account settings before saving.",
      );
    saving.current = true;
    const saveAccount = cloudSave.current;
    let nativeBefore: NativePreferences | undefined;
    let cloudCommitted = false;
    try {
      nativeBefore = await window.agentAcademy?.preferences?.get();
      await applyNative(next);
      const saved = signedIn && saveAccount ? await saveAccount(patch) : next;
      cloudCommitted = signedIn;
      writePreferences(scope, saved);
      await applyNative(saved);
      setNativeError("");
    } catch (error) {
      if (!cloudCommitted && nativeBefore)
        await window.agentAcademy?.preferences
          .apply(nativeBefore)
          .catch(() =>
            setNativeError(
              "Windows could not restore the previous settings. Check automatic startup.",
            ),
          );
      throw error;
    } finally {
      saving.current = false;
    }
  }
  return (
    <PreferencesContext.Provider
      value={{
        settings,
        scope,
        syncState: signedIn ? syncState : "device",
        nativeError,
        save,
        retrySync: () => setRetry((value) => value + 1),
      }}
    >
      {cloud && signedIn && (
        <SyncBoundary key={`${scope}:${retry}`} onFailure={onFailure}>
          <CloudSync
            account={scope}
            receive={receive}
            register={register}
            onState={setSyncState}
          />
        </SyncBoundary>
      )}
      {children}
    </PreferencesContext.Provider>
  );
}

function CloudSync({
  account,
  receive,
  register,
  onState,
}: {
  account: string;
  receive: (scope: string, value: AppPreferences) => void;
  register: (save: SaveCloud | null) => void;
  onState: (state: SyncState) => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const connection = useConvexConnectionState();
  const preferences = useQuery(
    api.users.getPreferences,
    isAuthenticated ? {} : "skip",
  );
  const update = useMutation(api.users.setPreferences);
  useEffect(() => {
    onState(
      !connection.isWebSocketConnected
        ? "offline"
        : preferences === undefined
          ? "loading"
          : "synced",
    );
    register(async (patch) => {
      if (!isAuthenticated || preferences === undefined)
        throw new Error("Wait for your account settings to load.");
      if (!connection.isWebSocketConnected || !navigator.onLine)
        throw new Error(
          "Reconnect to sync your settings. Your changes have not been saved.",
        );
      return update({ preferences: patch });
    });
    return () => register(null);
  }, [
    isAuthenticated,
    connection.isWebSocketConnected,
    preferences,
    register,
    update,
    onState,
  ]);
  useEffect(() => {
    if (preferences) receive(account, preferences);
  }, [account, preferences, receive]);
  return null;
}
export function useAppPreferences() {
  return useContext(PreferencesContext);
}
