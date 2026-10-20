"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import "@/lib/desktop/protocol";
import DesktopAuthProvider from "./DesktopAuthProvider";
import PreferencesProvider from "@/components/settings/PreferencesProvider";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const client = url ? new ConvexReactClient(url) : null;
const subscribe = () => () => {};
const browserSnapshot = () => true;
const serverSnapshot = () => false;
const anonymousAuth = {
  isLoading: false,
  isAuthenticated: false,
  fetchAccessToken: async () => null,
};
const useAnonymousAuth = () => anonymousAuth;

export default function DesktopAppProviders({
  children,
}: {
  children: ReactNode;
}) {
  const hydrated = useSyncExternalStore(
    subscribe,
    browserSnapshot,
    serverSnapshot,
  );
  if (!client) return <PreferencesProvider>{children}</PreferencesProvider>;
  if (!hydrated || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <ConvexProviderWithAuth client={client} useAuth={useAnonymousAuth}>
        <PreferencesProvider cloud>{children}</PreferencesProvider>
      </ConvexProviderWithAuth>
    );
  }
  return <DesktopAuthProvider client={client}>{children}</DesktopAuthProvider>;
}
