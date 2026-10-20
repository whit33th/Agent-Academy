"use client";

import { useConvexConnectionState } from "convex/react";
import { useOnlineStatus } from "./useOnlineStatus";

export function useCollectionConnection() {
  const state = useConvexConnectionState();
  const online = useOnlineStatus();
  return {
    ...state,
    online,
    unavailable:
      !online ||
      (!state.isWebSocketConnected &&
        (state.connectionRetries > 1 || state.hasEverConnected)),
  };
}
