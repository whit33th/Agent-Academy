import { describe, expect, it } from "vitest";
import { access } from "node:fs/promises";
import path from "node:path";
import { findAgent, findMap, getAgents, getMaps } from "../lib/catalog/catalog";
import { loadSharedBoard } from "../components/tactical-board/serialization";
import { boardDestination, createBoardLink } from "../lib/desktop/board-links";

describe("bundled catalog", () => {
  it("resolves legacy slugs/UUIDs and ships every referenced image and voice file locally", async () => {
    expect(findAgent("kay-o")?.name).toBe("KAY/O");
    expect(findMap("Ascent")?._id).toBe("ascent");
    const agents = getAgents();
    const maps = getMaps();
    expect(agents.length).toBeGreaterThan(20);
    expect(new Set(agents.map((agent) => agent._id)).size).toBe(agents.length);
    for (const agent of agents) expect(findAgent(agent._id)).toBe(agent);
    const images = [
      ...agents.flatMap((agent) => [
        agent.imageUrl,
        agent.displayIcon,
        agent.background,
        agent.artBackground,
        agent.roleIcon,
        agent.voiceLineUrl,
        ...agent.abilities.map((ability) => ability.displayIcon),
      ]),
      ...maps.flatMap((map) => [map.imageUrl, map.displayIcon]),
    ].filter((src): src is string => Boolean(src));
    expect(images.every((src) => src.startsWith("/"))).toBe(true);
    await Promise.all(
      images.map((src) => access(path.join(process.cwd(), "public", src))),
    );
  });
});

describe("board and lineup input", () => {
  it("routes only supported desktop board links and rejects foreign or oversized destinations", () => {
    const payload = btoa(
      JSON.stringify({ strokes: [], placedAgents: [], placedAbilities: [] }),
    );
    expect(boardDestination(createBoardLink("ascent", payload))).toBe(
      `/ascent?${new URLSearchParams({ strat: payload })}`,
    );
    expect(
      boardDestination(`https://evil.example/ascent?strat=${payload}`),
    ).toBeNull();
    expect(
      boardDestination(`agent-academy://board/unknown?strat=${payload}`),
    ).toBeNull();
    expect(() => createBoardLink("ascent", "x".repeat(24001))).toThrow();
  });
  it("rejects malformed, oversized and invalid shared board geometry", () => {
    const empty = { strokes: [], placedAgents: [], placedAbilities: [] };
    expect(loadSharedBoard("not-json")).toEqual(empty);
    expect(loadSharedBoard("x".repeat(256 * 1024 + 1))).toEqual(empty);
    expect(
      loadSharedBoard(
        btoa(
          JSON.stringify({
            ...empty,
            strokes: [
              {
                id: "bad",
                type: "pen",
                color: "#ffffff",
                width: 4,
                points: [{ x: 4, y: 0 }],
              },
            ],
          }),
        ),
      ),
    ).toEqual(empty);
    const valid = {
      ...empty,
      strokes: [
        {
          id: "a",
          type: "pen",
          color: "#ffffff",
          width: 4,
          points: [{ x: 0.5, y: 0.5 }],
        },
      ],
    };
    expect(loadSharedBoard(btoa(JSON.stringify(valid)))).toEqual(valid);
  });
});
