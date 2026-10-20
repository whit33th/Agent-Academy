"use client";
import {
  useState,
  useEffect,
  useEffectEvent,
  useRef,
  useCallback,
} from "react";
import { useBodyScrollLock } from "@/lib/utils/body-scroll-lock";
import { audio } from "@/lib/audio";
import type { Agent, AgentAbility } from "@/lib/types";
import { findAbilityStats, metersToFraction } from "@/lib/data/ability-stats";
import type {
  TacticalBoardProps,
  Tool,
  Point,
  Stroke,
  PlacedAbility,
  PlacedAgent,
} from "./model";
import { COLORS, WIDTHS } from "./model";
import {
  clamp01,
  drawStroke,
  getAbilityStartPoint,
  getAbilityEndpoints,
} from "./geometry";
import { loadSharedBoard } from "./serialization";
import { createBoardLink } from "@/lib/desktop/board-links";
export function useTacticalBoardSession({
  map,
  allAgents,
  initialStateStr,
  onClose,
}: TacticalBoardProps) {
  useBodyScrollLock(true);
  const dragCleanup = useRef<(() => void) | null>(null);
  const redrawRef = useRef<() => void>(() => {});
  useEffect(() => () => dragCleanup.current?.(), []);
  const overlayRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement>(null);
  const dimsRef = useRef({ w: 0, h: 0 });

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [shareError, setShareError] = useState<string | null>(null);

  const [strokes, setStrokes] = useState<Stroke[]>(
    () => loadSharedBoard(initialStateStr).strokes,
  );
  const [placedAbilities, setPlacedAbilities] = useState<PlacedAbility[]>(
    () => loadSharedBoard(initialStateStr).placedAbilities,
  );
  const [placedAgents, setPlacedAgents] = useState<PlacedAgent[]>(
    () => loadSharedBoard(initialStateStr).placedAgents,
  );

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [armedAbility, setArmedAbility] = useState<AgentAbility | null>(null);
  const [armedAgentDrop, setArmedAgentDrop] = useState(false);
  const [rotatingAbilityId, setRotatingAbilityId] = useState<string | null>(
    null,
  );

  const activeStrokeRef = useRef<Stroke | null>(null);
  const onBoardKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "z"
    ) {
      event.preventDefault();
      setStrokes((rows) => rows.slice(0, -1));
    }
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onBoardKey(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  // ─── Sizing (HiDPI canvases + ResizeObserver) ───────────────────────────
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const resize = () => {
      const rect = overlay.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      dimsRef.current = { w: rect.width, h: rect.height };

      for (const c of [bgCanvasRef.current, fgCanvasRef.current]) {
        if (!c) continue;
        c.width = rect.width * dpr;
        c.height = rect.height * dpr;
        c.style.width = rect.width + "px";
        c.style.height = rect.height + "px";
        const ctx = c.getContext("2d");
        ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      redrawRef.current();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(overlay);
    return () => ro.disconnect();
  }, []);

  // ─── Redraw committed strokes whenever they change ──────────────────────
  const redrawCommitted = useCallback(() => {
    const canvas = bgCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { w, h } = dimsRef.current;
    ctx.clearRect(0, 0, w, h);
    for (const s of strokes) drawStroke(ctx, s, w, h);
  }, [strokes]);

  useEffect(() => {
    redrawRef.current = redrawCommitted;
    redrawCommitted();
  }, [redrawCommitted]);

  // ─── Pointer handlers on the map overlay ────────────────────────────────
  const ptFromEvent = (e: React.PointerEvent): Point => {
    const overlay = overlayRef.current;
    if (!overlay) return { x: 0, y: 0 };
    const rect = overlay.getBoundingClientRect();
    return {
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01((e.clientY - rect.top) / rect.height),
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Ability placement intercepts everything
    if (armedAbility && selectedAgent) {
      e.preventDefault();
      placeAbilityAt(ptFromEvent(e));
      return;
    }
    if (armedAgentDrop && selectedAgent) {
      e.preventDefault();
      placeAgentAt(ptFromEvent(e));
      return;
    }
    if (tool === "select") return;
    if (e.button !== 0) return;

    e.preventDefault();
    overlayRef.current?.setPointerCapture(e.pointerId);

    const pt = ptFromEvent(e);
    const stroke: Stroke = {
      id: crypto.randomUUID(),
      type: tool as Stroke["type"],
      color,
      width,
      points: [pt],
    };
    activeStrokeRef.current = stroke;

    const fg = (
      tool === "eraser" ? bgCanvasRef : fgCanvasRef
    ).current?.getContext("2d");
    if (!fg) return;
    const { w, h } = dimsRef.current;

    if (tool === "pen" || tool === "eraser") {
      fg.lineCap = "round";
      fg.lineJoin = "round";
      fg.strokeStyle = tool === "eraser" ? "#000" : color;
      fg.lineWidth = width;
      fg.globalCompositeOperation =
        tool === "eraser" ? "destination-out" : "source-over";
      fg.beginPath();
      fg.moveTo(pt.x * w, pt.y * h);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const stroke = activeStrokeRef.current;
    if (!stroke) return;

    const fg = (
      stroke.type === "eraser" ? bgCanvasRef : fgCanvasRef
    ).current?.getContext("2d");
    if (!fg) return;
    const { w, h } = dimsRef.current;
    const pt = ptFromEvent(e);

    if (stroke.type === "pen" || stroke.type === "eraser") {
      // Incremental: just extend the current path. Cheapest possible.
      stroke.points.push(pt);
      fg.lineTo(pt.x * w, pt.y * h);
      fg.stroke();
    } else {
      // line / arrow — only two points; clear & redraw.
      stroke.points = [stroke.points[0], pt];
      fg.clearRect(0, 0, w, h);
      drawStroke(fg, stroke, w, h);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const stroke = activeStrokeRef.current;
    if (!stroke) return;
    activeStrokeRef.current = null;
    try {
      overlayRef.current?.releasePointerCapture(e.pointerId);
    } catch {}

    // Clear live canvas (committed canvas redraws via effect)
    const fg = fgCanvasRef.current?.getContext("2d");
    const { w, h } = dimsRef.current;
    fg?.clearRect(0, 0, w, h);

    if (stroke.points.length > 1) {
      setStrokes((prev) => [...prev, stroke]);
    }
  };

  // ─── Ability / agent placement ──────────────────────────────────────────
  const placeAbilityAt = (pt: Point) => {
    if (!armedAbility || !selectedAgent) return;
    const stats = findAbilityStats(armedAbility.displayName);
    const accent = selectedAgent.accentColor || "#ff4655";
    const length =
      stats?.lengthM != null
        ? metersToFraction(stats.lengthM, map.name)
        : undefined;
    const coneRange =
      stats?.coneRangeM != null
        ? metersToFraction(stats.coneRangeM, map.name)
        : undefined;
    const initialReach = length ?? coneRange;
    const isBarrierMesh = armedAbility.displayName
      .toLowerCase()
      .includes("barrier mesh");
    const initialRotation = isBarrierMesh ? 45 : 0;
    const halfReach = initialReach != null ? initialReach / 2 : 0;
    const placeRad = (initialRotation * Math.PI) / 180;

    setPlacedAbilities((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        agentName: selectedAgent.name,
        abilityName: armedAbility.displayName,
        abilityIcon: armedAbility.displayIcon,
        color: accent,
        shape: stats?.shape ?? "point",
        radius:
          stats?.radiusM != null
            ? metersToFraction(stats.radiusM, map.name)
            : undefined,
        length,
        coneAngle: stats?.coneAngleDeg,
        coneRange,
        x: pt.x,
        y: pt.y,
        endX:
          initialReach != null
            ? clamp01(pt.x + Math.cos(placeRad) * halfReach)
            : undefined,
        endY:
          initialReach != null
            ? clamp01(pt.y + Math.sin(placeRad) * halfReach)
            : undefined,
        rotation: initialRotation,
      },
    ]);
    audio.playClick();
    setArmedAbility(null);
  };

  const placeAgentAt = (pt: Point) => {
    if (!selectedAgent) return;
    setPlacedAgents((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        agentName: selectedAgent.name,
        iconUrl: selectedAgent.displayIcon || selectedAgent.imageUrl || "",
        x: pt.x,
        y: pt.y,
      },
    ]);
    audio.playClick();
    setArmedAgentDrop(false);
  };

  // ─── Token drag (move existing placement) ───────────────────────────────
  const startTokenDrag = useCallback(
    (e: React.PointerEvent, kind: "ability" | "agent", id: string) => {
      e.stopPropagation();
      e.preventDefault();
      const overlay = overlayRef.current;
      if (!overlay) return;

      let frame = 0;
      let nextPoint: Point | null = null;
      const commit = (point: Point) => {
        if (kind === "ability") {
          setPlacedAbilities((prev) =>
            prev.map((p) =>
              p.id === id
                ? {
                    ...p,
                    ...point,
                    ...(p.endX === undefined
                      ? {}
                      : { endX: clamp01(p.endX + point.x - p.x) }),
                    ...(p.endY === undefined
                      ? {}
                      : { endY: clamp01(p.endY + point.y - p.y) }),
                  }
                : p,
            ),
          );
        } else {
          setPlacedAgents((prev) =>
            prev.map((p) => (p.id === id ? { ...p, ...point } : p)),
          );
        }
      };
      const onMove = (ev: PointerEvent) => {
        const rect = overlay.getBoundingClientRect();
        nextPoint = {
          x: clamp01((ev.clientX - rect.left) / rect.width),
          y: clamp01((ev.clientY - rect.top) / rect.height),
        };
        if (!frame) {
          frame = requestAnimationFrame(() => {
            frame = 0;
            if (nextPoint) commit(nextPoint);
          });
        }
      };
      const onUp = () => {
        if (frame) cancelAnimationFrame(frame);
        if (nextPoint) commit(nextPoint);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      dragCleanup.current?.();
      dragCleanup.current = () => {
        if (frame) cancelAnimationFrame(frame);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointercancel", onUp, { once: true });
      window.addEventListener("pointerup", onUp);
    },
    [],
  );

  // ─── Wall / cone rotation around the anchor (start) point ───────────────
  const startRotateAbility = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      e.preventDefault();
      const overlay = overlayRef.current;
      if (!overlay) return;

      const current = placedAbilities.find((a) => a.id === id);
      if (!current) return;

      const anchor = getAbilityStartPoint(current);

      const onMove = (ev: PointerEvent) => {
        const rect = overlay.getBoundingClientRect();
        const ax = rect.left + anchor.x * rect.width;
        const ay = rect.top + anchor.y * rect.height;
        const rad = Math.atan2(ev.clientY - ay, ev.clientX - ax);
        const deg = (rad * 180) / Math.PI;
        const half = (current.length ?? current.coneRange ?? 0) / 2;
        setPlacedAbilities((prev) =>
          prev.map((p) => {
            if (p.id !== id) return p;
            const newCenter = {
              x: clamp01(anchor.x + Math.cos(rad) * half),
              y: clamp01(anchor.y + Math.sin(rad) * half),
            };
            const newEnd = {
              x: clamp01(anchor.x + Math.cos(rad) * half * 2),
              y: clamp01(anchor.y + Math.sin(rad) * half * 2),
            };
            return {
              ...p,
              x: newCenter.x,
              y: newCenter.y,
              rotation: deg,
              endX: newEnd.x,
              endY: newEnd.y,
            };
          }),
        );
      };
      const onUp = () => {
        setRotatingAbilityId(null);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      setRotatingAbilityId(id);
      dragCleanup.current?.();
      dragCleanup.current = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointercancel", onUp, { once: true });
      window.addEventListener("pointerup", onUp);
    },
    [placedAbilities],
  );

  // ─── Drag the start handle to translate the whole wall ───────────────────
  const startAbilityStartDrag = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      e.preventDefault();
      const overlay = overlayRef.current;
      if (!overlay) return;

      const current = placedAbilities.find((ability) => ability.id === id);
      if (!current || (current.length == null && current.coneRange == null))
        return;

      const { start, end } = getAbilityEndpoints(current);
      const onMove = (ev: PointerEvent) => {
        const rect = overlay.getBoundingClientRect();
        const newStart = {
          x: clamp01((ev.clientX - rect.left) / rect.width),
          y: clamp01((ev.clientY - rect.top) / rect.height),
        };
        const dx = newStart.x - start.x;
        const dy = newStart.y - start.y;
        const newEnd = {
          x: clamp01(end.x + dx),
          y: clamp01(end.y + dy),
        };
        const newCenter = {
          x: clamp01((newStart.x + newEnd.x) / 2),
          y: clamp01((newStart.y + newEnd.y) / 2),
        };
        const newRotation =
          (Math.atan2(newEnd.y - newStart.y, newEnd.x - newStart.x) * 180) /
          Math.PI;
        setPlacedAbilities((prev) =>
          prev.map((ability) =>
            ability.id === id
              ? {
                  ...ability,
                  x: newCenter.x,
                  y: newCenter.y,
                  rotation: newRotation,
                  endX: newEnd.x,
                  endY: newEnd.y,
                }
              : ability,
          ),
        );
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      dragCleanup.current?.();
      dragCleanup.current = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointercancel", onUp, { once: true });
      window.addEventListener("pointerup", onUp);
    },
    [placedAbilities],
  );

  // ─── Toolbar actions ─────────────────────────────────────────────────────
  const handleUndo = () => {
    setStrokes((prev) => prev.slice(0, -1));
    audio.playClick();
  };
  const handleReset = () => {
    setStrokes([]);
    setPlacedAbilities([]);
    setPlacedAgents([]);
    setSelectedAgent(null);
    setArmedAbility(null);
    audio.playClick();
  };
  const handleShare = async () => {
    try {
      setShareError(null);
      const payload = btoa(
        JSON.stringify({ strokes, placedAbilities, placedAgents }),
      );
      if (window.agentAcademy)
        await window.agentAcademy.copyBoardLink(map._id, payload);
      else
        await navigator.clipboard.writeText(createBoardLink(map._id, payload));
      audio.playClick();
    } catch (error) {
      setShareError(
        error instanceof Error
          ? error.message
          : "The board link could not be copied.",
      );
    }
  };

  // ─── Agent strip: vertical-wheel → horizontal-scroll ────────────────────
  const agentStripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = agentStripRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────
  const bgImage = map.displayIcon || map.imageUrl;
  const cursorMode =
    armedAbility || armedAgentDrop
      ? "crosshair"
      : tool === "select"
        ? "default"
        : "crosshair";

  return {
    map,
    allAgents,
    onClose,
    tool,
    color,
    width,
    setTool,
    setColor,
    setWidth,
    setArmedAbility,
    setArmedAgentDrop,
    handleUndo,
    handleShare,
    handleReset,
    overlayRef,
    bgCanvasRef,
    fgCanvasRef,
    agentStripRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    placedAbilities,
    placedAgents,
    setPlacedAbilities,
    setPlacedAgents,
    rotatingAbilityId,
    startRotateAbility,
    startTokenDrag,
    startAbilityStartDrag,
    selectedAgent,
    setSelectedAgent,
    armedAbility,
    armedAgentDrop,
    bgImage,
    cursorMode,
    shareError,
  };
}
