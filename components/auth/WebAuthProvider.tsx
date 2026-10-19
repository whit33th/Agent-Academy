"use client";
import { ClerkProvider, useAuth } from "@clerk/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { SessionProvider } from "./SessionProvider";
export default function WebAuthProvider({ children, client }: { children: ReactNode; client: ConvexReactClient }) {
  return <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}><ConvexProviderWithClerk client={client} useAuth={useAuth}><SessionProvider>{children}</SessionProvider></ConvexProviderWithClerk></ClerkProvider>;
}
