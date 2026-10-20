"use client";
import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { SignIn, useAuth, useClerk, useUser } from "@clerk/react";
import {
  cacheSubjectSnapshot,
  clearCollectionCache,
  subscribeCollectionCache,
  synchronizeCache,
} from "@/lib/collection/cache-client";

const SessionContext = createContext({
  ready: false,
  signedIn: false,
  subject: "",
  name: "",
  firstName: "",
  lastName: "",
  email: "",
  imageUrl: "",
  hasImage: false,
  updateProfile: async (_profile: {
    firstName: string;
    lastName: string;
  }): Promise<void> => {
    void _profile;
    throw new Error("Sign in to update your profile.");
  },
  setProfileImage: async (_file: File | null): Promise<void> => {
    void _file;
    throw new Error("Sign in to update your photo.");
  },
  cacheReady: false,
  getToken: async (): Promise<string | null> => null,
  signOut: async (): Promise<void> => {},
  SignInView: null as typeof SignIn | null,
});
const emptySnapshot = () => "";
export function SessionProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const subject = user?.id ?? "";
  const cacheSubject = useSyncExternalStore(
    subscribeCollectionCache,
    cacheSubjectSnapshot,
    emptySnapshot,
  );
  useEffect(() => {
    if (!isLoaded) return;
    const sync = () => {
      void synchronizeCache(isSignedIn ? subject : "", () =>
        getToken({ template: "convex" }),
      );
    };
    sync();
    const timer = setInterval(sync, 30000);
    return () => clearInterval(timer);
  }, [isLoaded, isSignedIn, subject, getToken]);
  return (
    <SessionContext.Provider
      value={{
        ready: isLoaded,
        signedIn: Boolean(isSignedIn),
        subject,
        firstName: user?.firstName ?? "",
        lastName: user?.lastName ?? "",
        email: user?.primaryEmailAddress?.emailAddress ?? "",
        imageUrl: user?.imageUrl ?? "",
        hasImage: user?.hasImage ?? false,
        updateProfile: async (profile) => {
          if (!user) throw new Error("Your session expired. Sign in again.");
          await user.update(profile);
        },
        setProfileImage: async (file) => {
          if (!user) throw new Error("Your session expired. Sign in again.");
          await user.setProfileImage({ file });
        },
        name:
          [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
          user?.username ||
          user?.primaryEmailAddress?.emailAddress ||
          "Account",
        cacheReady: Boolean(subject && cacheSubject === subject),
        getToken: () => getToken({ template: "convex" }),
        signOut: async () => {
          await clearCollectionCache().catch(() => undefined);
          await signOut();
        },
        SignInView: SignIn,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
export function useAppSession() {
  return useContext(SessionContext);
}
