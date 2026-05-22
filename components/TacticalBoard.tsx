"use client";

import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import Image from "next/image";
import {
  X,
  Undo2,
  Share2,
  Pencil,
  Minus,
  MoveUpRight,
  Eraser,
  Trash,
  Users,
  MapPin,
} from "lucide-react";
import { audio } from "@/lib/audio";
import type { GameMap, Agent, AgentAbility } from "@/lib/types";
import {
  findAbilityStats,
  metersToFraction,
  type AbilityShape,
} from "@/lib/data/ability-stats";
import { findMapRecord, worldToMinimap } from "@/lib/generated/valorant-maps";

// ───────────────────────────────────────────────────────────────────────────
// Types

interface TacticalBoardProps {
  map: GameMap;
  allAgents: Agent[];
  initialStateStr?: string;
  onClose: () => void;
}

type Tool = "select" | "pen" | "line" | "arrow" | "eraser";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  type: "pen" | "line" | "arrow" | "eraser";
  color: string;
  width: number;
  points: Point[];
}

interface PlacedAbility {
  id: string;
  agentName: string;
  abilityName: string;
  abilityIcon: string | null;
  color: string;
  shape: AbilityShape;
  radius?: number;
  length?: number;
  coneAngle?: number;
  coneRange?: number;
  x: number;
  y: number;
  endX?: number;
  endY?: number;
  rotation: number;
}

interface PlacedAgent {
  id: string;
  agentName: string;
  iconUrl: string;
  x: number;
  y: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Constants

const COLORS = [
  "#ff4655",
  "#00f3ff",
  "#ffd400",
  "#7c5cff",
  "#5cff8d",
  "#ffffff",
];
const WIDTHS = [2, 4, 8];

// ───────────────────────────────────────────────────────────────────────────
// Main component

export default function TacticalBoard({
  map,
  allAgents,
  initialStateStr,
  onClose,
}: TacticalBoardProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement>(null);
  const dimsRef = useRef({ w: 0, h: 0 });

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [placedAbilities, setPlacedAbilities] = useState<PlacedAbility[]>([]);
  const [placedAgents, setPlacedAgents] = useState<PlacedAgent[]>([]);

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [armedAbility, setArmedAbility] = useState<AgentAbility | null>(null);
  const [armedAgentDrop, setArmedAgentDrop] = useState(false);
  const [rotatingAbilityId, setRotatingAbilityId] = useState<string | null>(
    null,
  );

  const activeStrokeRef = useRef<Stroke | null>(null);

  // ─── Load shared state from URL ─────────────────────────────────────────
  useEffect(() => {
    if (!initialStateStr) return;
    try {
      const parsed = JSON.parse(atob(initialStateStr));
      if (Array.isArray(parsed.strokes)) setStrokes(parsed.strokes);
      if (Array.isArray(parsed.placedAbilities))
        setPlacedAbilities(parsed.placedAbilities);
      if (Array.isArray(parsed.placedAgents))
        setPlacedAgents(parsed.placedAgents);
    } catch {
      /* corrupted — ignore */
    }
  }, [initialStateStr]);

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
    redrawCommitted();
  }, [redrawCommitted]);

  // ─── Pointer handlers on the map overlay ────────────────────────────────
  const ptFromEvent = (e: React.PointerEvent): Point => {
    const overlay = overlayRef.current;
    if (!overlay) return { x: 0, y: 0 };
    const rect = overlay.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
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

    const fg = fgCanvasRef.current?.getContext("2d");
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

    const fg = fgCanvasRef.current?.getContext("2d");
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
            prev.map((p) => (p.id === id ? { ...p, ...point } : p)),
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
      };
      window.addEventListener("pointermove", onMove);
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
      };
      setRotatingAbilityId(id);
      window.addEventListener("pointermove", onMove);
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
      };
      window.addEventListener("pointermove", onMove);
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
      const payload = btoa(
        JSON.stringify({ strokes, placedAbilities, placedAgents }),
      );
      const url = new URL(window.location.href);
      url.searchParams.set("strat", payload);
      await navigator.clipboard.writeText(url.toString());
      audio.playClick();
    } catch {
      /* ignore */
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
  const bgImage = map.displayIcon || map.imageUrl || "/grid_bg.png";
  const cursorMode =
    armedAbility || armedAgentDrop
      ? "crosshair"
      : tool === "select"
        ? "default"
        : "crosshair";

  return (
    <div className="fixed inset-0 z-100 bg-black/95 backdrop-blur-sm flex flex-col">
      {/* Top toolbar */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-val-surface/95 border-b border-white/10">
        <h2 className="font-oswald text-base font-bold uppercase tracking-wider text-white">
          Strat Board — <span className="text-val-red">{map.name}</span>
        </h2>
        <div className="flex items-center gap-1.5">
          <Toolbar
            tool={tool}
            color={color}
            width={width}
            onToolChange={(t) => {
              setTool(t);
              setArmedAbility(null);
              setArmedAgentDrop(false);
            }}
            onColorChange={setColor}
            onWidthChange={setWidth}
          />
          <ToolIconButton onClick={handleUndo} label="Undo">
            <Undo2 size={14} />
          </ToolIconButton>
          <ToolIconButton onClick={handleShare} label="Copy share link">
            <Share2 size={14} />
          </ToolIconButton>
          <ToolIconButton onClick={handleReset} label="Reset board">
            <Trash size={14} />
          </ToolIconButton>
          <ToolIconButton onClick={onClose} label="Close">
            <X size={14} />
          </ToolIconButton>
        </div>
      </header>

      {/* Workspace */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex justify-center items-center p-3 min-h-0">
          <div
            ref={overlayRef}
            className="relative aspect-square h-full max-w-full touch-none select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ cursor: cursorMode }}
          >
            <Image
              src={bgImage}
              alt={map.name}
              fill
              draggable={false}
              priority
              unoptimized
              className="object-contain pointer-events-none"
            />
            <canvas
              ref={bgCanvasRef}
              className="absolute inset-0 pointer-events-none"
            />
            <canvas
              ref={fgCanvasRef}
              className="absolute inset-0 pointer-events-none"
            />

            <MapCalloutLayer mapName={map.name} />

            {/* SVG layer: ability shapes (smokes, walls, cones) */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              {placedAbilities.map((a) => (
                <AbilityShapeSvg key={a.id} ability={a} />
              ))}
            </svg>

            {/* Ability icon tokens (drag to move, dbl-click to delete) */}
            {placedAbilities.map((a) => (
              <Fragment key={`${a.id}-frag`}>
                <AbilityToken
                  ability={a}
                  onPointerDown={(e) =>
                    e.shiftKey
                      ? startRotateAbility(e, a.id)
                      : startTokenDrag(e, "ability", a.id)
                  }
                  onRotatePointerDown={(e) => startRotateAbility(e, a.id)}
                  onDelete={() =>
                    setPlacedAbilities((prev) =>
                      prev.filter((p) => p.id !== a.id),
                    )
                  }
                  isRotating={rotatingAbilityId === a.id}
                />
                {(a.shape === "wall" || a.shape === "cone") &&
                  (a.length != null || a.coneRange != null) && (
                    <StartHandle
                      ability={a}
                      onPointerDown={(e) => startAbilityStartDrag(e, a.id)}
                    />
                  )}
              </Fragment>
            ))}

            {/* Agent tokens */}
            {placedAgents.map((a) => (
              <AgentToken
                key={a.id}
                placed={a}
                onPointerDown={(e) => startTokenDrag(e, "agent", a.id)}
                onDelete={() =>
                  setPlacedAgents((prev) => prev.filter((p) => p.id !== a.id))
                }
              />
            ))}
          </div>
        </div>

        {/* Ability picker row (visible when an agent is selected) */}
        {selectedAgent && (
          <div className="flex items-center gap-1.5 px-4 py-2 justify-center bg-val-surface/90 border-t border-white/10 overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-1.5">
              {selectedAgent.abilities
                .filter((ab) => ab.displayIcon)
                .map((ab) => {
                  const isArmed = armedAbility?.displayName === ab.displayName;
                  const stats = findAbilityStats(ab.displayName);
                  const meta = formatAbilityMeta(ab.displayName);
                  return (
                    <button
                      key={ab.displayName}
                      type="button"
                      onClick={() => {
                        audio.playClick();
                        setArmedAbility(isArmed ? null : ab);
                        setArmedAgentDrop(false);
                      }}
                      title={`${ab.displayName}${meta ? ` — ${meta}` : ""}`}
                      className={`relative size-10 xl:size-14 rounded-sm border transition-colors cursor-pointer ${
                        isArmed
                          ? "border-val-red bg-val-red/20"
                          : "border-white/10 bg-white/5 hover:border-white/40"
                      }`}
                    >
                      <Image
                        src={ab.displayIcon!}
                        alt={ab.displayName}
                        fill
                        className="object-contain p-1"
                        unoptimized
                      />
                      {stats && stats.shape !== "point" && (
                        <span className="absolute -bottom-1 -right-1 rounded-xs bg-black/90 px-1 py-0.5 text-[7px] font-black uppercase leading-none text-val-teal ring-1 ring-val-teal/40">
                          {stats.shape === "circle"
                            ? "AOE"
                            : stats.shape === "wall"
                              ? "WALL"
                              : stats.shape === "cone"
                                ? "CONE"
                                : "X"}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={() => {
                audio.playClick();
                setArmedAgentDrop((v) => !v);
                setArmedAbility(null);
              }}
              title="Place agent token on map"
              className={`flex relative items-center gap-1.5 w-auto aspect-square justify-center h-full rounded-full border-2 border-white text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0 cursor-pointer ${
                armedAgentDrop
                  ? "border-val-teal bg-val-teal/20 text-val-teal"
                  : " bg-white/5 text-white/70  hover:text-white"
              }`}
            >
              {selectedAgent.displayIcon && (
                <Image
                  src={selectedAgent.displayIcon}
                  alt={selectedAgent.name}
                  fill
                  sizes="56px"
                  className="rounded-full"
                  unoptimized
                />
              )}
            </button>
          </div>
        )}

        {/* Bottom agent strip */}
        <div
          ref={agentStripRef}
          className="flex items-center gap-2 px-4 py-3 bg-val-surface/95 border-t border-white/10 overflow-x-auto custom-scrollbar"
        >
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/40 font-bold mr-2 shrink-0">
            <Users size={12} /> Agents
          </span>
          {allAgents.map((agent) => {
            const isSelected = selectedAgent?._id === agent._id;
            const icon = agent.displayIcon || agent.imageUrl || "";
            return (
              <button
                key={agent._id}
                type="button"
                onClick={() => {
                  audio.playClick();
                  setSelectedAgent(isSelected ? null : agent);
                  setArmedAbility(null);
                  setArmedAgentDrop(false);
                }}
                onMouseEnter={() => audio.playHover()}
                title={agent.name}
                className={`relative shrink-0 size-12 xl:size-16 rounded-sm border overflow-hidden transition-all cursor-pointer ${
                  isSelected
                    ? "border-val-red scale-110 ring-2 ring-val-red/40"
                    : "border-white/10 bg-white/5 hover:border-white/40"
                }`}
              >
                {icon ? (
                  <Image
                    src={icon}
                    alt={agent.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-[10px] font-bold text-white/60">
                    {agent.name.slice(0, 2)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers / sub-components

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function formatAbilityMeta(displayName: string): string {
  const stats = findAbilityStats(displayName);
  if (!stats) return "";
  const parts: string[] = [stats.shape.toUpperCase()];
  if (stats.radiusM != null && stats.radiusM < 100) {
    parts.push(`r ${stats.radiusM}m`);
  }
  if (stats.lengthM != null) {
    parts.push(`${stats.lengthM}m`);
  }
  if (stats.coneAngleDeg != null && stats.coneRangeM != null) {
    parts.push(`${stats.coneAngleDeg}° / ${stats.coneRangeM}m`);
  }
  if (stats.durationSec != null && stats.durationSec < 999) {
    parts.push(`${stats.durationSec}s`);
  }
  return parts.join(" · ");
}

function getAbilityEndpoints(ability: PlacedAbility): {
  start: Point;
  end: Point;
} {
  const reach = ability.length ?? ability.coneRange ?? 0;
  const radians = (ability.rotation * Math.PI) / 180;
  const half = reach / 2;
  const start = {
    x: clamp01(ability.x - Math.cos(radians) * half),
    y: clamp01(ability.y - Math.sin(radians) * half),
  };
  const end = {
    x: ability.endX ?? clamp01(ability.x + Math.cos(radians) * half),
    y: ability.endY ?? clamp01(ability.y + Math.sin(radians) * half),
  };
  return { start, end };
}

function getAbilityStartPoint(ability: PlacedAbility): Point {
  return getAbilityEndpoints(ability).start;
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  s: Stroke,
  w: number,
  h: number,
) {
  if (s.points.length === 0) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = s.width;
  ctx.strokeStyle = s.color;
  ctx.globalCompositeOperation =
    s.type === "eraser" ? "destination-out" : "source-over";

  ctx.beginPath();
  const first = s.points[0];
  ctx.moveTo(first.x * w, first.y * h);

  if (s.type === "pen" || s.type === "eraser") {
    for (let i = 1; i < s.points.length; i++) {
      ctx.lineTo(s.points[i].x * w, s.points[i].y * h);
    }
    ctx.stroke();
  } else {
    // line / arrow
    const last = s.points[s.points.length - 1];
    ctx.lineTo(last.x * w, last.y * h);
    ctx.stroke();
    if (s.type === "arrow") {
      const dx = (last.x - first.x) * w;
      const dy = (last.y - first.y) * h;
      const ang = Math.atan2(dy, dx);
      const head = Math.max(10, s.width * 3);
      ctx.beginPath();
      ctx.moveTo(last.x * w, last.y * h);
      ctx.lineTo(
        last.x * w - head * Math.cos(ang - Math.PI / 6),
        last.y * h - head * Math.sin(ang - Math.PI / 6),
      );
      ctx.lineTo(
        last.x * w - head * Math.cos(ang + Math.PI / 6),
        last.y * h - head * Math.sin(ang + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
    }
  }
  ctx.restore();
}

function AbilityShapeSvg({ ability }: { ability: PlacedAbility }) {
  const { x, y, shape, color } = ability;
  const cx = x * 100;
  const cy = y * 100;

  if (shape === "circle" && ability.radius != null) {
    const r = ability.radius * 100;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={color}
        fillOpacity={0.18}
        stroke={color}
        strokeOpacity={0.8}
        strokeWidth={0.3}
        strokeDasharray="0.8,0.5"
      />
    );
  }

  if (shape === "wall" && ability.length != null) {
    const halfLen = (ability.length * 100) / 2;
    return (
      <g transform={`rotate(${ability.rotation} ${cx} ${cy})`}>
        <line
          x1={cx - halfLen}
          y1={cy}
          x2={cx + halfLen}
          y2={cy}
          stroke={color}
          strokeOpacity={0.25}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <line
          x1={cx - halfLen}
          y1={cy}
          x2={cx + halfLen}
          y2={cy}
          stroke={color}
          strokeOpacity={0.9}
          strokeWidth={0.9}
          strokeLinecap="round"
        />
      </g>
    );
  }

  if (shape === "cross" && ability.length != null) {
    const halfLen = (ability.length * 100) / 2;
    const nodeR = Math.max((ability.radius ?? 0.025) * 100, 1.6);
    const nodes: [number, number][] = [
      [-halfLen, 0],
      [halfLen, 0],
      [0, -halfLen],
      [0, halfLen],
      [0, 0],
    ];

    return (
      <g transform={`rotate(${ability.rotation} ${cx} ${cy})`}>
        <line
          x1={cx - halfLen}
          y1={cy}
          x2={cx + halfLen}
          y2={cy}
          stroke={color}
          strokeOpacity={0.9}
          strokeWidth={0.8}
          strokeLinecap="round"
        />
        <line
          x1={cx}
          y1={cy - halfLen}
          x2={cx}
          y2={cy + halfLen}
          stroke={color}
          strokeOpacity={0.9}
          strokeWidth={0.8}
          strokeLinecap="round"
        />
        {nodes.map(([dx, dy]) => (
          <circle
            key={`${dx}-${dy}`}
            cx={cx + dx}
            cy={cy + dy}
            r={nodeR}
            fill={color}
            fillOpacity={0.22}
            stroke={color}
            strokeOpacity={0.9}
            strokeWidth={0.35}
          />
        ))}
      </g>
    );
  }

  if (
    shape === "cone" &&
    ability.coneRange != null &&
    ability.coneAngle != null
  ) {
    const range = ability.coneRange * 100;
    const half = (ability.coneAngle * Math.PI) / 360; // half angle in radians
    const x1 = cx + range * Math.cos(-half);
    const y1 = cy + range * Math.sin(-half);
    const x2 = cx + range * Math.cos(half);
    const y2 = cy + range * Math.sin(half);
    const largeArc = ability.coneAngle > 180 ? 1 : 0;
    return (
      <g transform={`rotate(${ability.rotation} ${cx} ${cy})`}>
        <path
          d={`M ${cx} ${cy} L ${x1} ${y1} A ${range} ${range} 0 ${largeArc} 1 ${x2} ${y2} Z`}
          fill={color}
          fillOpacity={0.14}
          stroke={color}
          strokeOpacity={0.7}
          strokeWidth={0.3}
        />
      </g>
    );
  }

  return null;
}

function AbilityToken({
  ability,
  onPointerDown,
  onRotatePointerDown,
  onDelete,
  isRotating,
}: {
  ability: PlacedAbility;
  onPointerDown: (e: React.PointerEvent) => void;
  onRotatePointerDown: (e: React.PointerEvent) => void;
  onDelete: () => void;
  isRotating: boolean;
}) {
  const canRotate =
    ability.shape === "wall" ||
    ability.shape === "cone" ||
    ability.shape === "cross";

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onDoubleClick={onDelete}
      className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 border-2 backdrop-blur-sm flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
      style={{
        left: `${ability.x * 100}%`,
        top: `${ability.y * 100}%`,
        borderColor: ability.color,
      }}
      title={`${ability.agentName} — ${ability.abilityName}  (drag to move, drag handle to rotate, double-click to delete)`}
    >
      {ability.abilityIcon ? (
        <Image
          src={ability.abilityIcon}
          alt={ability.abilityName}
          width={20}
          height={20}
          unoptimized
          draggable={false}
        />
      ) : (
        <span className="text-[8px] font-bold text-white">
          {ability.abilityName.slice(0, 2).toUpperCase()}
        </span>
      )}
      {canRotate && (
        <span
          role="button"
          tabIndex={-1}
          onPointerDown={onRotatePointerDown}
          className={`absolute left-1/2 -top-9 h-3.5 w-3.5 -translate-x-1/2 rounded-full border border-white/80 bg-black/80 cursor-ew-resize before:absolute before:left-1/2 before:top-full before:h-5 before:w-px before:-translate-x-1/2 before:bg-white/40 ${
            isRotating ? "ring-2 ring-val-red" : ""
          }`}
          aria-label="Rotate ability"
        />
      )}
    </button>
  );
}

function StartHandle({
  ability,
  onPointerDown,
}: {
  ability: PlacedAbility;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const start = getAbilityEndpoints(ability).start;

  return (
    <span
      role="button"
      tabIndex={-1}
      onPointerDown={onPointerDown}
      className="absolute -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border border-white/80 bg-black/80 cursor-grab z-10"
      style={{
        left: `${start.x * 100}%`,
        top: `${start.y * 100}%`,
      }}
      aria-label="Drag ability start"
    />
  );
}

/**
 * Renders Riot's official callout names (A Site, Lobby, Heaven, ...) using the
 * exact world-to-minimap transform from valorant-api.com. Site labels (A/B/C)
 * are emphasised, every other callout is shown as a subtle text marker.
 */
function MapCalloutLayer({ mapName }: { mapName: string }) {
  const record = findMapRecord(mapName);
  if (!record) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {record.callouts.map((c, idx) => {
        const { x, y } = worldToMinimap(c.worldX, c.worldY, record);
        if (x < 0 || x > 1 || y < 0 || y > 1) return null;
        const isSite = c.regionName.toLowerCase() === "site" && c.superRegion;
        const label = isSite ? c.superRegion! : c.regionName;
        return (
          <div
            key={`${c.regionName}-${c.superRegion}-${idx}`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
          >
            {isSite ? (
              <span className="grid size-7 place-items-center rounded-sm border border-val-teal/60 bg-black/55 font-oswald text-base font-bold text-white shadow-[0_0_16px_rgba(0,243,255,0.2)]">
                {label}
              </span>
            ) : (
              <span className="whitespace-nowrap rounded-sm bg-black/45 px-1 py-px font-oswald text-[10px] uppercase tracking-wide text-white/70">
                {label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AgentToken({
  placed,
  onPointerDown,
  onDelete,
}: {
  placed: PlacedAgent;
  onPointerDown: (e: React.PointerEvent) => void;
  onDelete: () => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onDoubleClick={onDelete}
      className="absolute -translate-x-1/2 -translate-y-1/2 size-8 xl:size-10 rounded-full border-2 border-white/85 overflow-hidden bg-black cursor-grab active:cursor-grabbing hover:scale-110 transition-transform shadow-lg"
      style={{ left: `${placed.x * 100}%`, top: `${placed.y * 100}%` }}
      title={`${placed.agentName}  (drag to move, double-click to delete)`}
    >
      {placed.iconUrl && (
        <Image
          src={placed.iconUrl}
          alt={placed.agentName}
          fill
          className="object-cover"
          unoptimized
          draggable={false}
        />
      )}
    </button>
  );
}

function ToolIconButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="p-2 rounded-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
    >
      {children}
    </button>
  );
}

function Toolbar({
  tool,
  color,
  width,
  onToolChange,
  onColorChange,
  onWidthChange,
}: {
  tool: Tool;
  color: string;
  width: number;
  onToolChange: (t: Tool) => void;
  onColorChange: (c: string) => void;
  onWidthChange: (w: number) => void;
}) {
  const tools: { key: Tool; icon: React.ReactNode; label: string }[] = [
    { key: "select", icon: <MoveUpRight size={14} />, label: "Select" },
    { key: "pen", icon: <Pencil size={14} />, label: "Pen" },
    { key: "line", icon: <Minus size={14} />, label: "Line" },
    { key: "arrow", icon: <MoveUpRight size={14} />, label: "Arrow" },
    { key: "eraser", icon: <Eraser size={14} />, label: "Eraser" },
  ];
  return (
    <div className="flex items-center gap-2 mr-1 pr-2 border-r border-white/10">
      <div className="flex items-center gap-0.5">
        {tools.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onToolChange(t.key)}
            title={t.label}
            aria-label={t.label}
            className={`p-2 rounded-sm transition-colors cursor-pointer ${
              tool === t.key
                ? "bg-val-red text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            {t.icon}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onColorChange(c)}
            title={c}
            aria-label={`Color ${c}`}
            className={`size-4 xl:size-5 rounded-full border transition-transform cursor-pointer ${
              color === c ? "scale-125 border-white" : "border-white/20"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1">
        {WIDTHS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => onWidthChange(w)}
            title={`Width ${w}px`}
            aria-label={`Width ${w}`}
            className={`p-2 rounded-sm transition-colors cursor-pointer ${
              width === w ? "bg-white/20" : "hover:bg-white/10"
            }`}
          >
            <span
              className="block bg-white rounded-full"
              style={{ width: w + 2, height: w + 2 }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
