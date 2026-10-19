"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "@/lib/desktop/protocol";
import { loadAuthRuntime, type AuthRuntime } from "./load-auth-runtime";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const client = url ? new ConvexReactClient(url) : null;

let runtime: AuthRuntime | null = null;
const listeners = new Set<() => void>();

function subscribeRuntime(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function publishRuntime(next: AuthRuntime) {
  runtime = next;
  for (const listener of listeners) listener();
}

export default function AppProviders({ children }: { children: ReactNode }) {
  const Runtime = useSyncExternalStore(
    subscribeRuntime,
    () => runtime,
    () => null,
  );

  useEffect(() => {
    let active = true;
    void loadAuthRuntime(Boolean(window.agentAcademy)).then((module) => {
      if (active) publishRuntime(module.default);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!client) return children;
  if (!Runtime || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <ConvexProvider client={client}>{children}</ConvexProvider>;
  }
  // react-doctor-disable-next-line react-hooks-js/static-components -- Clerk shell is loaded once into a stable module binding
  return <Runtime client={client}>{children}</Runtime>;
}
