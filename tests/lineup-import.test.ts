import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.ts");
const candidate = {
  sourceKey: "author-bind-setup-120",
  contentHash: "a".repeat(64),
  mapSlug: "bind",
  agentSlug: "killjoy",
  title: "A site utility setup",
  description:
    "Follow the demonstrated positions and deployment sequence at 2:00.",
  metadata: { side: "def", site: "A", abilitySlot: "Grenade" } as const,
  videoUrl: "https://youtu.be/jxejX5_VGFc?t=120",
  source: {
    url: "https://www.youtube.com/watch?v=jxejX5_VGFc",
    author: "Creator",
    checkedAt: Date.parse("2026-10-24T10:00:00Z"),
    patch: "13.08",
    evidence: "Reviewed the source footage against the current Bind layout",
    rightsBasis: "Official external embed; no media copied",
    testedInGame: false,
  },
};

describe("reviewed public library import", () => {
  it("repairs Tracker playback for existing copies without modifying those copies or exposing private players", async () => {
    const t = convexTest(schema, modules);
    const videoUrl =
      "https://tracker.gg/valorant/guides/clips/a-set-up-by-airtightriver41-3c3ef7b8";
    const tracker = {
      ...candidate,
      sourceKey: "tracker-player",
      videoUrl,
      source: { ...candidate.source, url: videoUrl },
    };
    await t.mutation(internal.lineupImport.publish, {
      batchId: "tracker-player",
      records: [tracker],
    });
    const [original] = await t.query(api.lineups.listPublicFeed, {});
    const alice = t.withIdentity({
      subject: "alice",
      tokenIdentifier: "alice",
    });
    const copy = await alice.mutation(api.lineups.forkPublic, {
      sourceId: original._id,
      mapSlug: "bind",
      agentSlug: "killjoy",
    });
    const source = {
      ...tracker.source,
      embedUrl:
        "https://iframe.videodelivery.net/68da8eba36d06f26503c9c3279a16893",
    };
    await t.mutation(internal.lineupImport.repairVideoEmbeds, {
      records: [
        { sourceKey: tracker.sourceKey, videoUrl, embedUrl: source.embedUrl },
      ],
    });
    expect(
      await t.query(api.lineups.resolveVideoEmbed, { videoUrl }),
    ).toContain("muted=true");
    expect((await t.run((ctx) => ctx.db.get(copy.id)))?.source).toEqual(
      tracker.source,
    );
    const bob = t.withIdentity({ subject: "bob", tokenIdentifier: "bob" });
    const second = await bob.mutation(api.lineups.forkPublic, {
      sourceId: original._id,
      mapSlug: "bind",
      agentSlug: "killjoy",
    });
    expect(
      (await t.run((ctx) => ctx.db.get(second.id)))?.source?.embedUrl,
    ).toBe(source.embedUrl);
    const [repaired] = await t.query(api.lineups.listPublicFeed, {});
    expect(repaired.createdAt).toBe(original.createdAt);
    expect(repaired.description).toBe(original.description);
    await t.mutation(internal.lineupImport.withdrawBatch, {
      batchId: "tracker-player",
    });
    expect(
      await t.query(api.lineups.resolveVideoEmbed, { videoUrl }),
    ).toBeNull();
    expect(
      await t.query(api.lineups.resolveVideoEmbed, {
        videoUrl: "https://localhost/private",
      }),
    ).toBeNull();
    await expect(
      t.mutation(internal.lineupImport.repairVideoEmbeds, {
        records: [
          {
            sourceKey: tracker.sourceKey,
            videoUrl,
            embedUrl: "https://example.com/unsafe",
          },
        ],
      }),
    ).rejects.toThrow("verified Tracker");
  });
  it("previews without writes, resumes without duplicates, and withdraws only its managed originals", async () => {
    const t = convexTest(schema, modules);
    expect(
      await t.query(internal.lineupImport.preview, { records: [candidate] }),
    ).toEqual([{ sourceKey: candidate.sourceKey, status: "ready" }]);
    expect(await t.query(api.lineups.listPublicFeed, {})).toHaveLength(0);
    const input = { batchId: "qa-batch", records: [candidate] };
    await t.mutation(internal.lineupImport.publish, input);
    await t.mutation(internal.lineupImport.publish, input);
    await t.mutation(internal.lineupImport.publish, {
      ...input,
      records: [{ ...candidate, sourceKey: "different-id-same-content" }],
    });
    const [source] = await t.query(api.lineups.listPublicFeed, {});
    expect(source.videoUrl).toBe(
      "https://www.youtube.com/watch?v=jxejX5_VGFc&t=120",
    );
    const viewer = t.withIdentity({
      subject: "alice",
      tokenIdentifier: "alice",
    });
    const copy = await viewer.mutation(api.lineups.forkPublic, {
      sourceId: source._id,
      mapSlug: "bind",
      agentSlug: "killjoy",
    });
    await viewer.mutation(api.lineups.update, { id: copy.id, isPublic: true });
    const reviewed = {
      ...candidate,
      source: {
        ...candidate.source,
        evidence: "Additional current-version footage reviewed",
      },
    };
    expect(
      await t.mutation(internal.lineupImport.refreshReviews, {
        records: [reviewed],
      }),
    ).toEqual({ updated: 1 });
    expect(
      (await t.run((ctx) => ctx.db.get(source._id)))?.source?.evidence,
    ).toBe(reviewed.source.evidence);
    expect((await t.run((ctx) => ctx.db.get(copy.id)))?.source?.evidence).toBe(
      candidate.source.evidence,
    );
    const revised = {
      ...reviewed,
      description: "Useful placement instructions only.",
      contentHash: "e".repeat(64),
    };
    expect(
      await t.mutation(internal.lineupImport.refreshReviews, {
        records: [revised],
        refreshDescription: true,
      }),
    ).toEqual({ updated: 1 });
    expect((await t.run((ctx) => ctx.db.get(source._id)))?.description).toBe(
      revised.description,
    );
    expect((await t.run((ctx) => ctx.db.get(copy.id)))?.description).toBe(
      candidate.description,
    );
    expect(
      await t.query(internal.lineupImport.batchStatus, { batchId: "qa-batch" }),
    ).toMatchObject({ total: 1, published: 1, byAgent: { killjoy: 1 } });
    expect(
      await t.mutation(internal.lineupImport.withdrawBatch, {
        batchId: "qa-batch",
      }),
    ).toEqual({ withdrawn: 1 });
    expect(
      (await t.query(api.lineups.listPublicFeed, {})).map((row) => row._id),
    ).toEqual([copy.id]);
    expect((await t.run((ctx) => ctx.db.get(copy.id)))?.source).toEqual(
      candidate.source,
    );
  });
  it("rejects unsupported content and duplicate input before publication", async () => {
    const t = convexTest(schema, modules);
    const records = [
      { ...candidate, mapSlug: "ascent" },
      {
        ...candidate,
        sourceKey: "no-evidence",
        contentHash: "b".repeat(64),
        source: { ...candidate.source, evidence: "" },
      },
      {
        ...candidate,
        sourceKey: "no-media",
        contentHash: "c".repeat(64),
        videoUrl: undefined,
      },
      {
        ...candidate,
        sourceKey: "bad-date",
        contentHash: "d".repeat(64),
        source: { ...candidate.source, checkedAt: 1 },
      },
    ];
    expect(
      (await t.query(internal.lineupImport.preview, { records })).every(
        (row) => row.status === "rejected",
      ),
    ).toBe(true);
    expect(
      (
        await t.query(internal.lineupImport.preview, {
          records: [candidate, candidate],
        })
      )[1].reason,
    ).toBe("Duplicate within batch");
    expect(
      (
        await t.mutation(internal.lineupImport.publish, {
          batchId: "rejected",
          records,
        })
      ).every((row) => row.status === "rejected"),
    ).toBe(true);
    expect(await t.query(api.lineups.listPublicFeed, {})).toHaveLength(0);
    expect(
      await t.query(internal.lineupImport.batchStatus, { batchId: "rejected" }),
    ).toMatchObject({ total: 0 });
  });
});
