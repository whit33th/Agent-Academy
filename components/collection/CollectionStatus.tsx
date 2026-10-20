"use client";
import { useCollectionConnection } from "@/lib/collection/useCollectionConnection";

export default function CollectionStatus() {
  const state = useCollectionConnection();
  const { online } = state;
  return (
    <p className="min-h-5 text-xs text-white/55" role="status">
      {state.isWebSocketConnected
        ? ""
        : !online || state.hasEverConnected
          ? "Offline — showing saved data when available. Reconnect to make changes."
          : state.connectionRetries > 1
            ? "Your collection connection is unavailable. Saved data is shown when available."
            : "Connecting to your collection…"}
    </p>
  );
}
