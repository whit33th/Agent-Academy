"use client";

import {
  Fragment,
  memo,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import Image from "@/components/ui/CatalogImage";
import { findAgent } from "@/lib/catalog/catalog";
import { getAbilityDefinition } from "@/lib/board/data";
import {
  abilityPrimitives,
  add,
  modeGeometry,
  rotate,
  subtract,
  distance,
} from "@/lib/board/geometry";
import { mapToScreen } from "@/lib/board/projection";
import type { BoardController } from "@/lib/board/controller";
import type {
  AbilityInstance,
  BoardObject,
  MapCalibration,
  Point,
  Stroke,
} from "@/lib/board/types";

function useObject(controller: BoardController, id: string) {
  return useSyncExternalStore(
    (listener) => controller.store.subscribeObject(id, listener),
    () => controller.store.getObject(id),
    () => controller.store.getObject(id),
  );
}

function setPosition(
  element: HTMLElement,
  point: Point,
  controller: BoardController,
) {
  const screen = mapToScreen(point, controller.getViewport(), controller.map);
  element.style.transform = `translate3d(${screen.x}px, ${screen.y}px, 0)`;
}

function paintShape(
  group: SVGGElement,
  object: BoardObject | undefined,
  map: MapCalibration,
) {
  if (object?.kind !== "ability") {
    group.replaceChildren();
    return;
  }
  const definition = getAbilityDefinition(object.definitionId);
  const primitives = abilityPrimitives(object, definition, map);
  // The renderer owns this empty group; React never reconciles its children.
  // Every attribute comes from validated board coordinates or bundled definitions.
  const elements: SVGElement[] = [];
  for (const primitive of primitives) {
    const shape = document.createElementNS(
      "http://www.w3.org/2000/svg",
      primitive.kind,
    );
    if (primitive.kind === "circle") {
      shape.setAttribute("cx", String(primitive.center!.x));
      shape.setAttribute("cy", String(primitive.center!.y));
      shape.setAttribute("r", String(primitive.radius));
    } else shape.setAttribute("d", primitive.path!);
    shape.setAttribute("fill", primitive.filled ? definition.color : "none");
    shape.setAttribute("fill-opacity", "0.18");
    shape.setAttribute("stroke", definition.color);
    shape.setAttribute("stroke-opacity", "0.8");
    shape.setAttribute("stroke-width", primitive.wall ? "6" : "1.5");
    shape.setAttribute("vector-effect", "non-scaling-stroke");
    shape.setAttribute("stroke-linecap", "round");
    shape.setAttribute("stroke-linejoin", "round");
    if (primitive.dashed) shape.setAttribute("stroke-dasharray", "4 3");
    if (primitive.wall) {
      const glow = shape.cloneNode() as SVGElement;
      glow.setAttribute("stroke-width", "18");
      glow.setAttribute("stroke-opacity", "0.18");
      elements.push(glow);
    }
    elements.push(shape);
  }
  group.replaceChildren(...elements);
}

const ObjectShape = memo(function ObjectShape({
  controller,
  id,
  hidden,
}: {
  controller: BoardController;
  id: string;
  hidden: boolean;
}) {
  const object = useObject(controller, id);
  const group = useRef<SVGGElement>(null);
  useLayoutEffect(() => {
    if (group.current) paintShape(group.current, object, controller.map);
  }, [controller, id, object]);
  return (
    <g
      ref={group}
      data-board-shape={id}
      visibility={hidden ? "hidden" : undefined}
    />
  );
});

function PreviewShape({ controller }: { controller: BoardController }) {
  const group = useRef<SVGGElement>(null);
  useLayoutEffect(() => {
    let last: BoardObject | null | undefined;
    let base: AbilityInstance | undefined;
    let viewport = controller.getViewport();
    const draw = () => {
      const current = controller.getPreview();
      if (
        (current !== last || viewport !== controller.getViewport()) &&
        group.current
      ) {
        const layer = group.current.ownerSVGElement!;
        if (current?.kind === "ability") {
          if (
            !base ||
            viewport !== controller.getViewport() ||
            !isRigidPreview(base, current)
          ) {
            paintShape(group.current, current, controller.map);
            base = current;
            viewport = controller.getViewport();
          }
          const radians = ((current.rotation - base.rotation) * Math.PI) / 180;
          const sx = viewport.width / controller.map.metersWide,
            sy = viewport.height / controller.map.metersHigh;
          const a = Math.cos(radians),
            b = (Math.sin(radians) * sy) / sx,
            c = (-Math.sin(radians) * sx) / sy,
            d = a;
          const origin = mapToScreen(base.position, viewport, controller.map),
            destination = mapToScreen(
              current.position,
              viewport,
              controller.map,
            );
          layer.style.transform = `matrix(${a}, ${b}, ${c}, ${d}, ${destination.x - a * origin.x - c * origin.y}, ${destination.y - b * origin.x - d * origin.y})`;
        } else {
          paintShape(group.current, undefined, controller.map);
          layer.style.transform = "none";
          base = undefined;
        }
        last = current;
      }
    };
    draw();
    return controller.subscribeFrame(draw);
  }, [controller]);
  return <g ref={group} data-board-preview-shape />;
}

function isRigidPreview(
  base: AbilityInstance,
  current: AbilityInstance,
): boolean {
  if (
    base.id !== current.id ||
    base.definitionId !== current.definitionId ||
    base.mode !== current.mode ||
    base.showOwnerRange !== current.showOwnerRange ||
    base.points.length !== current.points.length ||
    (base.routes?.length ?? 0) !== (current.routes?.length ?? 0) ||
    Boolean(base.source) !== Boolean(current.source)
  )
    return false;
  const transformed = (point: Point) =>
    add(
      current.position,
      rotate(subtract(point, base.position), current.rotation - base.rotation),
    );
  return (
    current.points.every(
      (point, index) => distance(point, transformed(base.points[index])) < 1e-8,
    ) &&
    (current.routes ?? []).every(
      (route, index) =>
        route.length === base.routes![index].length &&
        route.every(
          (point, node) =>
            distance(point, transformed(base.routes![index][node])) < 1e-8,
        ),
    ) &&
    (!current.source ||
      distance(current.source, transformed(base.source!)) < 1e-8)
  );
}

const ObjectToken = memo(function ObjectToken({
  controller,
  id,
}: {
  controller: BoardController;
  id: string;
}) {
  const committed = useObject(controller, id);
  const object = committed ?? controller.getObject(id);
  const button = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    let last: BoardObject | undefined;
    let lastViewport: ReturnType<BoardController["getViewport"]> | undefined;
    const update = () => {
      const current = controller.getObject(id);
      const viewport = controller.getViewport();
      if (
        (current !== last || viewport !== lastViewport) &&
        button.current &&
        current &&
        current.kind !== "stroke"
      ) {
        setPosition(button.current, current.position, controller);
        last = current;
        lastViewport = viewport;
      }
    };
    update();
    return controller.subscribeFrame(update);
  }, [controller, id, committed]);
  if (!object || object.kind === "stroke") return null;
  const agent = object.kind === "agent" ? findAgent(object.agentId) : null;
  const ability =
    object.kind === "ability"
      ? getAbilityDefinition(object.definitionId)
      : null;
  const icon = ability?.icon ?? agent?.displayIcon;
  const label = ability
    ? `${findAgent(ability.agentId)?.name} — ${ability.name}`
    : agent!.name;
  const position = mapToScreen(
    object.position,
    controller.getViewport(),
    controller.map,
  );
  return (
    <button
      ref={button}
      type="button"
      data-board-object={id}
      data-board-handle={
        ability &&
        modeGeometry(ability, object as AbilityInstance).kind === "teleport"
          ? "destination"
          : undefined
      }
      data-board-token
      onClick={() => controller.select(id)}
      aria-label={label}
      title={`${label} (drag to move)`}
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        borderColor: ability?.color,
      }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 cursor-grab active:cursor-grabbing hover:scale-110 transition-[scale] ${agent ? "size-8 xl:size-10 border-white/85 bg-black overflow-hidden shadow-lg" : "size-8 bg-black/70 backdrop-blur-sm flex items-center justify-center"}`}
    >
      {icon &&
        (agent ? (
          <Image
            src={icon}
            alt={agent.name}
            fill
            sizes="80px"
            draggable={false}
            className="object-cover"
          />
        ) : (
          <Image
            src={icon}
            alt={ability!.name}
            width={20}
            height={20}
            draggable={false}
          />
        ))}
    </button>
  );
});

function handlePoints(
  object: AbilityInstance,
  controller: BoardController,
): { key: string; label: string; point: Point }[] {
  const geometry = modeGeometry(
    getAbilityDefinition(object.definitionId),
    object,
  );
  const points = object.points.map((point, index) => ({
    key: String(index),
    label: `Move point ${index + 1}`,
    point,
  }));
  for (const [routeIndex, route] of (object.routes ?? []).entries()) {
    points.push(
      ...route.map((point, index) => ({
        key: `route:${routeIndex}:${index}`,
        label: `Move route ${routeIndex + 2} point ${index + 1}`,
        point,
      })),
    );
  }
  if (object.source)
    points.push({
      key: "source",
      label: "Move teleport source",
      point: object.source,
    });
  if (
    [
      "sector",
      "strip",
      "wall",
      "cross",
      "global-line",
      "facing",
      "compound-wall",
    ].includes(geometry.kind)
  ) {
    const viewport = controller.getViewport();
    const pixels = (controller.map.metersWide * 48) / viewport.width;
    const candidate = add(
      object.position,
      rotate({ x: pixels, y: 0 }, object.rotation),
    );
    // Controls remain reachable at an edge; effect geometry keeps its real dimensions.
    const insetX = (controller.map.metersWide * 10) / viewport.width;
    const insetY = (controller.map.metersHigh * 10) / viewport.height;
    points.push({
      key: "rotate",
      label: "Rotate ability",
      point: {
        x: Math.max(
          insetX,
          Math.min(controller.map.metersWide - insetX, candidate.x),
        ),
        y: Math.max(
          insetY,
          Math.min(controller.map.metersHigh - insetY, candidate.y),
        ),
      },
    });
  }
  return points;
}

function SelectionHandles({ controller }: { controller: BoardController }) {
  const ui = useSyncExternalStore(
    controller.subscribeUi,
    controller.getUi,
    controller.getUi,
  );
  const id = ui.selected?.id ?? "";
  const object = useObject(controller, id);
  const container = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const update = () => {
      const current = controller.getObject(id);
      if (current?.kind !== "ability" || !container.current) return;
      for (const handle of handlePoints(current, controller)) {
        const button = container.current.querySelector<HTMLButtonElement>(
          `[data-board-handle="${handle.key}"]`,
        );
        if (button) setPosition(button, handle.point, controller);
      }
    };
    update();
    return controller.subscribeFrame(update);
  }, [controller, id, object]);
  if (object?.kind !== "ability") return null;
  return (
    <div ref={container} className="absolute inset-0 pointer-events-none">
      {handlePoints(object, controller).map((handle) => {
        const p = mapToScreen(
          handle.point,
          controller.getViewport(),
          controller.map,
        );
        return (
          <button
            key={handle.key}
            type="button"
            data-board-object={id}
            data-board-handle={handle.key}
            aria-label={handle.label}
            title={handle.label}
            style={{
              left: 0,
              top: 0,
              transform: `translate3d(${p.x}px, ${p.y}px, 0)`,
            }}
            className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 size-3.5 rounded-full border border-white/80 bg-black/80 cursor-grab z-10 after:absolute after:-inset-2.5 after:rounded-full focus-visible:ring-2 focus-visible:ring-val-red"
          />
        );
      })}
    </div>
  );
}

function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: Stroke,
  width: number,
  height: number,
  map: MapCalibration,
  from = 0,
  erase = false,
) {
  if (!stroke.points.length) return;
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = stroke.width;
  context.strokeStyle = stroke.color;
  context.fillStyle = stroke.color;
  context.globalCompositeOperation =
    erase || stroke.type === "eraser" ? "destination-out" : "source-over";
  const points = stroke.points;
  const first = mapToScreen(
    points[Math.max(0, from - 1)],
    { width, height },
    map,
  );
  if (points.length === 1) {
    context.beginPath();
    context.arc(first.x, first.y, stroke.width / 2, 0, Math.PI * 2);
    context.fill();
  } else {
    context.beginPath();
    context.moveTo(first.x, first.y);
    for (let i = Math.max(1, from); i < points.length; i++) {
      const point = mapToScreen(points[i], { width, height }, map);
      context.lineTo(point.x, point.y);
    }
    context.stroke();
    if (stroke.type === "arrow") {
      const last = mapToScreen(points.at(-1)!, { width, height }, map);
      const start = mapToScreen(points[0], { width, height }, map);
      const angle = Math.atan2(last.y - start.y, last.x - start.x);
      const head = Math.max(10, stroke.width * 3);
      context.beginPath();
      context.moveTo(last.x, last.y);
      context.lineTo(
        last.x - head * Math.cos(angle - Math.PI / 6),
        last.y - head * Math.sin(angle - Math.PI / 6),
      );
      context.lineTo(
        last.x - head * Math.cos(angle + Math.PI / 6),
        last.y - head * Math.sin(angle + Math.PI / 6),
      );
      context.closePath();
      context.fill();
    }
  }
  context.restore();
}

/** Native paths retain offscreen geometry while a drawing moves into view. */
function cacheStroke(
  stroke: Stroke,
  width: number,
  height: number,
  map: MapCalibration,
) {
  const line = new Path2D(),
    fill = new Path2D();
  const points = stroke.points.map((point) =>
    mapToScreen(point, { width, height }, map),
  );
  if (points.length === 1)
    fill.arc(points[0].x, points[0].y, stroke.width / 2, 0, Math.PI * 2);
  if (points.length > 1) {
    line.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) line.lineTo(point.x, point.y);
    if (stroke.type === "arrow") {
      const last = points.at(-1)!,
        start = points[0];
      const angle = Math.atan2(last.y - start.y, last.x - start.x),
        head = Math.max(10, stroke.width * 3);
      fill.moveTo(last.x, last.y);
      fill.lineTo(
        last.x - head * Math.cos(angle - Math.PI / 6),
        last.y - head * Math.sin(angle - Math.PI / 6),
      );
      fill.lineTo(
        last.x - head * Math.cos(angle + Math.PI / 6),
        last.y - head * Math.sin(angle + Math.PI / 6),
      );
      fill.closePath();
    }
  }
  return { line, fill };
}

export function InkLayer({ controller }: { controller: BoardController }) {
  const committed = useRef<HTMLCanvasElement>(null);
  const live = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const background = committed.current!,
      foreground = live.current!;
    const bg = background.getContext("2d")!,
      fg = foreground.getContext("2d")!;
    let width = 0,
      height = 0,
      lastId = "",
      lastCount = 0,
      wasErasing = false;
    let strokes: readonly Stroke[] = [];
    let moveCache: {
      object: Stroke;
      before: HTMLCanvasElement;
      active: ReturnType<typeof cacheStroke>;
      after: HTMLCanvasElement;
      mask: HTMLCanvasElement;
    } | null = null;
    const bitmap = () => {
      const canvas = document.createElement("canvas");
      canvas.width = background.width;
      canvas.height = background.height;
      const context = canvas.getContext("2d")!;
      context.setTransform(
        background.width / width,
        0,
        0,
        background.height / height,
        0,
        0,
      );
      return { canvas, context };
    };
    const redraw = () => {
      bg.clearRect(0, 0, width, height);
      for (const stroke of strokes)
        drawStroke(bg, stroke, width, height, controller.map);
    };
    const sync = () => {
      const next = controller.store
        .getSnapshot()
        .objects.filter((object): object is Stroke => object.kind === "stroke");
      if (
        next.length !== strokes.length ||
        next.some((stroke, i) => stroke !== strokes[i])
      ) {
        strokes = next;
        moveCache = null;
        redraw();
        lastCount = 0;
      }
    };
    const paint = () => {
      const preview = controller.getPreview();
      if (preview?.kind !== "stroke") {
        if (lastId) fg.clearRect(0, 0, width, height);
        if (wasErasing) redraw();
        lastId = "";
        lastCount = 0;
        wasErasing = false;
        moveCache = null;
        return;
      }
      // Cache surrounding paint and the selected native path, preserving eraser order.
      const existing = controller.store.getObject(preview.id);
      if (existing?.kind === "stroke") {
        if (moveCache?.object !== existing) {
          const before = bitmap(),
            after = bitmap(),
            mask = bitmap();
          mask.context.fillStyle = "#ffffff";
          mask.context.fillRect(0, 0, width, height);
          let passed = false;
          for (const stroke of strokes) {
            if (stroke.id === existing.id) {
              passed = true;
              continue;
            }
            drawStroke(
              passed ? after.context : before.context,
              stroke,
              width,
              height,
              controller.map,
            );
            // Both later paint and eraser attenuate the layers below them.
            if (passed)
              drawStroke(
                mask.context,
                stroke,
                width,
                height,
                controller.map,
                0,
                true,
              );
          }
          moveCache = {
            object: existing,
            before: before.canvas,
            active: cacheStroke(existing, width, height, controller.map),
            after: after.canvas,
            mask: mask.canvas,
          };
        }
        bg.clearRect(0, 0, width, height);
        bg.drawImage(moveCache.before, 0, 0, width, height);
        const from = mapToScreen(
          existing.points[0],
          { width, height },
          controller.map,
        );
        const to = mapToScreen(
          preview.points[0],
          { width, height },
          controller.map,
        );
        bg.save();
        bg.translate(to.x - from.x, to.y - from.y);
        bg.lineCap = "round";
        bg.lineJoin = "round";
        bg.lineWidth = existing.width;
        bg.strokeStyle = existing.color;
        bg.fillStyle = existing.color;
        bg.globalCompositeOperation =
          existing.type === "eraser" ? "destination-out" : "source-over";
        bg.stroke(moveCache.active.line);
        bg.fill(moveCache.active.fill);
        bg.restore();
        bg.globalCompositeOperation = "destination-in";
        bg.drawImage(moveCache.mask, 0, 0, width, height);
        bg.globalCompositeOperation = "source-over";
        bg.drawImage(moveCache.after, 0, 0, width, height);
        wasErasing = true;
        return;
      }
      const incremental = preview.type === "pen" || preview.type === "eraser";
      if (preview.id !== lastId || !incremental) {
        fg.clearRect(0, 0, width, height);
        lastCount = 0;
      }
      if (preview.points.length > lastCount || !incremental)
        drawStroke(
          preview.type === "eraser" ? bg : fg,
          preview,
          width,
          height,
          controller.map,
          incremental ? lastCount : 0,
        );
      lastId = preview.id;
      lastCount = preview.points.length;
      wasErasing = preview.type === "eraser";
    };
    const resize = () => {
      const rect = background.parentElement!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = window.devicePixelRatio || 1;
      for (const canvas of [background, foreground]) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      lastCount = 0;
      moveCache = null;
      redraw();
      paint();
    };
    sync();
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(background.parentElement!);
    const unsubStore = controller.store.subscribe(sync),
      unsubFrame = controller.subscribeFrame(paint);
    return () => {
      observer.disconnect();
      unsubStore();
      unsubFrame();
    };
  }, [controller]);
  return (
    <Fragment>
      <canvas
        ref={committed}
        data-board-ink
        className="absolute inset-0 pointer-events-none"
      />
      <canvas
        ref={live}
        data-board-live-ink
        className="absolute inset-0 pointer-events-none"
      />
    </Fragment>
  );
}

export function BoardObjects({ controller }: { controller: BoardController }) {
  const ids = useSyncExternalStore(
    controller.store.subscribeStructure,
    controller.store.getIds,
    controller.store.getIds,
  );
  const ui = useSyncExternalStore(
    controller.subscribeUi,
    controller.getUi,
    controller.getUi,
  );
  const tokens = ids.filter(
    (id) => controller.store.getObject(id)?.kind !== "stroke",
  );
  const shown =
    ui.draftId && !ids.includes(ui.draftId) ? [...tokens, ui.draftId] : tokens;
  return (
    <>
      <svg
        data-board-shapes
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ willChange: "transform", contain: "strict" }}
        viewBox={`0 0 ${controller.map.metersWide} ${controller.map.metersHigh}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        {tokens.map((id) => (
          <ObjectShape
            key={id}
            id={id}
            controller={controller}
            hidden={ui.activeId === id}
          />
        ))}
      </svg>
      <svg
        data-board-preview-shapes
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          willChange: "transform",
          overflow: "visible",
          transformOrigin: "0 0",
        }}
        viewBox={`0 0 ${controller.map.metersWide} ${controller.map.metersHigh}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <PreviewShape controller={controller} />
      </svg>
      {shown.map((id) => (
        <ObjectToken key={id} id={id} controller={controller} />
      ))}
      <SelectionHandles controller={controller} />
    </>
  );
}
