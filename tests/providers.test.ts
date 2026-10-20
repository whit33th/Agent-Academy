import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { useConvexAuth } from "convex/react";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_CONVEX_URL = "https://qa.convex.cloud";
});
import DesktopAppProviders from "../components/auth/DesktopAppProviders";

it("provides the auth contract while prerendering without invoking native Clerk", () => {
  function Probe() {
    const auth = useConvexAuth();
    return createElement(
      "p",
      null,
      auth.isAuthenticated ? "signed-in" : "guest",
    );
  }
  expect(
    renderToString(
      createElement(DesktopAppProviders, null, createElement(Probe)),
    ),
  ).toContain("guest");
});
