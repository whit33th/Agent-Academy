import type { FunctionReturnType } from "convex/server";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");
type Filters = { mapSlug?: string; agentSlug?: string; abilitySlot?: string };

describe("public feed indexed filters", () => {
  it("paginates the complete filtered collection beyond 48 cards in chronological order", async () => {
    const t = convexTest(schema, modules);
    const seeded = await t.run(async (ctx) => {
      const records: {
        id: string;
        mapSlug: string;
        agentSlug: string;
        abilitySlot?: string;
        createdAt: number;
        isPublic: boolean;
      }[] = [];
      const groups = [
        {
          mapSlug: "bind",
          agentSlug: "killjoy",
          abilitySlot: "Grenade",
          isPublic: true,
        },
        {
          mapSlug: "bind",
          agentSlug: "killjoy",
          abilitySlot: "Ability1",
          isPublic: true,
        },
        {
          mapSlug: "haven",
          agentSlug: "killjoy",
          abilitySlot: "Grenade",
          isPublic: true,
        },
        {
          mapSlug: "bind",
          agentSlug: "neon",
          abilitySlot: "Grenade",
          isPublic: true,
        },
        {
          mapSlug: "bind",
          agentSlug: "killjoy",
          abilitySlot: "Grenade",
          isPublic: false,
        },
      ] as const;
      for (let group = 0; group < groups.length; group++) {
        for (let index = 0; index < 65; index++) {
          const record = groups[group];
          const createdAt = group * 1000 + (64 - index);
          const id = await ctx.db.insert("lineups", {
            ownerTokenIdentifier: "owner",
            mapSlug: record.mapSlug,
            agentSlug: record.agentSlug,
            title: `${group}/${index}`,
            abilityType: record.abilitySlot,
            metadata: {
              side: "atk",
              site: "A",
              abilitySlot: record.abilitySlot,
            },
            imageUrl: "",
            videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            isPublic: record.isPublic,
            createdAt,
            updatedAt: createdAt,
          });
          records.push({ ...record, id, createdAt });
        }
      }
      const createdAt = 6000;
      const id = await ctx.db.insert("lineups", {
        ownerTokenIdentifier: "owner",
        mapSlug: "bind",
        agentSlug: "killjoy",
        title: "Legacy without metadata",
        abilityType: "nanoswarm",
        imageUrl: "",
        isPublic: true,
        createdAt,
        updatedAt: createdAt,
      });
      records.push({
        id,
        mapSlug: "bind",
        agentSlug: "killjoy",
        createdAt,
        isPublic: true,
      });
      return records;
    });

    for (const filters of [
      {},
      { mapSlug: "bind" },
      { agentSlug: "killjoy" },
      { mapSlug: "bind", agentSlug: "killjoy" },
      { agentSlug: "killjoy", abilitySlot: "Grenade" },
      { mapSlug: "bind", agentSlug: "killjoy", abilitySlot: "Grenade" },
    ] satisfies Filters[]) {
      const expected = seeded
        .filter(
          (row) =>
            row.isPublic &&
            Object.entries(filters).every(
              ([key, value]) => row[key as keyof typeof row] === value,
            ),
        )
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((row) => row.id);
      const ids: string[] = [];
      let cursor: string | null = null;
      let done = false;
      while (!done) {
        const page: FunctionReturnType<typeof api.lineups.listPublicFeedPage> =
          await t.query(api.lineups.listPublicFeedPage, {
            ...filters,
            paginationOpts: { numItems: 48, cursor },
          });
        ids.push(...page.page.map((row) => row._id));
        cursor = page.continueCursor;
        done = page.isDone;
      }
      expect(expected.length).toBeGreaterThan(48);
      expect(ids).toEqual(expected);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("rejects missing agents, unknown filters and abilities unavailable to a changed agent", async () => {
    const t = convexTest(schema, modules);
    const paginationOpts = { numItems: 48, cursor: null };
    await expect(
      t.query(api.lineups.listPublicFeedPage, {
        paginationOpts,
        abilitySlot: "Grenade",
      }),
    ).rejects.toThrow("Choose an agent");
    await expect(
      t.query(api.lineups.listPublicFeedPage, {
        paginationOpts,
        mapSlug: "missing",
      }),
    ).rejects.toThrow("known map");
    await expect(
      t.query(api.lineups.listPublicFeedPage, {
        paginationOpts,
        agentSlug: "missing",
      }),
    ).rejects.toThrow("known agent");
    const allowed = await t.query(api.lineups.listPublicFeedPage, {
      paginationOpts,
      agentSlug: "jett",
      abilitySlot: "Passive",
    });
    expect(allowed.page).toEqual([]);
    await expect(
      t.query(api.lineups.listPublicFeedPage, {
        paginationOpts,
        agentSlug: "killjoy",
        abilitySlot: "Passive",
      }),
    ).rejects.toThrow("does not belong");
    await expect(
      t.query(api.lineups.listPublicFeedPage, {
        paginationOpts,
        agentSlug: "killjoy",
        abilitySlot: "unspecified",
      }),
    ).rejects.toThrow("does not belong");
  });
});
