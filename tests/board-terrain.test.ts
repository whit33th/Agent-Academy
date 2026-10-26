import { describe, expect, it } from "vitest";
import { TerrainCollision, type CollisionTriangle } from "../lib/board/terrain";
const floor = (z: number, bodyId = "floor"): CollisionTriangle => ({
  a: { x: 0, y: 0, z },
  b: { x: 10, y: 0, z },
  c: { x: 0, y: 10, z },
  bodyId,
});
const query = { acceptsBody: () => true, doubleSided: true };
describe("exact terrain segment queries", () => {
  it("retains separate floors with identical radar coordinates", () => {
    const scene = new TerrainCollision([floor(0), floor(3, "upper")]);
    expect(
      scene
        .castSegment({ x: 2, y: 2, z: 5 }, { x: 2, y: 2, z: -1 }, query)
        .map((hit) => [hit.bodyId, hit.position.z]),
    ).toEqual([
      ["upper", 3],
      ["floor", 0],
    ]);
    expect(
      scene
        .castSegment({ x: 2, y: 2, z: 2 }, { x: 2, y: 2, z: -1 }, query)
        .map((hit) => hit.bodyId),
    ).toEqual(["floor"]);
  });
  it("does not fill empty map pixels, holes or the back side of one-sided geometry", () => {
    const scene = new TerrainCollision([floor(0)]);
    expect(
      scene.castSegment({ x: 9, y: 9, z: 1 }, { x: 9, y: 9, z: -1 }, query),
    ).toEqual([]);
    expect(
      scene.castSegment(
        { x: 2, y: 2, z: -1 },
        { x: 2, y: 2, z: 1 },
        { ...query, doubleSided: false },
      ),
    ).toEqual([]);
    expect(
      scene.castSegment(
        { x: 2, y: 2, z: 1 },
        { x: 2, y: 2, z: -1 },
        { ...query, doubleSided: false },
      ),
    ).toHaveLength(1);
  });
  it("honors the explicit native query predicate instead of treating all meshes as obstacles", () => {
    const scene = new TerrainCollision([floor(0), floor(3, "porous")]);
    expect(
      scene
        .castSegment(
          { x: 2, y: 2, z: 5 },
          { x: 2, y: 2, z: -1 },
          { ...query, acceptsBody: (id) => id !== "porous" },
        )
        .map((hit) => hit.bodyId),
    ).toEqual(["floor"]);
  });
  it("finds the actual slope intersection through a hierarchy and respects segment ends", () => {
    const slope = {
      a: { x: 0, y: 0, z: 0 },
      b: { x: 10, y: 0, z: 10 },
      c: { x: 0, y: 10, z: 0 },
      bodyId: "slope",
    };
    const scene = new TerrainCollision([
      ...Array.from({ length: 30 }, (_, index) => floor(-index - 10)),
      slope,
    ]);
    const hits = scene.castSegment(
      { x: 2, y: 2, z: 5 },
      { x: 2, y: 2, z: 0 },
      query,
    );
    expect(hits).toHaveLength(1);
    expect(hits[0].position.z).toBeCloseTo(2);
    expect(hits[0].normal.z).toBeCloseTo(Math.SQRT1_2);
    expect(
      scene.castSegment({ x: 2, y: 2, z: 5 }, { x: 2, y: 2, z: 3 }, query),
    ).toHaveLength(0);
  });
  it("rejects corrupt vertices and handles empty/degenerate surfaces", () => {
    expect(
      () => new TerrainCollision([{ ...floor(0), a: { x: NaN, y: 0, z: 0 } }]),
    ).toThrow();
    expect(
      new TerrainCollision([]).castSegment(
        { x: 0, y: 0, z: 1 },
        { x: 0, y: 0, z: 0 },
        query,
      ),
    ).toEqual([]);
    expect(
      new TerrainCollision([
        {
          a: { x: 0, y: 0, z: 0 },
          b: { x: 0, y: 0, z: 0 },
          c: { x: 0, y: 0, z: 0 },
          bodyId: "point",
        },
      ]).castSegment({ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }, query),
    ).toEqual([]);
  });
});
