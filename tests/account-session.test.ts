import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  user: {
    id: "user_profile_fixture",
    firstName: "Alex",
    lastName: "Player",
    hasImage: true,
    imageUrl: "https://img.clerk.com/profile-fixture.png",
    primaryEmailAddress: { emailAddress: "alex@example.test" },
    update: vi.fn(async () => undefined),
    setProfileImage: vi.fn(async () => undefined),
  },
  signOut: vi.fn(async () => undefined),
  getToken: vi.fn(async () => null),
}));
vi.mock("@clerk/react", () => ({
  SignIn: () => null,
  useUser: () => ({ user: sdk.user }),
  useAuth: () => ({ isLoaded: true, isSignedIn: true, getToken: sdk.getToken }),
  useClerk: () => ({ signOut: sdk.signOut }),
}));
import {
  SessionProvider,
  useAppSession,
} from "../components/auth/SessionProvider";
import AccountProfile from "../components/auth/AccountProfile";

it("renders the Clerk photo and profile and delegates edits to the current Clerk user", async () => {
  let session: ReturnType<typeof useAppSession> | undefined;
  function Probe() {
    session = useAppSession();
    return createElement(AccountProfile, { onSignOut: () => undefined });
  }
  const html = renderToString(
    createElement(SessionProvider, null, createElement(Probe)),
  );
  expect(html).toContain(sdk.user.imageUrl);
  expect(html).toContain(sdk.user.primaryEmailAddress.emailAddress);
  expect(html).toContain("Change photo");
  expect(html).toContain('value="Alex"');
  if (!session) throw new Error("Session provider did not render");
  await session.updateProfile({ firstName: "Sam", lastName: "Player" });
  expect(sdk.user.update).toHaveBeenCalledWith({
    firstName: "Sam",
    lastName: "Player",
  });
  const file = new File(["avatar"], "avatar.png", { type: "image/png" });
  await session.setProfileImage(file);
  expect(sdk.user.setProfileImage).toHaveBeenLastCalledWith({ file });
  await session.setProfileImage(null);
  expect(sdk.user.setProfileImage).toHaveBeenLastCalledWith({ file: null });
});
