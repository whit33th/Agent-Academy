import { afterEach, expect, expectTypeOf, it, vi } from "vitest";
import { convexTest } from "convex-test";
import type { Infer } from "convex/values";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { preferences } from "../convex/lib/preferences";
import {
  DEFAULT_PREFERENCES,
  isAppPreferences,
  type AppPreferences,
} from "../lib/settings/model";
import { readPreferences, writePreferences } from "../lib/settings/store";
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => vi.unstubAllGlobals());

it("defaults music/video on, isolates accounts, validates volumes and merges independent changes", async () => {
  expectTypeOf<Infer<typeof preferences>>().toEqualTypeOf<AppPreferences>();
  expect(DEFAULT_PREFERENCES.musicEnabled).toBe(true);
  expect(DEFAULT_PREFERENCES.backgroundVideo).toBe(true);
  const t = convexTest(schema, modules);
  const alice = t.withIdentity({ subject: "alice" });
  const bob = t.withIdentity({ subject: "bob" });
  expect(await alice.query(api.users.getPreferences, {})).toEqual(
    DEFAULT_PREFERENCES,
  );
  await expect(
    t.mutation(api.users.setPreferences, {
      preferences: { musicEnabled: false },
    }),
  ).rejects.toThrow();
  await alice.mutation(api.users.setPreferences, {
    preferences: { musicEnabled: false, autoStart: true },
  });
  await alice.mutation(api.users.setPreferences, {
    preferences: { backgroundVideo: false, voiceVolume: 0 },
  });
  expect(await alice.query(api.users.getPreferences, {})).toEqual({
    ...DEFAULT_PREFERENCES,
    musicEnabled: false,
    autoStart: true,
    backgroundVideo: false,
    voiceVolume: 0,
  });
  expect(await bob.query(api.users.getPreferences, {})).toEqual(
    DEFAULT_PREFERENCES,
  );
  await expect(
    alice.mutation(api.users.setPreferences, {
      preferences: { musicVolume: 1.1 },
    }),
  ).rejects.toThrow("Volumes");
  expect((await alice.query(api.users.getPreferences, {})).musicVolume).toBe(
    0.4,
  );
  expect(isAppPreferences({ ...DEFAULT_PREFERENCES, effectsVolume: NaN })).toBe(
    false,
  );
  expect(
    isAppPreferences({ ...DEFAULT_PREFERENCES, backgroundVideo: "true" }),
  ).toBe(false);
});

it("keeps guest/account preferences separate and recovers invalid local settings", () => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  expect(readPreferences("guest")).toEqual(DEFAULT_PREFERENCES);
  writePreferences("alice", { ...DEFAULT_PREFERENCES, musicEnabled: false });
  expect(readPreferences("alice").musicEnabled).toBe(false);
  expect(readPreferences("bob").musicEnabled).toBe(true);
  storage.set("agent-academy:preferences:v1:alice", "broken");
  expect(readPreferences("alice")).toEqual(DEFAULT_PREFERENCES);
  expect(() =>
    writePreferences("alice", { ...DEFAULT_PREFERENCES, musicVolume: -1 }),
  ).toThrow("Invalid");
});
