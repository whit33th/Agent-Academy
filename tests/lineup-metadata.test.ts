import { describe, expect, expectTypeOf, it } from "vitest";
import { convexTest } from "convex-test";
import type { Infer } from "convex/values";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { lineupMetadata } from "../convex/lib/lineupMetadata";
import {
  EMPTY_METADATA,
  isLineupMetadata,
  type LineupMetadata,
} from "../lib/lineups/metadata";
import { getPlantSites } from "../lib/catalog/lineup-options";
import {
  filterLineups,
  type LineupFilters,
} from "../lib/collection/lineup-filters";
import { isLineupRows } from "../lib/collection/useLineups";
import type { Screenshot } from "../lib/types";

const modules = import.meta.glob("../convex/**/*.ts");
const all: LineupFilters = {
  side: "all",
  site: "all",
  ability: "all",
  favoritesOnly: false,
  favoriteIds: new Set(),
};
const selection: LineupMetadata = {
  side: "atk",
  site: "A",
  abilitySlot: "Ability2",
};

describe("explicit lineup classification", () => {
  it("shares the exact server contract and offers sites from the map catalog", () => {
    expectTypeOf<
      Infer<typeof lineupMetadata>
    >().toEqualTypeOf<LineupMetadata>();
    expect(getPlantSites("ascent")).toEqual(["A", "B"]);
    expect(getPlantSites("haven")).toEqual(["A", "B", "C"]);
    expect(getPlantSites("summit")).toEqual(["A", "B"]);
    expect(getPlantSites("unknown")).toEqual([]);
    expect(isLineupMetadata(selection)).toBe(true);
    expect(isLineupMetadata({ ...selection, site: "D" })).toBe(false);
    expect(isLineupMetadata({ ...selection, abilitySlot: "recon" })).toBe(
      false,
    );
  });

  it("preserves legacy rows without guessing and filters by fields even when titles disagree", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      for (const data of [
        { title: "DEF B Ultimate", metadata: selection },
        { title: "ATK A recon", metadata: undefined },
        {
          title: "Completely free title",
          metadata: {
            side: "both",
            site: "B",
            abilitySlot: "Ability1",
          } as const,
        },
      ])
        await ctx.db.insert("lineups", {
          ...data,
          ownerTokenIdentifier: "qa",
          mapSlug: "ascent",
          agentSlug: "sova",
          abilityType: "recon",
          imageUrl: "",
          isPublic: true,
          createdAt: 1,
          updatedAt: 1,
        });
    });
    const page = await t.query(api.lineups.listPublicByMapAgentPage, {
      mapSlug: "ascent",
      agentSlug: "sova",
      paginationOpts: { numItems: 48, cursor: null },
    });
    expect(isLineupRows(page.page)).toBe(true);
    expect(
      isLineupRows([
        { ...page.page[0], metadata: { ...selection, site: "D" } },
      ]),
    ).toBe(false);
    const rows: Screenshot[] = page.page.map((row) => ({
      _id: row._id,
      title: row.title,
      description: row.description ?? null,
      image: row.imageUrl,
      metadata: row.metadata,
    }));
    expect(
      filterLineups(rows, {
        ...all,
        side: "atk",
        site: "A",
        ability: "Ability2",
      }).map((row) => row.title),
    ).toEqual(["DEF B Ultimate"]);
    expect(
      filterLineups(rows, { ...all, side: "unspecified" }).map(
        (row) => row.title,
      ),
    ).toEqual(["ATK A recon"]);
    expect(
      filterLineups(rows, { ...all, side: "def" }).map((row) => row.title),
    ).toEqual(["Completely free title"]);
    expect(
      filterLineups(rows, { ...all, ability: "Ability1", site: "A" }),
    ).toEqual([]);
    expect(filterLineups(rows, all)).toHaveLength(3);
  });

  it("validates choices on the server, preserves explicit choices on edit/copy and can clear them", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity({ subject: "alice" });
    const bob = t.withIdentity({ subject: "bob" });
    const project = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "demo";
    const { id } = await alice.mutation(api.lineups.create, {
      mapSlug: "ascent",
      agentSlug: "sova",
      title: "DEF B Ult",
      abilityType: "recon",
      imageUrl: `https://cdn.sanity.io/images/${project}/production/abc-1920x1080.png`,
      imageAssetId: "image-abc-1920x1080-png",
      isPublic: true,
    });
    expect((await t.run((ctx) => ctx.db.get(id)))?.metadata).toEqual(
      EMPTY_METADATA,
    );
    await expect(
      alice.mutation(api.lineups.update, {
        id,
        metadata: { ...selection, site: "C" },
      }),
    ).rejects.toThrow("site does not exist");
    // Deliberately malformed wire input: compile-time callers cannot construct this.
    await expect(
      alice.mutation(api.lineups.update, {
        id,
        metadata: { ...selection, side: "sideways" },
      } as never),
    ).rejects.toThrow();
    await alice.mutation(api.lineups.update, { id, metadata: selection });
    await alice.mutation(api.lineups.update, {
      id,
      title: "Changed free text",
    });
    const copy = await bob.mutation(api.lineups.forkPublic, {
      sourceId: id,
      mapSlug: "ascent",
      agentSlug: "sova",
    });
    expect((await t.run((ctx) => ctx.db.get(copy.id)))?.metadata).toEqual(
      selection,
    );
    await expect(
      bob.mutation(api.lineups.update, { id, metadata: EMPTY_METADATA }),
    ).rejects.toThrow("Forbidden");
    await alice.mutation(api.lineups.update, { id, metadata: EMPTY_METADATA });
    expect((await t.run((ctx) => ctx.db.get(id)))?.metadata).toEqual(
      EMPTY_METADATA,
    );
    await expect(
      alice.mutation(api.mapRoster.upsert, {
        mapSlug: "ascent",
        agentSlug: "sova",
        viability: "Legendary",
      } as never),
    ).rejects.toThrow();
  });
});
