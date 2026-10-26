import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");
const base = {
  mapSlug: "bind",
  agentSlug: "killjoy",
  title: "Site setup",
  abilityType: "nanoswarm",
};
function fixture() {
  const t = convexTest(schema, modules);
  const alice = t.withIdentity({ subject: "alice", tokenIdentifier: "alice" });
  const bob = t.withIdentity({ subject: "bob", tokenIdentifier: "bob" });
  const image = () =>
    t.run(async (ctx) => {
      const storageId = await ctx.storage.store(
        new Blob(["image"], { type: "image/png" }),
      );
      await ctx.db.insert("uploads", {
        ownerTokenIdentifier: "alice",
        storageId,
        createdAt: 1,
      });
      return storageId;
    });
  return { t, alice, bob, image };
}

describe("ordered lineup galleries", () => {
  it("copies every photograph and protects shared files through reorder, discard and deletion", async () => {
    const { t, alice, bob, image } = fixture();
    const first = await image(),
      second = await image();
    const { id } = await alice.mutation(api.lineups.create, {
      ...base,
      isPublic: true,
      images: [
        {
          storageId: first,
          imageUrl: "https://example.com/temporary-storage-url",
          caption: "Stand here",
        },
        { storageId: second, caption: "Aim here" },
      ],
      coverIndex: 1,
    });
    const [published] = await t.query(api.lineups.listPublicFeed, {});
    expect(published.images?.map((x) => x.caption)).toEqual([
      "Stand here",
      "Aim here",
    ]);
    expect(published.coverIndex).toBe(1);
    expect(published.imageUrl).toBe(published.images?.[1].imageUrl);
    const storedImages = await t.run((ctx) =>
      ctx.db
        .query("lineupImages")
        .withIndex("by_lineupId_and_order", (q) => q.eq("lineupId", id))
        .take(10),
    );
    expect(storedImages.every((image) => image.imageUrl === undefined)).toBe(
      true,
    );
    const copy = await bob.mutation(api.lineups.forkPublic, {
      sourceId: id,
      mapSlug: base.mapSlug,
      agentSlug: base.agentSlug,
    });
    await alice.mutation(api.lineups.update, {
      id,
      images: [
        { storageId: second, caption: "New aim" },
        { storageId: first, caption: "New stand" },
      ],
      coverIndex: 0,
    });
    await alice.mutation(api.uploads.discard, { storageId: first });
    expect(await t.run((ctx) => ctx.storage.getUrl(first))).toBeTruthy();
    await alice.mutation(api.lineups.remove, { id });
    const [copied] = await bob.query(api.lineups.listByMapAgent, {
      mapSlug: base.mapSlug,
      agentSlug: base.agentSlug,
    });
    expect(copied.images?.map((x) => x.caption)).toEqual([
      "Stand here",
      "Aim here",
    ]);
    await bob.mutation(api.lineups.update, {
      id: copy.id,
      images: [{ storageId: second, caption: "Retained shared image" }],
    });
    expect(await t.run((ctx) => ctx.storage.getUrl(first))).toBeNull();
    expect(await t.run((ctx) => ctx.storage.getUrl(second))).toBeTruthy();
    await bob.mutation(api.lineups.remove, { id: copy.id });
    expect(await t.run((ctx) => ctx.storage.getUrl(second))).toBeNull();
  });

  it("denies guests and foreign files, validates the gallery bound, and supports old single-image clients", async () => {
    const { t, alice, bob, image } = fixture();
    const first = await image(),
      second = await image();
    const args = { ...base, images: [{ storageId: first, caption: "A" }] };
    await expect(t.mutation(api.lineups.create, args)).rejects.toThrow(
      "Unauthorized",
    );
    await expect(bob.mutation(api.lineups.create, args)).rejects.toThrow(
      "Forbidden image",
    );
    await expect(
      alice.mutation(api.lineups.create, {
        ...args,
        images: Array.from({ length: 11 }, () => args.images[0]),
      }),
    ).rejects.toThrow("at most 10");
    const { id } = await alice.mutation(api.lineups.create, {
      ...base,
      images: [
        { storageId: first, caption: "A" },
        { storageId: second, caption: "B" },
      ],
    });
    await expect(
      bob.mutation(api.lineups.update, { id, coverIndex: 1 }),
    ).rejects.toThrow("Forbidden");
    await expect(
      alice.mutation(api.lineups.update, { id, coverIndex: 4 }),
    ).rejects.toThrow("Invalid cover");
    await alice.mutation(api.lineups.update, { id, storageId: first });
    const [row] = await alice.query(api.lineups.listByMapAgent, {
      mapSlug: base.mapSlug,
      agentSlug: base.agentSlug,
    });
    expect(row.images).toHaveLength(1);
    expect(row.images?.[0].storageId).toBe(first);
    expect(await t.run((ctx) => ctx.storage.getUrl(second))).toBeNull();
    await alice.mutation(api.lineups.remove, { id });
    expect(await t.run((ctx) => ctx.storage.getUrl(first))).toBeNull();
  });

  it("supports safe external video links and rejects empty or unsafe media", async () => {
    const { alice } = fixture();
    await expect(
      alice.mutation(api.lineups.create, { ...base, images: [] }),
    ).rejects.toThrow("Choose an image");
    await expect(
      alice.mutation(api.lineups.create, {
        ...base,
        videoUrl: "http://localhost/video",
      }),
    ).rejects.toThrow("public HTTPS video URL");
    const external = await alice.mutation(api.lineups.create, {
      ...base,
      videoUrl: "https://example.com/video",
    });
    const { id } = await alice.mutation(api.lineups.create, {
      ...base,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30",
    });
    const rows = await alice.query(api.lineups.listByMapAgent, {
      mapSlug: base.mapSlug,
      agentSlug: base.agentSlug,
    });
    const youtubeRow = rows.find((row) => row._id === id);
    const externalRow = rows.find((row) => row._id === external.id);
    expect(youtubeRow?.images).toEqual([]);
    expect(youtubeRow?.videoUrl).toContain("dQw4w9WgXcQ");
    expect(externalRow?.videoUrl).toBe("https://example.com/video");
    await expect(
      alice.mutation(api.lineups.update, { id, videoUrl: "" }),
    ).rejects.toThrow("Choose an image");
    await alice.mutation(api.lineups.remove, { id: external.id });
  });

  it("preserves provenance but drops importer identity from personal copies; legacy references prevent deletion", async () => {
    const { t, alice, bob, image } = fixture();
    const first = await image(),
      second = await image();
    const source = {
      url: "https://example.com/setup",
      author: "Author",
      checkedAt: 1,
      patch: "13.08",
      evidence: "Checked layout",
      rightsBasis: "Permission",
      testedInGame: false,
    };
    const id = await t.run((ctx) =>
      ctx.db.insert("lineups", {
        ...base,
        ownerTokenIdentifier: "alice",
        imageUrl: "",
        storageId: first,
        isPublic: true,
        createdAt: 1,
        updatedAt: 1,
        source,
        sourceKey: "key",
        contentHash: "hash",
        importBatchId: "batch",
      }),
    );
    const copy = await bob.mutation(api.lineups.forkPublic, {
      sourceId: id,
      mapSlug: base.mapSlug,
      agentSlug: base.agentSlug,
    });
    await bob.mutation(api.lineups.remove, { id: copy.id });
    expect(await t.run((ctx) => ctx.storage.getUrl(first))).toBeTruthy();
    const copy2 = await bob.mutation(api.lineups.forkPublic, {
      sourceId: id,
      mapSlug: base.mapSlug,
      agentSlug: base.agentSlug,
    });
    const stored = await t.run((ctx) => ctx.db.get(copy2.id));
    expect(stored?.source).toEqual(source);
    expect(stored?.sourceKey).toBeUndefined();
    expect(stored?.contentHash).toBeUndefined();
    expect(stored?.importBatchId).toBeUndefined();
    await alice.mutation(api.lineups.update, { id, storageId: second });
    expect(await t.run((ctx) => ctx.storage.getUrl(first))).toBeTruthy();
    await bob.mutation(api.lineups.remove, { id: copy2.id });
    expect(await t.run((ctx) => ctx.storage.getUrl(first))).toBeNull();
  });
});
