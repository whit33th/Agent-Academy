import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.ts");
describe("trusted collection ownership", () => {
  it("denies guest writes, foreign images, private reads, updates and deletes; copies public images safely", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity({ subject: "alice", issuer: "https://test", tokenIdentifier: "https://test|alice" });
    const bob = t.withIdentity({ subject: "bob", issuer: "https://test", tokenIdentifier: "https://test|bob" });
    const storageId = await t.run(async ctx => {
      const id = await ctx.storage.store(new Blob(["test-image"], { type: "image/png" }));
      await ctx.db.insert("uploads", { storageId: id, ownerTokenIdentifier: "https://test|alice", createdAt: Date.now() }); return id;
    });
    const args = { mapSlug: "ascent", agentSlug: "sova", title: "QA setup", abilityType: "recon", storageId };
    await expect(t.mutation(api.lineups.create, args)).rejects.toThrow("Unauthorized");
    await expect(bob.mutation(api.lineups.create, args)).rejects.toThrow("Forbidden image");
    const { id } = await alice.mutation(api.lineups.create, args);
    expect(await bob.query(api.lineups.listByMapAgent, { mapSlug: "ascent", agentSlug: "sova" })).toEqual([]);
    await expect(bob.mutation(api.lineups.update, { id, title: "stolen" })).rejects.toThrow("Forbidden");
    await expect(bob.mutation(api.lineups.remove, { id })).rejects.toThrow("Forbidden");
    await expect(bob.mutation(api.lineups.forkPublic, { sourceId: id, mapSlug: "ascent", agentSlug: "sova" })).rejects.toThrow("Forbidden");
    await alice.mutation(api.lineups.update, { id, isPublic: true });
    expect(await t.query(api.lineups.listPublicFeed, {})).toHaveLength(1);
    const copy = await bob.mutation(api.lineups.forkPublic, { sourceId: id, mapSlug: "ascent", agentSlug: "sova" });
    await alice.mutation(api.lineups.remove, { id });
    expect(await t.run(ctx => ctx.storage.getUrl(storageId))).toBeTruthy();
    const bobRows = await bob.query(api.lineups.listByMapAgent, { mapSlug: "ascent", agentSlug: "sova" });
    expect(bobRows).toHaveLength(1); expect(bobRows[0].isPublic).toBe(false);
    await bob.mutation(api.lineups.remove, { id: copy.id });
    expect(await t.run(ctx => ctx.storage.getUrl(storageId))).toBeNull();
  });
  it("isolates personal maps/rosters and restricts shared catalog changes", async () => {
    const t = convexTest(schema, modules); const alice = t.withIdentity({ subject: "alice" }); const bob = t.withIdentity({ subject: "bob" });
    await alice.mutation(api.mapRoster.upsert, { mapSlug: "ascent", agentSlug: "sova", viability: "S" });
    expect(await bob.query(api.mapRoster.listByMap, { mapSlug: "ascent" })).toEqual([]);
    await alice.mutation(api.maps.setPreference, { mapSlug: "ascent", hidden: true });
    expect(await bob.query(api.maps.preferences, {})).toEqual([]);
    await expect(bob.mutation(api.maps.upsert, { slug: "ascent" })).rejects.toThrow("Project owner required");
  });
});
