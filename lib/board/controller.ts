import { findAgent } from "@/lib/catalog/catalog";
import { getAbilityDefinition } from "./data";
import {
  add,
  angle,
  constrainLength,
  constrainPath,
  distance,
  hitAbility,
  hitStroke,
  modeGeometry,
  pathLength,
  rotate,
  rotateAbility,
  simplifyRoute,
  subtract,
  translateObject,
} from "./geometry";
import { clampAnchor, clientToMap, type Viewport } from "./projection";
import { BoardStore } from "./store";
import {
  BOARD_LIMITS,
  COLORS,
  WIDTHS,
  type AbilityInstance,
  type BoardObject,
  type MapCalibration,
  type ObjectSelection,
  type Point,
  type Stroke,
  type Tool,
} from "./types";

export interface EditorUi {
  tool: Tool;
  color: string;
  width: number;
  selected: ObjectSelection;
  armedAbility: string | null;
  armedAgent: string | null;
  sourceTarget: string | null;
  extraTarget: string | null;
  draftId: string | null;
  activeId: string | null;
  phase: "idle" | "placing" | "drawing" | "moving" | "rotating" | "editing";
  error: string | null;
}

interface PointerInput {
  pointerId: number;
  clientX: number;
  clientY: number;
  button: number;
  isPrimary?: boolean;
  shiftKey?: boolean;
  target?: EventTarget | null;
  getCoalescedEvents?: () => PointerEvent[];
}

type Gesture =
  | {
      kind: "draw";
      pointerId: number;
      stroke: Stroke;
      buffer: Point[];
      remaining: number;
    }
  | {
      kind: "place";
      pointerId: number | null;
      start: Point;
      clientStart: Point;
      moved: boolean;
      object: AbilityInstance;
      targetIndex: number;
    }
  | {
      kind: "route";
      pointerId: number | null;
      before: AbilityInstance;
      object: AbilityInstance;
      index: number;
    }
  | {
      kind: "manipulate";
      pointerId: number;
      before: BoardObject;
      start: Point;
      pointerAngle: number;
      handle?: string;
      object: BoardObject;
    };

export class BoardController {
  readonly store: BoardStore;
  readonly map: MapCalibration;
  private ui: EditorUi = {
    tool: "pen",
    color: COLORS[0],
    width: WIDTHS[1],
    selected: null,
    armedAbility: null,
    armedAgent: null,
    sourceTarget: null,
    extraTarget: null,
    draftId: null,
    activeId: null,
    phase: "idle",
    error: null,
  };
  private uiListeners = new Set<() => void>();
  private frameListeners = new Set<() => void>();
  private gesture: Gesture | null = null;
  private hover: AbilityInstance | null = null;
  private frame = 0;
  private viewport: Viewport = { left: 0, top: 0, width: 1, height: 1 };
  private surface: HTMLElement | null = null;

  constructor(store: BoardStore, map: MapCalibration) {
    this.store = store;
    this.map = map;
  }
  getUi = () => this.ui;
  subscribeUi = (listener: () => void) => {
    this.uiListeners.add(listener);
    return () => {
      this.uiListeners.delete(listener);
    };
  };
  subscribeFrame = (listener: () => void) => {
    this.frameListeners.add(listener);
    return () => {
      this.frameListeners.delete(listener);
    };
  };
  getPreview = (): BoardObject | null => {
    const gesture = this.gesture;
    return gesture?.kind === "draw"
      ? gesture.stroke
      : (gesture?.object ?? this.hover);
  };
  getObject = (id: string) =>
    this.getPreview()?.id === id
      ? this.getPreview()!
      : this.store.getObject(id);

  private updateUi(patch: Partial<EditorUi>) {
    if (
      Object.entries(patch).every(
        ([key, value]) => this.ui[key as keyof EditorUi] === value,
      )
    )
      return;
    this.ui = { ...this.ui, ...patch };
    this.uiListeners.forEach((listener) => listener());
  }
  private paint = () => {
    if (!this.frame)
      this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        this.frameListeners.forEach((listener) => listener());
      });
  };
  private flush() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.frameListeners.forEach((listener) => listener());
  }
  reportError = (error: unknown) =>
    this.updateUi({
      error: error instanceof Error ? error.message : String(error),
    });
  private commit(action: () => void) {
    try {
      action();
      this.updateUi({ error: null });
    } catch (error) {
      this.reportError(error);
    }
  }
  setViewport(viewport: Viewport) {
    this.viewport = viewport;
    this.paint();
  }
  getViewport = () => this.viewport;
  private point(event: Pick<PointerInput, "clientX" | "clientY">): Point {
    return clientToMap(
      { x: event.clientX, y: event.clientY },
      this.viewport,
      this.map,
    );
  }
  private pixelsToMeters(pixels: number) {
    return (pixels * this.map.metersWide) / this.viewport.width;
  }

  setTool = (tool: Tool) => {
    this.cancel();
    this.updateUi({
      tool,
      armedAbility: null,
      armedAgent: null,
      sourceTarget: null,
    });
  };
  setColor = (color: string) => this.updateUi({ color });
  setWidth = (width: number) => this.updateUi({ width });
  armAbility = (id: string | null) => {
    this.cancel();
    this.updateUi({
      armedAbility: id,
      armedAgent: null,
      selected: null,
      sourceTarget: null,
    });
  };
  armAgent = (agentId: string | null) => {
    this.cancel();
    this.updateUi({
      armedAgent: agentId,
      armedAbility: null,
      selected: null,
      sourceTarget: null,
    });
  };
  select = (id: string | null) =>
    this.updateUi({ selected: id ? { id } : null });

  private capture(pointerId: number) {
    try {
      this.surface?.setPointerCapture(pointerId);
    } catch {}
  }
  private release(pointerId: number) {
    try {
      if (this.surface?.hasPointerCapture(pointerId))
        this.surface.releasePointerCapture(pointerId);
    } catch {}
  }

  private newAbility(id: string, position: Point): AbilityInstance {
    const definition = getAbilityDefinition(id);
    return {
      id: crypto.randomUUID(),
      kind: "ability",
      definitionId: id,
      position,
      rotation: definition.modes[0].geometry.kind === "cross" ? 45 : 0,
      mode: definition.modes[0].id,
      points: [],
    };
  }

  pointerDown(event: PointerInput, objectId?: string, handle?: string) {
    if (event.button !== 0 || event.isPrimary === false) return;
    const point = clampAnchor(this.point(event), this.map);
    if (this.gesture?.kind === "route") {
      this.gesture.pointerId = event.pointerId;
      this.capture(event.pointerId);
      this.updateRoute(point, false);
      return;
    }
    if (this.ui.extraTarget) {
      const object = this.store.getObject(this.ui.extraTarget);
      if (object?.kind === "ability") {
        const mode = getAbilityDefinition(object.definitionId).modes.find(
          (mode) => mode.id === object.mode,
        )!;
        if (object.points.length < (mode.targets ?? 1) - 1)
          this.commit(() =>
            this.store.replace({
              ...object,
              points: [...object.points, point],
            }),
          );
      }
      this.updateUi({ extraTarget: null });
      return;
    }
    if (this.ui.sourceTarget) {
      const object = this.store.getObject(this.ui.sourceTarget);
      if (object?.kind === "ability") {
        const geometry = modeGeometry(
          getAbilityDefinition(object.definitionId),
          object,
        );
        this.commit(() =>
          this.store.replace({
            ...object,
            source: constrainLength(
              object.position,
              point,
              geometry.kind === "teleport" ? geometry.maxDistance : undefined,
            ),
          }),
        );
      }
      this.updateUi({ sourceTarget: null });
      return;
    }
    if (this.gesture?.kind === "place" && this.gesture.pointerId === null) {
      this.updatePlacement(point, false);
      const placing = this.gesture;
      const definition = getAbilityDefinition(placing.object.definitionId);
      const targets =
        definition.modes.find((mode) => mode.id === placing.object.mode)
          ?.targets ?? 1;
      if (targets > 1 && this.gesture.targetIndex < targets - 1) {
        this.gesture.targetIndex++;
        this.gesture.object = {
          ...this.gesture.object,
          points: [...this.gesture.object.points, point],
        };
        this.paint();
      } else this.finishPlacement();
      return;
    }
    if (this.gesture) return;
    if (this.ui.armedAbility) {
      const object = this.hover
        ? { ...this.hover, position: point }
        : this.newAbility(this.ui.armedAbility, point);
      this.hover = null;
      const definition = getAbilityDefinition(object.definitionId);
      const targets = definition.modes[0].targets ?? 1;
      if (definition.placement === "point" && targets === 1) {
        this.commit(() => this.store.add(object));
        this.updateUi({
          armedAbility: null,
          draftId: null,
          selected: { id: object.id },
          tool: "select",
        });
        this.flush();
      } else {
        this.gesture = {
          kind: "place",
          pointerId: event.pointerId,
          start: point,
          clientStart: { x: event.clientX, y: event.clientY },
          moved: false,
          object,
          targetIndex: targets > 1 ? 1 : 0,
        };
        this.updateUi({ phase: "placing", draftId: object.id });
        this.capture(event.pointerId);
        this.paint();
      }
      return;
    }
    if (this.ui.armedAgent) {
      const object = {
        id: crypto.randomUUID(),
        kind: "agent" as const,
        agentId: this.ui.armedAgent,
        position: point,
      };
      this.commit(() => this.store.add(object));
      this.updateUi({
        armedAgent: null,
        selected: { id: object.id },
        tool: "select",
      });
      return;
    }
    let object = objectId ? this.store.getObject(objectId) : undefined;
    if (!object && this.ui.tool === "select") object = this.hitTest(point);
    if (object) {
      this.select(object.id);
      const action =
        handle === "rotate" || (event.shiftKey && object.kind === "ability")
          ? "rotating"
          : handle !== undefined
            ? "editing"
            : "moving";
      this.gesture = {
        kind: "manipulate",
        pointerId: event.pointerId,
        before: object,
        object,
        start: this.point(event),
        pointerAngle:
          object.kind !== "stroke"
            ? angle(object.position, this.point(event))
            : 0,
        handle: action === "rotating" ? "rotate" : handle,
      };
      this.updateUi({ phase: action, activeId: object.id });
      this.capture(event.pointerId);
      this.paint();
      return;
    }
    this.select(null);
    if (this.ui.tool === "select") return;
    const stroke: Stroke = {
      id: crypto.randomUUID(),
      kind: "stroke",
      type: this.ui.tool,
      color: this.ui.color,
      width: this.ui.width,
      points: [point],
    };
    const usedPoints = this.store
      .getSnapshot()
      .objects.reduce(
        (count, object) =>
          count + (object.kind === "stroke" ? object.points.length : 0),
        0,
      );
    if (usedPoints >= BOARD_LIMITS.points) {
      this.reportError("This board has reached its drawing point limit.");
      return;
    }
    this.gesture = {
      kind: "draw",
      pointerId: event.pointerId,
      stroke,
      buffer: [point],
      remaining: BOARD_LIMITS.points - usedPoints,
    };
    this.updateUi({ phase: "drawing" });
    this.capture(event.pointerId);
    this.paint();
  }

  private updatePlacement(point: Point, drawing: boolean) {
    const gesture = this.gesture;
    if (gesture?.kind !== "place") return;
    const definition = getAbilityDefinition(gesture.object.definitionId);
    const geometry = modeGeometry(definition, gesture.object);
    if (geometry.kind === "circle") {
      const points = [...gesture.object.points];
      points[gesture.targetIndex - 1] = point;
      gesture.object = { ...gesture.object, points };
    } else if (geometry.kind === "segment") {
      const endpoint = constrainLength(
        gesture.start,
        point,
        geometry.maxLength,
      );
      gesture.object = {
        ...gesture.object,
        points: [endpoint],
        rotation: angle(gesture.start, endpoint),
      };
    } else if (geometry.kind === "path") {
      const points = drawing
        ? [gesture.start, ...gesture.object.points]
        : [gesture.start];
      if (distance(points.at(-1)!, point) >= this.pixelsToMeters(2) || !drawing)
        points.push(point);
      gesture.object = {
        ...gesture.object,
        points: constrainPath(
          simplifyRoute(points, BOARD_LIMITS.routePoints + 1),
          geometry.maxLength,
        ).slice(1),
        rotation: angle(gesture.start, point),
      };
    } else {
      gesture.object = {
        ...gesture.object,
        rotation: angle(gesture.start, point),
      };
    }
    this.paint();
  }

  pointerMove(event: PointerInput) {
    const gesture = this.gesture;
    if (!gesture && this.ui.armedAbility) {
      const point = clampAnchor(this.point(event), this.map);
      this.hover = this.hover
        ? { ...this.hover, position: point }
        : this.newAbility(this.ui.armedAbility, point);
      this.updateUi({ draftId: this.hover.id });
      this.paint();
      return;
    }
    if (
      !gesture ||
      (gesture.pointerId !== null && gesture.pointerId !== event.pointerId)
    )
      return;
    const point = this.point(event);
    if (gesture.kind === "draw") {
      const events = event.getCoalescedEvents?.() ?? [];
      const samples = events.length ? events : [event];
      if (gesture.stroke.type === "pen" || gesture.stroke.type === "eraser") {
        const points = gesture.buffer;
        for (const sample of samples) {
          const next = this.point(sample);
          if (
            points.length < gesture.remaining &&
            distance(points.at(-1)!, next) >= this.pixelsToMeters(0.35)
          )
            points.push(next);
        }
        gesture.stroke = { ...gesture.stroke, points };
      } else
        gesture.stroke = {
          ...gesture.stroke,
          points: [gesture.stroke.points[0], point],
        };
    } else if (gesture.kind === "route") {
      this.updateRoute(point, gesture.pointerId !== null);
    } else if (gesture.kind === "place") {
      if (
        distance(gesture.clientStart, { x: event.clientX, y: event.clientY }) >
        4
      )
        gesture.moved = true;
      this.updatePlacement(point, gesture.pointerId !== null && gesture.moved);
    } else if (
      gesture.handle === "rotate" &&
      gesture.before.kind === "ability"
    ) {
      const rotation =
        gesture.before.rotation +
        angle(gesture.before.position, point) -
        gesture.pointerAngle;
      gesture.object = rotateAbility(
        gesture.before,
        event.shiftKey ? Math.round(rotation / 15) * 15 : rotation,
      );
    } else if (
      gesture.handle !== undefined &&
      gesture.before.kind === "ability"
    ) {
      const routeHandle = /^route:(\d+):(\d+)$/.exec(gesture.handle);
      const anchor =
        gesture.handle === "source"
          ? gesture.before.source
          : ["origin", "destination"].includes(gesture.handle)
            ? gesture.before.position
            : routeHandle
              ? gesture.before.routes?.[Number(routeHandle[1])]?.[
                  Number(routeHandle[2])
                ]
              : gesture.before.points[Number(gesture.handle)];
      gesture.object = this.editHandle(
        gesture.before,
        gesture.handle,
        clampAnchor(
          anchor ? add(anchor, subtract(point, gesture.start)) : point,
          this.map,
        ),
      );
    } else {
      let delta = subtract(point, gesture.start);
      if (gesture.before.kind !== "stroke")
        delta = subtract(
          clampAnchor(add(gesture.before.position, delta), this.map),
          gesture.before.position,
        );
      gesture.object = translateObject(gesture.before, delta);
    }
    this.paint();
  }

  private editHandle(
    object: AbilityInstance,
    handle: string,
    point: Point,
  ): AbilityInstance {
    const definition = getAbilityDefinition(object.definitionId);
    const geometry = modeGeometry(definition, object);
    if (handle === "source")
      return {
        ...object,
        source: constrainLength(
          object.position,
          point,
          geometry.kind === "teleport" ? geometry.maxDistance : undefined,
        ),
      };
    if (handle === "destination" && geometry.kind === "teleport")
      return {
        ...object,
        position: object.source
          ? constrainLength(object.source, point, geometry.maxDistance)
          : point,
      };
    if (handle === "origin")
      return translateObject(object, subtract(point, object.position));
    const routeHandle = /^route:(\d+):(\d+)$/.exec(handle);
    if (routeHandle) {
      const routeIndex = Number(routeHandle[1]),
        nodeIndex = Number(routeHandle[2]);
      const route = object.routes?.[routeIndex];
      if (!route?.[nodeIndex]) return object;
      const edited = this.editHandle(
        { ...object, points: route, routes: undefined },
        String(nodeIndex),
        point,
      );
      return {
        ...object,
        routes: object.routes!.map((points, index) =>
          index === routeIndex ? edited.points : points,
        ),
      };
    }
    const index = Number(handle);
    if (
      !Number.isSafeInteger(index) ||
      index < 0 ||
      index >= object.points.length
    )
      return object;
    const points = [...object.points];
    points[index] =
      geometry.kind === "segment"
        ? constrainLength(object.position, point, geometry.maxLength)
        : point;
    if (
      geometry.kind === "segment" &&
      distance(object.position, points[index]) < (geometry.minLength ?? 0)
    ) {
      const facing =
        distance(object.position, point) > 0
          ? angle(object.position, point)
          : angle(object.position, object.points[index]);
      points[index] = add(
        object.position,
        rotate({ x: geometry.minLength ?? 0, y: 0 }, facing),
      );
    }
    if (
      geometry.kind === "path" &&
      geometry.maxLength !== undefined &&
      pathLength([object.position, ...points]) > geometry.maxLength
    ) {
      const old = object.points[index];
      let lo = 0,
        hi = 1;
      for (let step = 0; step < 30; step++) {
        const t = (lo + hi) / 2;
        points[index] = {
          x: old.x + (point.x - old.x) * t,
          y: old.y + (point.y - old.y) * t,
        };
        if (pathLength([object.position, ...points]) > geometry.maxLength)
          hi = t;
        else lo = t;
      }
      points[index] = {
        x: old.x + (point.x - old.x) * lo,
        y: old.y + (point.y - old.y) * lo,
      };
    }
    return { ...object, points };
  }

  pointerUp(event: PointerInput) {
    const gesture = this.gesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    this.pointerMove(event);
    if (gesture.kind === "place") {
      const targets =
        getAbilityDefinition(gesture.object.definitionId).modes.find(
          (mode) => mode.id === gesture.object.mode,
        )?.targets ?? 1;
      if (gesture.moved && targets === 1) this.finishPlacement();
      else {
        gesture.pointerId = null;
        this.paint();
      }
      this.release(event.pointerId);
      return;
    }
    // Publish before removing preview so subscribed object views never flash backwards.
    if (gesture.kind === "draw")
      this.commit(() =>
        this.store.add({
          ...gesture.stroke,
          points: [...gesture.stroke.points],
        }),
      );
    else if (JSON.stringify(gesture.before) !== JSON.stringify(gesture.object))
      this.commit(() => this.store.replace(gesture.object));
    this.gesture = null;
    this.hover = null;
    this.release(event.pointerId);
    this.updateUi({ phase: "idle", activeId: null });
    this.flush();
  }

  private finishPlacement() {
    if (this.gesture?.kind !== "place") return;
    const object = this.gesture.object;
    const geometry = modeGeometry(
      getAbilityDefinition(object.definitionId),
      object,
    );
    if (
      geometry.kind === "segment" &&
      (!object.points.length ||
        distance(object.position, object.points[0]) < (geometry.minLength ?? 0))
    ) {
      this.gesture.pointerId = null;
      this.reportError(
        `Place the second endpoint at least ${geometry.minLength ?? 0} m from the first.`,
      );
      this.paint();
      return;
    }
    this.commit(() => this.store.add(object));
    this.gesture = null;
    this.updateUi({
      armedAbility: null,
      draftId: null,
      phase: "idle",
      selected: { id: object.id },
      tool: "select",
    });
    this.flush();
  }

  cancel = () => {
    const pointerId = this.gesture?.pointerId;
    this.gesture = null;
    this.hover = null;
    if (pointerId !== null && pointerId !== undefined) this.release(pointerId);
    this.updateUi({
      phase: "idle",
      draftId: null,
      activeId: null,
      sourceTarget: null,
      extraTarget: null,
    });
    this.flush();
  };
  undo = () => {
    this.cancel();
    this.store.undo();
    if (this.ui.selected && !this.store.getObject(this.ui.selected.id))
      this.select(null);
  };
  redo = () => {
    this.cancel();
    this.store.redo();
    if (this.ui.selected && !this.store.getObject(this.ui.selected.id))
      this.select(null);
  };
  reset = () => {
    this.cancel();
    this.store.reset();
    this.updateUi({ selected: null, armedAbility: null, armedAgent: null });
  };
  remove = (id: string) => {
    this.cancel();
    this.store.remove(id);
    if (this.ui.selected?.id === id) this.select(null);
  };

  setMode = (id: string, mode: string) => {
    this.cancel();
    const object = this.store.getObject(id);
    if (object?.kind !== "ability") return;
    const definition = getAbilityDefinition(object.definitionId);
    const target = definition.modes.find((item) => item.id === mode);
    if (!target || mode === object.mode) return;
    const points =
      target.geometry.kind === "path"
        ? constrainPath(
            [object.position, ...object.points],
            target.geometry.maxLength,
          ).slice(1)
        : object.points.slice(0, (target.targets ?? 1) - 1);
    const next = { ...object, mode, points };
    if (object.routes) {
      const routes =
        target.geometry.kind === "path"
          ? object.routes
              .slice(0, (target.geometry.maxRoutes ?? 1) - 1)
              .map((route) =>
                constrainPath(
                  [object.position, ...route],
                  target.geometry.kind === "path"
                    ? target.geometry.maxLength
                    : undefined,
                ).slice(1),
              )
          : [];
      if (routes.length) next.routes = routes;
      else delete next.routes;
    }
    this.commit(() => this.store.replace(next));
  };
  addRoute = (id: string) => {
    this.cancel();
    const object = this.store.getObject(id);
    if (object?.kind !== "ability") return;
    const geometry = modeGeometry(
      getAbilityDefinition(object.definitionId),
      object,
    );
    if (
      geometry.kind !== "path" ||
      (object.routes?.length ?? 0) >=
        Math.min(geometry.maxRoutes ?? 1, BOARD_LIMITS.routes) - 1
    )
      return;
    const routes = [...(object.routes ?? []), []];
    this.gesture = {
      kind: "route",
      pointerId: null,
      before: object,
      object: { ...object, routes },
      index: routes.length - 1,
    };
    this.updateUi({
      activeId: id,
      phase: "editing",
      armedAbility: null,
      armedAgent: null,
    });
    this.paint();
  };
  removeRoute = (id: string) => {
    this.cancel();
    const object = this.store.getObject(id);
    if (object?.kind !== "ability" || !object.routes?.length) return;
    const next = { ...object, routes: object.routes.slice(0, -1) };
    if (!next.routes.length) delete (next as AbilityInstance).routes;
    this.commit(() => this.store.replace(next));
  };
  private updateRoute(point: Point, drawing: boolean) {
    const gesture = this.gesture;
    if (gesture?.kind !== "route") return;
    const geometry = modeGeometry(
      getAbilityDefinition(gesture.object.definitionId),
      gesture.object,
    );
    if (geometry.kind !== "path") return;
    const points = drawing
      ? [gesture.object.position, ...gesture.object.routes![gesture.index]]
      : [gesture.object.position];
    if (distance(points.at(-1)!, point) >= this.pixelsToMeters(2) || !drawing)
      points.push(point);
    const route = constrainPath(
      simplifyRoute(points, BOARD_LIMITS.routePoints + 1),
      geometry.maxLength,
    ).slice(1);
    gesture.object = {
      ...gesture.object,
      routes: gesture.object.routes!.map((points, index) =>
        index === gesture.index ? route : points,
      ),
    };
    this.paint();
  }
  toggleSource = (id: string) => {
    const object = this.store.getObject(id);
    if (
      object?.kind !== "ability" ||
      modeGeometry(getAbilityDefinition(object.definitionId), object).kind !==
        "teleport"
    )
      return;
    if (object.source) {
      const next = { ...object };
      delete next.source;
      this.commit(() => this.store.replace(next));
    } else
      this.updateUi({ sourceTarget: id, armedAbility: null, armedAgent: null });
  };
  addTarget = (id: string) => {
    this.cancel();
    this.updateUi({ extraTarget: id, armedAbility: null, armedAgent: null });
  };
  removeTarget = (id: string) => {
    const object = this.store.getObject(id);
    if (object?.kind === "ability" && object.points.length)
      this.commit(() =>
        this.store.replace({ ...object, points: object.points.slice(0, -1) }),
      );
  };
  toggleOwnerRange = (id: string) => {
    const object = this.store.getObject(id);
    if (object?.kind === "ability")
      this.commit(() =>
        this.store.replace({
          ...object,
          showOwnerRange: !object.showOwnerRange,
        }),
      );
  };
  addPathPoint = (id: string) => {
    const object = this.store.getObject(id);
    if (
      object?.kind !== "ability" ||
      object.points.length >= BOARD_LIMITS.routePoints
    )
      return;
    const points = [object.position, ...object.points];
    if (points.length < 2) return;
    let longest = 0;
    for (let i = 1; i < points.length - 1; i++)
      if (
        distance(points[i], points[i + 1]) >
        distance(points[longest], points[longest + 1])
      )
        longest = i;
    points.splice(longest + 1, 0, {
      x: (points[longest].x + points[longest + 1].x) / 2,
      y: (points[longest].y + points[longest + 1].y) / 2,
    });
    this.commit(() =>
      this.store.replace({ ...object, points: points.slice(1) }),
    );
  };
  removePathPoint = (id: string) => {
    const object = this.store.getObject(id);
    if (object?.kind === "ability" && object.points.length > 1)
      this.commit(() =>
        this.store.replace({
          ...object,
          points: object.points.filter(
            (_, i) => i !== object.points.length - 2,
          ),
        }),
      );
  };

  private hitTest(point: Point): BoardObject | undefined {
    const objects = this.store.getSnapshot().objects;
    const tolerance = this.pixelsToMeters(8);
    for (let i = objects.length - 1; i >= 0; i--) {
      const object = objects[i];
      if (
        object.kind === "agent" &&
        distance(object.position, point) <= this.pixelsToMeters(20)
      )
        return object;
      if (
        object.kind === "ability" &&
        distance(object.position, point) <= this.pixelsToMeters(18)
      )
        return object;
    }
    for (let i = objects.length - 1; i >= 0; i--) {
      const object = objects[i];
      if (
        object.kind === "ability" &&
        hitAbility(
          object,
          getAbilityDefinition(object.definitionId),
          point,
          tolerance,
        )
      )
        return object;
      if (
        object.kind === "stroke" &&
        hitStroke(
          object,
          point,
          tolerance + this.pixelsToMeters(object.width / 2),
        )
      )
        return object;
    }
  }

  keyDown(event: KeyboardEvent, onClose: () => void) {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
    )
      return;
    if (event.key === "Escape") {
      event.preventDefault();
      if (
        this.gesture ||
        this.hover ||
        this.ui.sourceTarget ||
        this.ui.extraTarget
      ) {
        this.cancel();
        this.updateUi({ armedAbility: null, armedAgent: null });
      } else if (this.ui.armedAbility || this.ui.armedAgent)
        this.updateUi({ armedAbility: null, armedAgent: null });
      else if (this.ui.selected) this.select(null);
      else onClose();
      return;
    }
    if (
      (event.ctrlKey || event.metaKey) &&
      ["z", "y"].includes(event.key.toLowerCase())
    ) {
      event.preventDefault();
      if (event.key.toLowerCase() === "y" || event.shiftKey) this.redo();
      else this.undo();
      return;
    }
    if (["Delete", "Backspace"].includes(event.key) && this.ui.selected) {
      event.preventDefault();
      this.remove(this.ui.selected.id);
    }
    const delta = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    }[event.key];
    if (delta && this.ui.selected) {
      event.preventDefault();
      this.cancel();
      const object = this.store.getObject(this.ui.selected.id);
      if (!object) return;
      if (
        object.kind === "ability" &&
        target instanceof HTMLElement &&
        target.dataset.boardHandle === "rotate"
      ) {
        this.commit(() =>
          this.store.replace(
            rotateAbility(
              object,
              object.rotation +
                (delta.x || delta.y) * (event.shiftKey ? 15 : 1),
            ),
          ),
        );
        return;
      }
      const step = this.pixelsToMeters(event.shiftKey ? 10 : 1);
      let movement = {
        x: delta.x * step,
        y: delta.y * step,
      };
      if (object.kind !== "stroke")
        movement = subtract(
          clampAnchor(add(object.position, movement), this.map),
          object.position,
        );
      const next = translateObject(object, movement);
      this.commit(() => this.store.replace(next));
    }
  }

  connect(surface: HTMLElement) {
    this.surface = surface;
    const viewport = () => this.setViewport(surface.getBoundingClientRect());
    viewport();
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary) return;
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-board-object]")
          : null;
      event.preventDefault();
      this.pointerDown(
        event,
        target?.dataset.boardObject,
        target?.dataset.boardHandle,
      );
    };
    const move = (event: PointerEvent) => this.pointerMove(event);
    const up = (event: PointerEvent) => this.pointerUp(event);
    const cancel = (event: PointerEvent) => {
      if (this.gesture?.pointerId === event.pointerId) this.cancel();
    };
    const blur = () => this.cancel();
    const observer = new ResizeObserver(() => {
      if (this.gesture) this.cancel();
      viewport();
    });
    observer.observe(surface);
    surface.addEventListener("pointerdown", down);
    surface.addEventListener("pointermove", move);
    surface.addEventListener("pointerup", up);
    surface.addEventListener("pointercancel", cancel);
    surface.addEventListener("lostpointercapture", cancel);
    window.addEventListener("blur", blur);
    window.addEventListener("scroll", viewport, true);
    return () => {
      this.cancel();
      this.surface = null;
      observer.disconnect();
      surface.removeEventListener("pointerdown", down);
      surface.removeEventListener("pointermove", move);
      surface.removeEventListener("pointerup", up);
      surface.removeEventListener("pointercancel", cancel);
      surface.removeEventListener("lostpointercapture", cancel);
      window.removeEventListener("blur", blur);
      window.removeEventListener("scroll", viewport, true);
    };
  }
}

export function agentForObject(object: BoardObject) {
  return object.kind === "agent"
    ? findAgent(object.agentId)
    : object.kind === "ability"
      ? findAgent(getAbilityDefinition(object.definitionId).agentId)
      : null;
}
