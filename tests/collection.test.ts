import type { FunctionReturnType } from "convex/server";
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");
describe("collection contracts", () => {
  it("paginates beyond the old 200-row limit and computes edit rights on the server", async () => {
    const t = convexTest(schema, modules);
    const owner = "https://test|alice";
    await t.run(async (ctx) => {
      for (let index = 0; index < 205; index++) {
        await ctx.db.insert("lineups", {
          ownerTokenIdentifier: owner,
          mapSlug: "ascent",
          agentSlug: "sova",
          title: `Setup ${index}`,
          abilityType: "recon",
          imageUrl: "https://cdn.sanity.io/test.png",
          isPublic: true,
          createdAt: index,
          updatedAt: index,
        });
      }
    });
    const alice = t.withIdentity({ subject: "alice", tokenIdentifier: owner });
    let cursor: string | null = null;
    let total = 0;
    let done = false;
    while (!done) {
      const page: FunctionReturnType<
        typeof api.lineups.listPublicByMapAgentPage
      > = await alice.query(api.lineups.listPublicByMapAgentPage, {
        mapSlug: "ascent",
        agentSlug: "sova",
        paginationOpts: { numItems: 50, cursor },
      });
      expect(page.page.every((row) => row.canEdit)).toBe(true);
      total += page.page.length;
      cursor = page.continueCursor;
      done = page.isDone;
    }
    expect(total).toBe(205);
    const guestPage = await t.query(api.lineups.listPublicByMapAgentPage, {
      mapSlug: "ascent",
      agentSlug: "sova",
      paginationOpts: { numItems: 50, cursor: null },
    });
    expect(guestPage.page.every((row) => !row.canEdit)).toBe(true);
    const bob = t.withIdentity({ subject: "bob" });
    expect(
      (
        await bob.query(api.lineups.listOwnedByMapAgentPage, {
          mapSlug: "ascent",
          agentSlug: "sova",
          paginationOpts: { numItems: 50, cursor: null },
        })
      ).page,
    ).toEqual([]);
  });

  it("preserves real notes when hiding/restoring an agent and reads legacy visibility", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity({
      subject: "alice",
      tokenIdentifier: "https://test|alice",
    });
    const args = { mapSlug: "ascent", agentSlug: "sova" };
    await alice.mutation(api.mapRoster.upsert, {
      ...args,
      notes: "Use recon first",
    });
    await alice.mutation(api.mapRoster.upsert, { ...args, hidden: true });
    let rows = await alice.query(api.mapRoster.listByMap, {
      mapSlug: "ascent",
    });
    expect(rows[0]).toMatchObject({ hidden: true, notes: "Use recon first" });
    await alice.mutation(api.mapRoster.upsert, { ...args, hidden: false });
    rows = await alice.query(api.mapRoster.listByMap, { mapSlug: "ascent" });
    expect(rows[0]).toMatchObject({ hidden: false, notes: "Use recon first" });
  });
});
