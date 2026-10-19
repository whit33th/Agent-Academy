"use client";
import { createContext, useContext, type ReactNode } from "react";
import { SignIn, useAuth, useClerk, useUser } from "@clerk/react";
const SessionContext = createContext({ ready: false, signedIn: false, subject: "", name: "", getToken: async (): Promise<string | null> => null, signOut: async (): Promise<void> => {}, SignInView: null as typeof SignIn | null });
export function SessionProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  return <SessionContext.Provider value={{ ready: isLoaded, signedIn: Boolean(isSignedIn), subject: user?.id ?? "", name: user?.firstName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress ?? "Account", getToken: () => getToken({ template: "convex" }), signOut: async () => { await signOut(); }, SignInView: SignIn }}>{children}</SessionContext.Provider>;
}
export function useAppSession() { return useContext(SessionContext); }
