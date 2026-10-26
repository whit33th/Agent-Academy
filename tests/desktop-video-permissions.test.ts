import { describe, expect, it } from "vitest";
import { rendererPermissionAllowed } from "../lib/desktop/renderer-permissions";

describe("desktop renderer permissions", () => {
  const app = "http://127.0.0.1:3000";
  it("allows fullscreen for the app and supported players, with pointer lock limited to the app", () => {
    for (const origin of [
      app,
      "https://www.youtube-nocookie.com/embed/test",
      "https://iframe.videodelivery.net/test",
    ])
      expect(rendererPermissionAllowed("fullscreen", origin, app)).toBe(true);
    expect(rendererPermissionAllowed("pointerLock", app + "/aim", app)).toBe(
      true,
    );
    expect(
      rendererPermissionAllowed(
        "pointerLock",
        "https://iframe.videodelivery.net/test",
        app,
      ),
    ).toBe(false);
  });
  it("denies other origins, non-gesture fullscreen, and unrelated permissions", () => {
    for (const origin of [
      "https://example.com",
      "https://iframe.videodelivery.net.evil.com",
      "http://iframe.videodelivery.net",
      "invalid",
    ])
      expect(rendererPermissionAllowed("fullscreen", origin, app)).toBe(false);
    for (const permission of [
      "automatic-fullscreen",
      "media",
      "geolocation",
      "clipboard-read",
    ])
      expect(
        rendererPermissionAllowed(
          permission,
          "https://iframe.videodelivery.net",
          app,
        ),
      ).toBe(false);
  });
});
