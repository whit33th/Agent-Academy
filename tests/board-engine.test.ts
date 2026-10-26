import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAgents, getMaps } from "../lib/catalog/catalog";
import { abilityDefinitions, boardMaps, emptyBoard } from "../lib/board/data";
import * as boardData from "../lib/board/data";
import { BOARD_MAP_IDS, supportsBoard } from "../lib/board/supported-maps";
import { BoardController } from "../lib/board/controller";
import { BoardStore } from "../lib/board/store";
import {
  abilityPrimitives,
  hitAbility,
  pathLength,
  simplifyRoute,
} from "../lib/board/geometry";
import { clientToMap, mapToWorld, worldToMap } from "../lib/board/projection";
import {
  encodeBoardDocument,
  loadBoardDocument,
} from "../lib/board/serialization";
import {
  ACTIVE_SLOTS,
  BOARD_LIMITS,
  type AbilityInstance,
  type Point,
} from "../lib/board/types";

const map = boardMaps.find((map) => map.mapId === "ascent")!;
const definition = (slug: string, slot: string) =>
  abilityDefinitions.find(
    (item) => item.agentSlug === slug && item.slot === slot,
  )!;
function editor() {
  const store = new BoardStore(emptyBoard(map.mapId));
  const controller = new BoardController(store, map);
  controller.setViewport({
    left: 10,
    top: 20,
    width: map.metersWide * 5,
    height: map.metersHigh * 5,
  });
  return { store, controller };
}
const pointer = (x: number, y: number, pointerId = 1) => ({
  clientX: x * 5 + 10,
  clientY: y * 5 + 20,
  pointerId,
  button: 0,
});
const ability = (
  slug: string,
  slot: string,
  position: Point = { x: 40, y: 40 },
): AbilityInstance => {
  const spec = definition(slug, slot);
  return {
    id: `${slug}:${slot}`,
    kind: "ability",
    definitionId: spec.id,
    mode: spec.modes[0].id,
    rotation: 0,
    position,
    points: [],
  };
};

beforeEach(() => {
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn(() => 1),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Board coverage and common projection", () => {
  it("has exactly four active slots per current agent and excludes only nonstandard maps", () => {
    expect(abilityDefinitions).toHaveLength(116);
    expect(getAgents()).toHaveLength(29);
    expect(boardMaps.map((map) => map.mapId).sort()).toEqual(
      [...BOARD_MAP_IDS].sort(),
    );
    for (const agent of getAgents()) {
      expect(
        abilityDefinitions
          .filter((definition) => definition.agentId === agent._id)
          .map((definition) => definition.slot)
          .sort(),
      ).toEqual([...ACTIVE_SLOTS].sort());
    }
    expect(getMaps().filter((map) => !supportsBoard(map._id))).toHaveLength(6);
    for (const spec of abilityDefinitions)
      for (const evidence of Object.values(spec.evidence)) {
        expect(evidence.sourceBuild).toBe(map.gameBuild);
        expect(Number.isFinite(evidence.value)).toBe(true);
      }
  });
  it.each(boardMaps)(
    "round-trips world coordinates on $mapId without changing physical distances",
    (calibration) => {
      const origin = { x: 12.345, y: -47.89 };
      const projected = worldToMap(origin, calibration);
      expect(mapToWorld(projected, calibration).x).toBeCloseTo(origin.x, 9);
      expect(mapToWorld(projected, calibration).y).toBeCloseTo(origin.y, 9);
      const second = worldToMap({ x: origin.x + 10, y: origin.y }, calibration);
      expect(
        Math.hypot(second.x - projected.x, second.y - projected.y),
      ).toBeCloseTo(10, 5);
      expect(
        clientToMap(
          { x: 410, y: 220 },
          { left: 10, top: 20, width: 800, height: 400 },
          calibration,
        ),
      ).toEqual({
        x: calibration.metersWide / 2,
        y: calibration.metersHigh / 2,
      });
    },
  );
});

describe("completed gestures and shared history", () => {
  it("edits several routes within one cast and includes all routes in history and links", () => {
    const original = boardData.getAbilityDefinition;
    const base = definition("skye", "Ultimate");
    const spec = {
      ...base,
      modes: [
        { ...base.modes[0], geometry: { kind: "path" as const, maxRoutes: 3 } },
      ],
    };
    vi.spyOn(boardData, "getAbilityDefinition").mockImplementation((id) =>
      id === spec.id ? spec : original(id),
    );
    const { controller, store } = editor();
    const seeker = {
      ...ability("skye", "Ultimate"),
      points: [{ x: 50, y: 40 }],
    };
    store.add(seeker);
    controller.addRoute(seeker.id);
    controller.pointerMove(pointer(40, 50));
    expect(store.getObject(seeker.id)).toBe(seeker);
    controller.pointerDown(pointer(40, 50));
    controller.pointerMove(pointer(45, 60));
    controller.pointerUp(pointer(45, 60));
    expect(store.getSnapshot().objects).toHaveLength(1);
    expect(
      (store.getObject(seeker.id) as AbilityInstance).routes![0].at(-1),
    ).toEqual({ x: 45, y: 60 });
    controller.undo();
    expect(store.getObject(seeker.id)).toBe(seeker);
    controller.redo();
    controller.pointerDown(pointer(47, 63), seeker.id, "route:0:1");
    controller.pointerUp(pointer(49, 64));
    expect(
      (store.getObject(seeker.id) as AbilityInstance).routes![0][1],
    ).toEqual({ x: 47, y: 61 });
    expect(
      loadBoardDocument(encodeBoardDocument(store.getSnapshot()), map.mapId),
    ).toEqual(store.getSnapshot());
    controller.addRoute(seeker.id);
    controller.pointerDown(pointer(20, 50));
    controller.pointerUp(pointer(20, 50));
    controller.addRoute(seeker.id);
    expect(controller.getPreview()).toBeNull();
    expect((store.getObject(seeker.id) as AbilityInstance).routes).toHaveLength(
      2,
    );
    controller.removeRoute(seeker.id);
    expect((store.getObject(seeker.id) as AbilityInstance).routes).toHaveLength(
      1,
    );
  });
  it("keeps dense routes editable and shareable, preserving both endpoints", () => {
    const { store, controller } = editor();
    const spec = abilityDefinitions.find(
      (item) =>
        item.modes[0].geometry.kind === "path" &&
        item.modes[0].geometry.maxLength === undefined,
    )!;
    controller.armAbility(spec.id);
    controller.pointerDown(pointer(20, 20));
    for (let i = 1; i <= 400; i++)
      controller.pointerMove(pointer(20 + i / 5, 20 + Math.sin(i / 5)));
    controller.pointerUp(pointer(100, 20 + Math.sin(80)));
    const object = store.getSnapshot().objects[0] as AbilityInstance;
    expect(object.position).toEqual({ x: 20, y: 20 });
    expect(object.points.length).toBeLessThanOrEqual(BOARD_LIMITS.routePoints);
    expect(object.points.at(-1)!.x).toBeCloseTo(100);
    expect(
      loadBoardDocument(encodeBoardDocument(store.getSnapshot()), map.mapId),
    ).toEqual(store.getSnapshot());
    controller.undo();
    expect(store.getSnapshot().objects).toHaveLength(0);
    expect(
      simplifyRoute(
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 2, y: 3 },
          { x: 3, y: 0 },
        ],
        3,
      ),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 3 },
      { x: 3, y: 0 },
    ]);
  });
  it("selects compound wall surfaces and the effect at a route endpoint", () => {
    const object = ability("iso", "Ability2");
    const spec = {
      ...definition("iso", "Ability2"),
      modes: [
        {
          id: object.mode,
          label: "Wall",
          geometry: {
            kind: "compound-wall" as const,
            polygons: [
              [
                { x: 2, y: -2 },
                { x: 4, y: 0 },
                { x: 2, y: 2 },
              ],
            ],
          },
        },
      ],
    };
    expect(hitAbility(object, spec, { x: 43, y: 40 }, 0.1)).toBe(true);
    expect(hitAbility(object, spec, { x: 45, y: 40 }, 0.1)).toBe(false);
    const routed = { ...object, points: [{ x: 60, y: 40 }] };
    const pathSpec = {
      ...spec,
      modes: [
        {
          id: object.mode,
          label: "Path",
          geometry: { kind: "path" as const, radius: 3 },
        },
      ],
    };
    expect(hitAbility(routed, pathSpec, { x: 60, y: 42 }, 0.1)).toBe(true);
  });
  it("rotates the Killjoy turret around its own anchor and keeps detection separate from owner range", () => {
    const { store, controller } = editor();
    const turret = ability("killjoy", "Ability2");
    store.add(turret);
    controller.pointerDown(pointer(50, 40), turret.id, "rotate");
    controller.pointerMove(pointer(40, 50));
    expect(store.getObject(turret.id)).toBe(turret);
    expect(controller.getPreview()).toMatchObject({
      position: turret.position,
      rotation: 90,
    });
    controller.pointerUp(pointer(40, 50));
    expect(store.getObject(turret.id)).toMatchObject({
      position: turret.position,
      rotation: 90,
    });
    const spec = definition("killjoy", "Ability2");
    expect(spec.modes[0].geometry).toEqual({
      kind: "sector",
      radius: 200,
      angle: 100,
    });
    expect(spec.ownerActivationRadius).toBe(40);
    controller.undo();
    expect(store.getObject(turret.id)).toBe(turret);
    controller.redo();
    expect(store.getObject(turret.id)).toMatchObject({ rotation: 90 });
  });
  it("keeps the grab offset and cancels a move without creating history", () => {
    const { store, controller } = editor();
    const object = ability("viper", "Ability2");
    store.add(object);
    controller.pointerDown(pointer(42, 43), object.id);
    controller.pointerMove(pointer(52, 48));
    expect((controller.getPreview() as AbilityInstance).position.x).toBeCloseTo(
      50,
    );
    expect((controller.getPreview() as AbilityInstance).position.y).toBeCloseTo(
      45,
    );
    controller.cancel();
    expect(store.getObject(object.id)).toBe(object);
    controller.undo();
    expect(store.getSnapshot().objects).toHaveLength(0);
  });
  it.each(["click", "drag"])(
    "places Viper wall from its beginning using %s placement",
    (gesture) => {
      const { store, controller } = editor();
      controller.armAbility(definition("viper", "Ability2").id);
      controller.pointerDown(pointer(140, 50));
      if (gesture === "click") {
        controller.pointerUp(pointer(140, 50));
        controller.pointerMove(pointer(150, 50));
        expect(store.getSnapshot().objects).toHaveLength(0);
        controller.pointerDown(pointer(150, 50));
      } else controller.pointerUp(pointer(150, 50));
      const object = store.getSnapshot().objects[0] as AbilityInstance;
      expect(object.position).toEqual({ x: 140, y: 50 });
      const shape = abilityPrimitives(
        object,
        definition("viper", "Ability2"),
        map,
      )[0];
      expect(shape.path).toBe("M140 50 L200 50"); // End remains outside the radar, clipped only by rendering.
      controller.undo();
      expect(store.getSnapshot().objects).toHaveLength(0);
      controller.redo();
      expect(store.getSnapshot().objects).toHaveLength(1);
    },
  );
  it("adds/removes Omen's optional source within one ability and edits it independently", () => {
    const { store, controller } = editor();
    const object = ability("omen", "Ultimate");
    store.add(object);
    expect(object.source).toBeUndefined();
    controller.toggleSource(object.id);
    controller.pointerDown(pointer(20, 30));
    expect(store.getObject(object.id)).toMatchObject({
      position: object.position,
      source: { x: 20, y: 30 },
    });
    controller.pointerDown(pointer(20, 30), object.id, "source");
    controller.pointerUp(pointer(25, 35));
    expect(store.getObject(object.id)).toMatchObject({
      position: object.position,
      source: { x: 25, y: 35 },
    });
    controller.toggleSource(object.id);
    expect(
      (store.getObject(object.id) as AbilityInstance).source,
    ).toBeUndefined();
    controller.undo();
    expect(store.getObject(object.id)).toMatchObject({
      source: { x: 25, y: 35 },
    });
    controller.pointerDown(pointer(40, 40), object.id, "destination");
    controller.pointerUp(pointer(50, 50));
    expect(store.getObject(object.id)).toMatchObject({
      position: { x: 50, y: 50 },
      source: { x: 25, y: 35 },
    });
    expect(store.getSnapshot().objects).toHaveLength(1);
  });
  it("edits additional Tejo targets after changing mode, with independent undo", () => {
    const { store, controller } = editor();
    const object = ability("tejo", "Ability2");
    store.add(object);
    controller.setMode(object.id, "double");
    controller.addTarget(object.id);
    controller.pointerDown(pointer(60, 70));
    expect(store.getObject(object.id)).toMatchObject({
      position: object.position,
      points: [{ x: 60, y: 70 }],
    });
    controller.undo();
    expect(store.getObject(object.id)).toMatchObject({
      mode: "double",
      points: [],
    });
    controller.undo();
    expect(store.getObject(object.id)).toBe(object);
  });
  it("coalesces pen samples into one history entry without rewriting its point buffer", () => {
    const { store, controller } = editor();
    controller.pointerDown(pointer(10, 10));
    controller.pointerMove(pointer(11, 11));
    const points = (controller.getPreview() as { points: readonly Point[] })
      .points;
    controller.pointerMove({
      ...pointer(13, 13),
      getCoalescedEvents: () =>
        [pointer(12, 12), pointer(13, 13)] as PointerEvent[],
    });
    expect(
      (controller.getPreview() as { points: readonly Point[] }).points,
    ).toBe(points);
    controller.pointerUp(pointer(13, 13));
    expect(store.getSnapshot().objects).toHaveLength(1);
    expect(
      (store.getSnapshot().objects[0] as { points: readonly Point[] }).points,
    ).toHaveLength(4);
    controller.undo();
    expect(store.getSnapshot().objects).toHaveLength(0);
    controller.redo();
    expect(store.getSnapshot().objects).toHaveLength(1);
    controller.setTool("eraser");
    controller.pointerDown(pointer(10, 10));
    controller.pointerUp(pointer(11, 11));
    controller.reset();
    expect(store.getSnapshot().objects).toHaveLength(0);
    controller.undo();
    expect(store.getSnapshot().objects).toHaveLength(2);
    controller.undo();
    expect(store.getSnapshot().objects).toHaveLength(1);
  });
  it.each(abilityDefinitions)(
    "can place, move, undo, delete and reopen $agentSlug:$slot",
    (spec) => {
      const { store, controller } = editor();
      controller.armAbility(spec.id);
      controller.pointerDown(pointer(40, 40));
      controller.pointerUp(pointer(50, 45));
      let object = store.getSnapshot().objects[0] as AbilityInstance;
      expect(object).toBeDefined();
      controller.pointerDown(pointer(41, 41), object.id);
      controller.pointerUp(pointer(46, 46));
      object = store.getSnapshot().objects[0] as AbilityInstance;
      expect(object.position).toEqual({ x: 45, y: 45 });
      expect(
        loadBoardDocument(encodeBoardDocument(store.getSnapshot()), map.mapId),
      ).toEqual(store.getSnapshot());
      if (
        spec.modes[0].geometry.kind === "path" &&
        spec.modes[0].geometry.maxLength !== undefined
      )
        expect(
          pathLength([object.position, ...object.points]),
        ).toBeLessThanOrEqual(spec.modes[0].geometry.maxLength + 1e-5);
      controller.remove(object.id);
      expect(store.getSnapshot().objects).toHaveLength(0);
      controller.undo();
      expect(store.getSnapshot().objects).toHaveLength(1);
    },
  );
});

describe("input migration and isolation", () => {
  it("migrates positions but ignores legacy radius and external image URLs", () => {
    const doc = loadBoardDocument(
      btoa(
        JSON.stringify({
          strokes: [],
          placedAgents: [],
          placedAbilities: [
            {
              id: "a",
              agentName: "Killjoy",
              abilityName: "TURRET",
              x: 0.5,
              y: 0.5,
              rotation: 45,
              radius: 99999,
              icon: "https://evil.example",
            },
          ],
        }),
      ),
      "ascent",
    );
    expect(doc.objects[0]).toMatchObject({
      definitionId: definition("killjoy", "Ability2").id,
      position: { x: map.metersWide / 2, y: map.metersHigh / 2 },
    });
    expect(doc.objects[0]).not.toHaveProperty("radius");
    expect(doc.objects[0]).not.toHaveProperty("icon");
    expect(() => loadBoardDocument(encodeBoardDocument(doc), "bind")).toThrow();
  });
  it("notifies only the edited object and preserves the structure snapshot during a move", () => {
    const { store } = editor();
    const a = ability("omen", "Ultimate"),
      b = ability("viper", "Ability2");
    store.add(a);
    store.add(b);
    const ids = store.getIds();
    const first = vi.fn(),
      second = vi.fn(),
      structure = vi.fn();
    store.subscribeObject(a.id, first);
    store.subscribeObject(b.id, second);
    store.subscribeStructure(structure);
    store.replace({ ...a, rotation: 5 });
    expect(first).toHaveBeenCalledOnce();
    expect(second).not.toHaveBeenCalled();
    expect(structure).not.toHaveBeenCalled();
    expect(store.getIds()).toBe(ids);
  });
});
