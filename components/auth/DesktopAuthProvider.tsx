"use client";
import { ClerkProvider, useAuth } from "@clerk/electron/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { SessionProvider } from "./SessionProvider";
import PreferencesProvider from "@/components/settings/PreferencesProvider";
export default function DesktopAuthProvider({
  children,
  client,
}: {
  children: ReactNode;
  client: ConvexReactClient;
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      allowedRedirectProtocols={["agent-academy:"]}
    >
      <ConvexProviderWithClerk client={client} useAuth={useAuth}>
        <SessionProvider>
          <PreferencesProvider cloud>{children}</PreferencesProvider>
        </SessionProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
