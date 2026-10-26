import { describe, expect, it } from "vitest";
import {
  getYouTubeEmbedUrl,
  normalizeVideoUrl,
  isSafeSourceUrl,
} from "../lib/lineups/media";
import { validateImportCandidate } from "../lib/lineups/import-policy";
import { isLineupRows } from "../lib/collection/useLineups";

describe("lineup external media", () => {
  it("restores legacy and gallery caches while refusing malformed media and provenance", () => {
    const row = {
      _id: "lineup",
      _creationTime: 1,
      ownerTokenIdentifier: "owner",
      title: "Setup",
      imageUrl: "https://example.com/cover.png",
      mapSlug: "bind",
      agentSlug: "killjoy",
      abilityType: "other",
      createdAt: 1,
      updatedAt: 1,
      isPublic: true,
    };
    expect(isLineupRows([row])).toBe(true);
    const gallery = {
      ...row,
      images: [{ imageUrl: "https://example.com/image.png", caption: "Step" }],
      coverIndex: 0,
      videoUrl: "https://youtu.be/jxejX5_VGFc",
    };
    expect(isLineupRows([gallery])).toBe(true);
    expect(isLineupRows([{ ...gallery, coverIndex: 2 }])).toBe(false);
    expect(
      isLineupRows([
        {
          ...gallery,
          images: [{ imageUrl: "javascript:alert(1)", caption: "Step" }],
        },
      ]),
    ).toBe(false);
    expect(
      isLineupRows([
        {
          ...gallery,
          source: { url: "https://example.com", checkedAt: Infinity },
        },
      ]),
    ).toBe(false);
    expect(
      isLineupRows([{ ...gallery, videoUrl: "http://localhost/private" }]),
    ).toBe(false);
  });
  it("canonicalizes only actual video links and carries chapter times into privacy-enhanced embeds", () => {
    expect(normalizeVideoUrl("https://youtu.be/jxejX5_VGFc?t=1m20s")).toBe(
      "https://www.youtube.com/watch?v=jxejX5_VGFc&t=80",
    );
    expect(
      getYouTubeEmbedUrl("https://www.youtube.com/watch?v=jxejX5_VGFc&t=80"),
    ).toBe("https://www.youtube-nocookie.com/embed/jxejX5_VGFc?rel=0&start=80");
    expect(getYouTubeEmbedUrl("https://example.com/watch")).toBeNull();
    expect(() => normalizeVideoUrl("https://youtube.com/@creator")).toThrow();
    expect(isSafeSourceUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeSourceUrl("https://127.0.0.1/video")).toBe(false);
    expect(isSafeSourceUrl("https://localhost/video")).toBe(false);
    expect(isSafeSourceUrl("https://user:password@example.com/")).toBe(false);
  });
  it("rejects invalid maps and unreviewed metadata before publication", () => {
    const record = {
      sourceKey: "creator-guide-bind-a",
      contentHash: "a".repeat(64),
      mapSlug: "bind",
      agentSlug: "killjoy",
      title: "A site setup",
      description: "Follow the creator's demonstrated placement sequence.",
      metadata: { side: "def", site: "A", abilitySlot: "Grenade" } as const,
      source: {
        url: "https://www.youtube.com/watch?v=jxejX5_VGFc",
        author: "Creator",
        checkedAt: Date.parse("2026-10-24T10:00:00Z"),
        patch: "13.08",
        evidence: "Reviewed geometry and demonstrated ability",
        rightsBasis: "External embed only",
        testedInGame: false,
      },
    };
    expect(() => validateImportCandidate(record)).not.toThrow();
    expect(() =>
      validateImportCandidate({ ...record, mapSlug: "ascent" }),
    ).toThrow("rotation");
    expect(() =>
      validateImportCandidate({
        ...record,
        source: { ...record.source, patch: "12.00" },
      }),
    ).toThrow("baseline");
    expect(() =>
      validateImportCandidate({
        ...record,
        source: {
          ...record.source,
          url: "https://strats.gg/valorant/lineups/x",
        },
      }),
    ).toThrow("excluded");
  });
});
