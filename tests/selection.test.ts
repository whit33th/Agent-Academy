import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { selectedAgents, selectedMapSlugs } from "../lib/collection/selection";
import { setGuestMap, setGuestAgent } from "../lib/collection/guest-selection";

const KEY = "agent-academy:guest-selection:v1";
const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => vi.unstubAllGlobals());

it("starts empty, uses explicit selections and preserves legacy hidden-agent semantics", async () => {
  const t = convexTest(schema, modules);
  const alice = t.withIdentity({ subject: "alice" });
  expect(
    selectedMapSlugs(await alice.query(api.maps.preferences, {})).size,
  ).toBe(0);
  expect(
    selectedAgents(
      await alice.query(api.mapRoster.listByMap, { mapSlug: "ascent" }),
    ).size,
  ).toBe(0);
  await alice.mutation(api.maps.setPreference, {
    mapSlug: "ascent",
    hidden: false,
  });
  await alice.mutation(api.mapRoster.upsert, {
    mapSlug: "ascent",
    agentSlug: "sova",
    hidden: false,
  });
  expect([
    ...selectedMapSlugs(await alice.query(api.maps.preferences, {})),
  ]).toEqual(["ascent"]);
  expect([
    ...selectedAgents(
      await alice.query(api.mapRoster.listByMap, { mapSlug: "ascent" }),
    ).keys(),
  ]).toEqual(["sova"]);
  await alice.mutation(api.maps.setPreference, {
    mapSlug: "ascent",
    hidden: true,
  });
  expect(
    selectedMapSlugs(await alice.query(api.maps.preferences, {})).size,
  ).toBe(0);
  expect(
    selectedAgents([{ mapSlug: "ascent", agentSlug: "sova", notes: "hidden" }])
      .size,
  ).toBe(0);
  expect(
    selectedAgents([
      { mapSlug: "ascent", agentSlug: "sova", notes: "hidden", hidden: false },
    ]).size,
  ).toBe(1);
  expect(
    await t.withIdentity({ subject: "bob" }).query(api.maps.preferences, {}),
  ).toEqual([]);
});

it("persists guest choices, deduplicates additions, scopes agents by map and recovers damaged preferences", () => {
  const values = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  setGuestMap({ mapSlug: "ascent", hidden: false });
  setGuestMap({ mapSlug: "ascent", hidden: false });
  setGuestAgent({ mapSlug: "ascent", agentSlug: "sova", hidden: false });
  setGuestAgent({ mapSlug: "haven", agentSlug: "sova", hidden: false });
  setGuestAgent({ mapSlug: "ascent", agentSlug: "sova", viability: "A" });
  setGuestAgent({ mapSlug: "ascent", agentSlug: "sova", hidden: true });
  const stored = JSON.parse(values.get(KEY)!);
  expect(stored.maps).toEqual([{ mapSlug: "ascent", hidden: false }]);
  expect(stored.roster).toHaveLength(2);
  expect(
    stored.roster.find((row: { mapSlug: string }) => row.mapSlug === "ascent"),
  ).toMatchObject({ hidden: true, viability: "A" });
  expect(() => setGuestMap({ mapSlug: "invalid-map", hidden: false })).toThrow(
    "known map",
  );
  values.set(KEY, "corrupt-json");
  setGuestMap({ mapSlug: "haven", hidden: false });
  expect(JSON.parse(values.get(KEY)!)).toEqual({
    maps: [{ mapSlug: "haven", hidden: false }],
    roster: [],
  });
});
