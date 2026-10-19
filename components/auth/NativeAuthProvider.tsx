"use client";
import { ClerkProvider, useAuth } from "@clerk/electron/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { SessionProvider } from "./SessionProvider";
export default function NativeAuthProvider({ children, client }: { children: ReactNode; client: ConvexReactClient }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!} allowedRedirectProtocols={["agent-academy:"]}>
      {/* react-doctor-disable-next-line react-hooks-js/hooks -- Convex calls this Clerk hook; the provider API requires the hook reference */}
      <ConvexProviderWithClerk client={client} useAuth={useAuth}>
        <SessionProvider>{children}</SessionProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
