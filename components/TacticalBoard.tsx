"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Undo2,
  Share2,
  Pencil,
  MoveUpRight,
  Eraser,
  Trash,
  ChevronDown,
  LayoutGrid,
} from "lucide-react";
import Image from "next/image";
import { audio } from "@/lib/audio";
import type { GameMap, Agent, AgentAbility } from "@/lib/types";

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */

interface TacticalBoardProps {
  map: GameMap;
  allAgents: Agent[];
  initialStateStr?: string;
  onClose: () => void;
}

interface DrawingPoint {
  x: number;
  y: number;
}

interface DrawingStroke {
  type: "pen" | "line" | "arrow" | "eraser";
  color: string;
  width: number;
  points: DrawingPoint[];
}

type AbilityCategory = "smoke" | "wall" | "molly" | "recon" | "generic";

interface PlacedAbility {
  id: string;
  agentName: string;
  abilityName: string;
  abilityIcon: string | null;
  category: AbilityCategory;
  color: string;
  /** Normalized 0-1 coords */
  x: number;
  y: number;
  /** For smokes/mollies: normalized radius; for walls: endpoint */
  radius?: number;
  /** For walls: end point */
  endX?: number;
  endY?: number;
}

interface PlacedAgent {
  id: string;
  name: string;
  iconUrl: string;
  x: number;
  y: number;
}

/* ─────────────────────────────────────────────
   Ability Classification
   ───────────────────────────────────────────── */

const SMOKE_KEYWORDS = [
  "smoke",
  "nebula",
  "dark cover",
  "cloudburst",
  "sky smoke",
  "shrouded step",
  "paranoia",
  "incendiary",
  "stim beacon",
  "orbital strike",
  "from the shadows",
];
const WALL_KEYWORDS = [
  "wall",
  "barrier",
  "toxic screen",
  "blaze",
  "cosmic divide",
];
const MOLLY_KEYWORDS = [
  "molly",
  "incendiary",
  "paint shells",
  "hot hands",
  "snake bite",
  "nanoswarm",
  "aftershock",
  "spike rush",
  "mosh pit",
  "annihilation",
  "toxic cloud",
  "poison cloud",
];
const RECON_KEYWORDS = [
  "recon",
  "owl drone",
  "haunt",
  "prowler",
  "spycam",
  "turret",
  "alarm bot",
  "regrowth",
  "recon bolt",
  "hunter's fury",
  "seek",
  "nightfall",
  "wingman",
];

function classifyAbility(ability: AgentAbility): AbilityCategory {
  const name = (ability.displayName || "").toLowerCase();
  const desc = (ability.description || "").toLowerCase();
  const combined = `${name} ${desc}`;

  if (WALL_KEYWORDS.some((kw) => combined.includes(kw))) return "wall";
  if (SMOKE_KEYWORDS.some((kw) => combined.includes(kw))) return "smoke";
  if (MOLLY_KEYWORDS.some((kw) => combined.includes(kw))) return "molly";
  if (RECON_KEYWORDS.some((kw) => combined.includes(kw))) return "recon";
  return "generic";
}

/** Get a color for an ability based on its category */
function getCategoryColor(cat: AbilityCategory): string {
  switch (cat) {
    case "smoke":
      return "rgba(120, 90, 210, 0.45)";
    case "wall":
      return "rgba(0, 230, 64, 0.55)";
    case "molly":
      return "rgba(255, 90, 40, 0.45)";
    case "recon":
      return "rgba(0, 200, 255, 0.4)";
    default:
      return "rgba(255, 255, 255, 0.3)";
  }
}

function getCategoryBorder(cat: AbilityCategory): string {
  switch (cat) {
    case "smoke":
      return "rgba(160, 120, 255, 0.8)";
    case "wall":
      return "rgba(0, 255, 80, 0.9)";
    case "molly":
      return "rgba(255, 120, 50, 0.8)";
    case "recon":
      return "rgba(0, 220, 255, 0.8)";
    default:
      return "rgba(255, 255, 255, 0.5)";
  }
}

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */

const COLORS = [
  { name: "Valorant Red", value: "#ff4655" },
  { name: "Valorant Teal", value: "#00f3ff" },
  { name: "Neon Yellow", value: "#d2ff00" },
  { name: "White", value: "#ffffff" },
];

const BRUSH_SIZES = [
  { name: "S", value: 3 },
  { name: "M", value: 6 },
  { name: "L", value: 12 },
];

const SLOT_LABELS: Record<string, string> = {
  Ability1: "C",
  Ability2: "Q",
  Grenade: "E",
  Ultimate: "X",
  Passive: "P",
};

const DEFAULT_SMOKE_RADIUS = 0.035;
const DEFAULT_MOLLY_RADIUS = 0.028;
const DEFAULT_RECON_RADIUS = 0.04;
const MAX_WALL_LENGTH = 0.35; // ~35% of the map

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */

export default function TacticalBoard({
  map,
  allAgents,
  initialStateStr,
  onClose,
}: TacticalBoardProps) {
  // --- Drawing State ---
  const [tool, setTool] = useState<"pen" | "line" | "arrow" | "eraser">("pen");
  const [color, setColor] = useState("#ff4655");
  const [brushWidth, setBrushWidth] = useState(6);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);

  // --- Agent & Ability State ---
  const [placedAgents, setPlacedAgents] = useState<PlacedAgent[]>([]);
  const [placedAbilities, setPlacedAbilities] = useState<PlacedAbility[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activeAbility, setActiveAbility] = useState<{
    ability: AgentAbility;
    category: AbilityCategory;
  } | null>(null);
  const [draggingAgentId, setDraggingAgentId] = useState<string | null>(null);
  const [draggingAbilityId, setDraggingAbilityId] = useState<string | null>(
    null,
  );
  const [shareText, setShareText] = useState("Share");
  const [agentPickerOpen, setAgentPickerOpen] = useState(false);

  // --- Refs ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const agentScrollRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const currentPoints = useRef<DrawingPoint[]>([]);
  // For wall placement
  const wallStart = useRef<DrawingPoint | null>(null);
  const pendingWall = useRef<PlacedAbility | null>(null);

  // Smooth drag via RAF + direct DOM updates
  const dragRafRef = useRef<number>(0);
  const dragStateRef = useRef<{
    id: string;
    type: "agent" | "ability";
    x: number;
    y: number;
  } | null>(null);

  /* ═══════════════════════════════════════════
     URL Serialization
     ═══════════════════════════════════════════ */

  const compressState = useCallback(
    (s: DrawingStroke[], ag: PlacedAgent[], ab: PlacedAbility[]): string => {
      const r = (n: number) => Math.round(n * 1000) / 1000;
      const minified = {
        s: s.map((st) => ({
          t:
            st.type === "pen"
              ? "p"
              : st.type === "line"
                ? "l"
                : st.type === "arrow"
                  ? "a"
                  : "e",
          c: st.color,
          w: st.width,
          p: st.points.map((pt) => [r(pt.x), r(pt.y)]),
        })),
        a: ag.map((a) => ({ n: a.name, i: a.iconUrl, x: r(a.x), y: r(a.y) })),
        b: ab.map((a) => ({
          an: a.agentName,
          bn: a.abilityName,
          bi: a.abilityIcon,
          ct: a.category,
          cl: a.color,
          x: r(a.x),
          y: r(a.y),
          r: a.radius ? r(a.radius) : undefined,
          ex: a.endX != null ? r(a.endX) : undefined,
          ey: a.endY != null ? r(a.endY) : undefined,
        })),
      };
      try {
        const str = JSON.stringify(minified);
        return btoa(unescape(encodeURIComponent(str)))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");
      } catch {
        return "";
      }
    },
    [],
  );

  const decompressState = useCallback((compressed: string) => {
    try {
      let base64 = compressed.replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4) base64 += "=";
      const decoded = decodeURIComponent(escape(atob(base64)));
      const parsed = JSON.parse(decoded);

      const loadedStrokes: DrawingStroke[] = (parsed.s || []).map((s: any) => ({
        type:
          s.t === "p"
            ? "pen"
            : s.t === "l"
              ? "line"
              : s.t === "a"
                ? "arrow"
                : "eraser",
        color: s.c,
        width: s.w,
        points: (s.p || []).map((pt: any) => ({ x: pt[0], y: pt[1] })),
      }));

      const loadedAgents: PlacedAgent[] = (parsed.a || []).map(
        (a: any, idx: number) => ({
          id: `agent-${idx}-${Date.now()}`,
          name: a.n,
          iconUrl: a.i,
          x: a.x,
          y: a.y,
        }),
      );

      const loadedAbilities: PlacedAbility[] = (parsed.b || []).map(
        (a: any, idx: number) => ({
          id: `ab-${idx}-${Date.now()}`,
          agentName: a.an,
          abilityName: a.bn,
          abilityIcon: a.bi,
          category: a.ct as AbilityCategory,
          color: a.cl,
          x: a.x,
          y: a.y,
          radius: a.r,
          endX: a.ex,
          endY: a.ey,
        }),
      );

      return {
        strokes: loadedStrokes,
        agents: loadedAgents,
        abilities: loadedAbilities,
      };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (initialStateStr) {
      const loaded = decompressState(initialStateStr);
      if (loaded) {
        setStrokes(loaded.strokes);
        setPlacedAgents(loaded.agents);
        setPlacedAbilities(loaded.abilities);
      }
    }
  }, [initialStateStr, decompressState]);

  /* ═══════════════════════════════════════════
     Canvas Rendering
     ═══════════════════════════════════════════ */

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    strokeColor: string,
    width: number,
  ) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLength = 10 + width * 1.5;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headLength * Math.cos(angle - Math.PI / 6),
      y2 - headLength * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      x2 - headLength * Math.cos(angle + Math.PI / 6),
      y2 - headLength * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fillStyle = strokeColor;
    ctx.fill();
  };

  const drawAbilities = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      placedAbilities.filter(Boolean).forEach((ab) => {
        if (!ab) return;
        ctx.save();
        ctx.globalAlpha = 0.85;

        if (ab.category === "smoke" || ab.category === "generic") {
          const cx = ab.x * w;
          const cy = ab.y * h;
          const r = (ab.radius || DEFAULT_SMOKE_RADIUS) * w;

          // Filled circle
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          grad.addColorStop(0, ab.color.replace("0.45", "0.5"));
          grad.addColorStop(0.7, ab.color);
          grad.addColorStop(1, ab.color.replace("0.45", "0.1"));
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();

          // Border ring
          ctx.strokeStyle = getCategoryBorder(ab.category);
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (ab.category === "wall") {
          const sx = ab.x * w;
          const sy = ab.y * h;
          const ex = (ab.endX ?? ab.x) * w;
          const ey = (ab.endY ?? ab.y) * h;

          ctx.strokeStyle = getCategoryBorder(ab.category);
          ctx.lineWidth = 6;
          ctx.lineCap = "round";
          ctx.setLineDash([10, 6]);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          ctx.setLineDash([]);

          // Glow
          ctx.shadowBlur = 12;
          ctx.shadowColor = getCategoryBorder(ab.category);
          ctx.strokeStyle = ab.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else if (ab.category === "molly") {
          const cx = ab.x * w;
          const cy = ab.y * h;
          const r = (ab.radius || DEFAULT_MOLLY_RADIUS) * w;

          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          grad.addColorStop(0, ab.color.replace("0.45", "0.6"));
          grad.addColorStop(0.6, ab.color);
          grad.addColorStop(1, "rgba(255,70,20,0.05)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();

          // Hazard border
          ctx.strokeStyle = getCategoryBorder(ab.category);
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (ab.category === "recon") {
          const cx = ab.x * w;
          const cy = ab.y * h;
          const r = (ab.radius || DEFAULT_RECON_RADIUS) * w;

          // Multiple concentric rings
          for (let i = 3; i >= 1; i--) {
            ctx.strokeStyle = getCategoryBorder(ab.category).replace(
              "0.8",
              `${0.15 + i * 0.2}`,
            );
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, r * (i / 3), 0, Math.PI * 2);
            ctx.stroke();
          }

          // Center dot
          ctx.fillStyle = getCategoryBorder(ab.category);
          ctx.beginPath();
          ctx.arc(cx, cy, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // Draw pending wall preview
      if (pendingWall.current) {
        const pw = pendingWall.current;
        ctx.save();
        ctx.globalAlpha = 0.6;
        const sx = pw.x * w;
        const sy = pw.y * h;
        const ex = (pw.endX ?? pw.x) * w;
        const ey = (pw.endY ?? pw.y) * h;

        ctx.strokeStyle = getCategoryBorder("wall");
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.setLineDash([10, 6]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.setLineDash([]);

        // Length indicator
        const dist = Math.hypot(pw.endX! - pw.x, pw.endY! - pw.y);
        if (dist > MAX_WALL_LENGTH) {
          ctx.strokeStyle = "rgba(255, 50, 50, 0.9)";
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(sx, sy, MAX_WALL_LENGTH * w, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.restore();
      }
    },
    [placedAbilities],
  );

  const drawStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw abilities first (below strokes)
    drawAbilities(ctx, w, h);

    // Draw strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.save();

      if (stroke.type === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.lineWidth = stroke.width * 2;
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
      }
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.type === "pen" || stroke.type === "eraser") {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x * w, stroke.points[0].y * h);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x * w, stroke.points[i].y * h);
        }
        ctx.stroke();
      } else if (stroke.type === "line") {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x * w, stroke.points[0].y * h);
        ctx.lineTo(stroke.points[1].x * w, stroke.points[1].y * h);
        ctx.stroke();
      } else if (stroke.type === "arrow") {
        drawArrow(
          ctx,
          stroke.points[0].x * w,
          stroke.points[0].y * h,
          stroke.points[1].x * w,
          stroke.points[1].y * h,
          stroke.color,
          stroke.width,
        );
      }
      ctx.restore();
    });
  }, [strokes, drawAbilities]);

  // Resize canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      drawStrokes();
    };

    window.addEventListener("resize", handleResize);
    setTimeout(handleResize, 100);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawStrokes]);

  useEffect(() => {
    drawStrokes();
  }, [strokes, placedAbilities, drawStrokes]);

  /* ═══════════════════════════════════════════
     Drawing & Ability Placement Interactions
     ═══════════════════════════════════════════ */

  const getCanvasCoords = (
    e: React.PointerEvent<HTMLCanvasElement>,
  ): DrawingPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const handleCanvasPointerDown = (
    e: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    e.preventDefault();
    if (draggingAgentId || draggingAbilityId) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const pt = getCanvasCoords(e);
    if (!pt) return;

    // --- Ability placement mode ---
    if (activeAbility) {
      const { ability, category } = activeAbility;

      if (category === "wall") {
        // Start wall drag
        wallStart.current = pt;
        pendingWall.current = {
          id: `ab-${Date.now()}-${Math.random()}`,
          agentName: selectedAgent?.name || "",
          abilityName: ability.displayName,
          abilityIcon: ability.displayIcon,
          category,
          color: getCategoryColor(category),
          x: pt.x,
          y: pt.y,
          endX: pt.x,
          endY: pt.y,
        };
        isDrawing.current = true;
        return;
      }

      // Instant placement for smokes, mollies, recon, generic
      const radius =
        category === "smoke"
          ? DEFAULT_SMOKE_RADIUS
          : category === "molly"
            ? DEFAULT_MOLLY_RADIUS
            : category === "recon"
              ? DEFAULT_RECON_RADIUS
              : DEFAULT_SMOKE_RADIUS;

      const newAbility: PlacedAbility = {
        id: `ab-${Date.now()}-${Math.random()}`,
        agentName: selectedAgent?.name || "",
        abilityName: ability.displayName,
        abilityIcon: ability.displayIcon,
        category,
        color: getCategoryColor(category),
        x: pt.x,
        y: pt.y,
        radius,
      };

      setPlacedAbilities((prev) => [...prev, newAbility]);
      audio.playClick();
      return;
    }

    // --- Normal drawing mode ---
    isDrawing.current = true;
    currentPoints.current = [pt];
    setStrokes((prev) => [
      ...prev,
      { type: tool, color, width: brushWidth, points: [pt, pt] },
    ]);
  };

  const handleCanvasPointerMove = (
    e: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const pt = getCanvasCoords(e);
    if (!pt) return;

    // Wall drag preview
    if (
      activeAbility &&
      activeAbility.category === "wall" &&
      wallStart.current
    ) {
      // Clamp distance
      const dist = Math.hypot(
        pt.x - wallStart.current.x,
        pt.y - wallStart.current.y,
      );
      let ex = pt.x;
      let ey = pt.y;
      if (dist > MAX_WALL_LENGTH) {
        const angle = Math.atan2(
          pt.y - wallStart.current.y,
          pt.x - wallStart.current.x,
        );
        ex = wallStart.current.x + Math.cos(angle) * MAX_WALL_LENGTH;
        ey = wallStart.current.y + Math.sin(angle) * MAX_WALL_LENGTH;
      }
      pendingWall.current = {
        ...pendingWall.current!,
        endX: ex,
        endY: ey,
      };
      drawStrokes(); // Re-render to show preview
      return;
    }

    // Normal drawing
    if (tool === "pen" || tool === "eraser") {
      const lastPt = currentPoints.current[currentPoints.current.length - 1];
      const dist = Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y);
      if (dist > 0.003) {
        currentPoints.current.push(pt);
        setStrokes((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            ...next[next.length - 1],
            points: [...currentPoints.current],
          };
          return next;
        });
      }
    } else {
      setStrokes((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          ...next[next.length - 1],
          points: [currentPoints.current[0], pt],
        };
        return next;
      });
    }
  };

  const handleCanvasPointerUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    // Finish wall
    if (
      activeAbility &&
      activeAbility.category === "wall" &&
      pendingWall.current
    ) {
      setPlacedAbilities((prev) => [...prev, pendingWall.current!]);
      pendingWall.current = null;
      wallStart.current = null;
      audio.playClick();
      return;
    }

    audio.playHover();
  };

  /* ═══════════════════════════════════════════
     Smooth Drag Flush
     ═══════════════════════════════════════════ */

  const flushDrag = useCallback(() => {
    dragRafRef.current = 0;
    const ds = dragStateRef.current;
    if (!ds) return;
    const container = containerRef.current;
    if (!container) return;
    const el = container.querySelector(
      `[data-token-id="${ds.id}"]`,
    ) as HTMLElement | null;
    if (!el) return;
    el.style.left = `${ds.x * 100}%`;
    el.style.top = `${ds.y * 100}%`;
  }, []);

  /* ═══════════════════════════════════════════
     Agent Token Interactions
     ═══════════════════════════════════════════ */

  const handleSelectAgent = (agent: Agent) => {
    audio.playClick();
    if (selectedAgent?._id === agent._id) {
      // Toggle off
      setSelectedAgent(null);
      setActiveAbility(null);
    } else {
      setSelectedAgent(agent);
      setActiveAbility(null);

      // Also spawn agent token
      const newAgent: PlacedAgent = {
        id: `agent-${Date.now()}-${Math.random()}`,
        name: agent.name,
        iconUrl: agent.displayIcon || agent.imageUrl || "",
        x: 0.5,
        y: 0.5,
      };
      setPlacedAgents((prev) => [...prev, newAgent]);
    }
  };

  const handleRemoveAgent = (id: string) => {
    audio.playClick();
    setPlacedAgents((prev) => prev.filter((a) => a.id !== id));
  };

  const handleRemoveAbility = (id: string) => {
    audio.playClick();
    setPlacedAbilities((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAgentDragStart = (id: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    setDraggingAgentId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleAgentDragMove = (id: string) => (e: React.PointerEvent) => {
    if (draggingAgentId !== id) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    dragStateRef.current = { id, type: "agent", x, y };
    if (!dragRafRef.current) {
      dragRafRef.current = requestAnimationFrame(flushDrag);
    }
  };

  const handleAgentDragEnd = (id: string) => (e: React.PointerEvent) => {
    if (draggingAgentId === id) {
      setDraggingAgentId(null);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      audio.playHover();
      const ds = dragStateRef.current;
      if (ds && ds.id === id) {
        setPlacedAgents((prev) =>
          prev.map((a) => (a.id === id ? { ...a, x: ds.x, y: ds.y } : a)),
        );
      }
      dragStateRef.current = null;
    }
  };

  // --- Ability token dragging (for repositioning placed abilities) ---
  const handleAbilityDragStart = (id: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    setDraggingAbilityId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleAbilityDragMove = (id: string) => (e: React.PointerEvent) => {
    if (draggingAbilityId !== id) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    dragStateRef.current = { id, type: "ability", x, y };
    if (!dragRafRef.current) {
      dragRafRef.current = requestAnimationFrame(flushDrag);
    }
  };

  const handleAbilityDragEnd = (id: string) => (e: React.PointerEvent) => {
    if (draggingAbilityId === id) {
      setDraggingAbilityId(null);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      const ds = dragStateRef.current;
      if (ds && ds.id === id) {
        setPlacedAbilities((prev) =>
          prev.map((a) => (a.id === id ? { ...a, x: ds.x, y: ds.y } : a)),
        );
      }
      dragStateRef.current = null;
    }
  };

  /* ═══════════════════════════════════════════
     Actions
     ═══════════════════════════════════════════ */

  const handleUndo = () => {
    audio.playClick();
    // Undo last ability if any, else last stroke
    if (placedAbilities.length > 0) {
      setPlacedAbilities((prev) => prev.slice(0, -1));
    } else {
      setStrokes((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    audio.playClick();
    setStrokes([]);
    setPlacedAgents([]);
    setPlacedAbilities([]);
    setSelectedAgent(null);
    setActiveAbility(null);
  };

  const handleShare = () => {
    audio.playClick();
    const compressed = compressState(strokes, placedAgents, placedAbilities);
    const url = new URL(window.location.href);
    url.searchParams.set("map", map.slug?.current || "");
    url.searchParams.set("strat", compressed);

    navigator.clipboard.writeText(url.toString()).then(() => {
      setShareText("Copied!");
      setTimeout(() => setShareText("Share"), 2000);
    });
  };

  // --- Horizontal scroll via mouse wheel ---
  const handleAgentWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    if (agentScrollRef.current) {
      e.preventDefault();
      agentScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const bgImage = map.displayIcon || map.imageUrl || "/grid_bg.png";

  /* ═══════════════════════════════════════════
     Render
     ═══════════════════════════════════════════ */
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md select-none touch-none"
      data-lenis-prevent
    >
      <div className="flex h-[95vh] w-full max-w-[1200px] flex-col bg-[#0a0c10] border border-white/8 clip-angular shadow-2xl overflow-hidden relative">
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-3 bg-black/40">
          <div className="flex items-center gap-3">
            <span className="text-val-red font-oswald text-lg uppercase font-bold tracking-widest">
              //
            </span>
            <div className="flex flex-col">
              <h2 className="font-oswald text-base font-bold uppercase tracking-wider text-white leading-tight">
                Strat Board — {map.name}
              </h2>
              <span className="text-[8px] font-mono text-white/25 uppercase tracking-widest">
                Tactical Whiteboard &amp; Ability Placements
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              onMouseEnter={() => audio.playHover()}
              className="flex items-center gap-1.5 px-3 py-1.5 clip-angular-sm bg-val-red hover:bg-val-red-hover text-white text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_12px_rgba(255,70,85,0.3)] active:scale-95 border-0 outline-none"
            >
              <Share2 size={12} />
              <span>{shareText}</span>
            </button>
            <button
              onClick={() => {
                audio.playClick();
                onClose();
              }}
              onMouseEnter={() => audio.playHover()}
              className="flex size-7 items-center justify-center bg-white/5 border border-white/10 text-white/50 hover:bg-val-red hover:text-white hover:border-val-red transition-colors clip-angular-sm cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Main Workspace ── */}
        <div className="flex flex-1 flex-col md:flex-row overflow-hidden relative">
          {/* Sidebar Tools */}
          <div className="flex md:flex-col justify-start gap-3 border-b md:border-b-0 md:border-r border-white/8 p-3 bg-black/20 md:min-w-[60px] flex-wrap items-center">
            {/* Drawing Tools */}
            <div className="flex md:flex-col gap-1.5">
              {(
                [
                  {
                    id: "pen",
                    name: "Pencil",
                    icon: <Pencil size={14} />,
                  },
                  {
                    id: "line",
                    name: "Line",
                    icon: (
                      <div className="w-3.5 h-[2px] bg-current rotate-45" />
                    ),
                  },
                  {
                    id: "arrow",
                    name: "Arrow",
                    icon: <MoveUpRight size={14} />,
                  },
                  {
                    id: "eraser",
                    name: "Eraser",
                    icon: <Eraser size={14} />,
                  },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    audio.playClick();
                    setTool(t.id);
                    setActiveAbility(null); // Exit ability mode
                  }}
                  onMouseEnter={() => audio.playHover()}
                  className={`flex size-8 items-center justify-center clip-angular-sm transition-all border outline-none cursor-pointer ${
                    tool === t.id && !activeAbility
                      ? "bg-val-red/10 border-val-red/40 text-val-red"
                      : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                  }`}
                  title={t.name}
                >
                  {t.icon}
                </button>
              ))}
            </div>

            {/* Colors */}
            {tool !== "eraser" && !activeAbility && (
              <div className="flex md:flex-col gap-1.5 border-l md:border-l-0 md:border-t border-white/5 pl-2 md:pl-0 md:pt-2">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => {
                      audio.playClick();
                      setColor(c.value);
                    }}
                    className={`size-5 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                      color === c.value
                        ? "scale-110 border-white"
                        : "border-black/50"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            )}

            {/* Brush Sizes */}
            {tool !== "eraser" && !activeAbility && (
              <div className="flex md:flex-col gap-1.5 border-l md:border-l-0 md:border-t border-white/5 pl-2 md:pl-0 md:pt-2">
                {BRUSH_SIZES.map((b) => (
                  <button
                    key={b.value}
                    onClick={() => {
                      audio.playClick();
                      setBrushWidth(b.value);
                    }}
                    className={`flex size-5 items-center justify-center rounded-full border transition-colors cursor-pointer ${
                      brushWidth === b.value
                        ? "bg-val-red border-val-red text-white"
                        : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                    }`}
                    title={`${b.name} Brush`}
                  >
                    <span
                      style={{
                        width: `${Math.max(2, b.value * 0.6)}px`,
                        height: `${Math.max(2, b.value * 0.6)}px`,
                        backgroundColor:
                          brushWidth === b.value
                            ? "white"
                            : "rgba(255,255,255,0.4)",
                      }}
                      className="rounded-full"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Agent Picker / Undo / Clear */}
            <div className="flex md:flex-col gap-1.5 border-l md:border-l-0 md:border-t border-white/5 pl-2 md:pl-0 md:pt-2 md:mt-auto">
              <button
                onClick={() => {
                  audio.playClick();
                  setAgentPickerOpen(true);
                }}
                onMouseEnter={() => audio.playHover()}
                className={`flex size-8 items-center justify-center clip-angular-sm transition-all border outline-none cursor-pointer ${
                  selectedAgent
                    ? "bg-val-red/10 border-val-red/40 text-val-red"
                    : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                }`}
                title="Select Agent"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={handleUndo}
                disabled={strokes.length === 0 && placedAbilities.length === 0}
                onMouseEnter={() => audio.playHover()}
                className="flex size-8 items-center justify-center bg-white/5 text-white/40 hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:pointer-events-none clip-angular-sm transition-all cursor-pointer outline-none border-none"
                title="Undo"
              >
                <Undo2 size={14} />
              </button>
              <button
                onClick={handleClear}
                onMouseEnter={() => audio.playHover()}
                className="flex size-8 items-center justify-center bg-white/5 text-white/40 hover:bg-val-red/20 hover:text-val-red transition-all clip-angular-sm cursor-pointer outline-none border-none"
                title="Clear All"
              >
                <Trash size={14} />
              </button>
            </div>
          </div>

          {/* ── Canvas Area ── */}
          <div className="flex-1 flex items-center justify-center p-4 bg-black/30 relative overflow-hidden">
            <div
              ref={containerRef}
              className="relative w-full max-w-[min(100%,62vh)] aspect-square border border-white/8 shadow-2xl bg-[#070a0d] overflow-hidden"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(255,255,255,0.025) 1px, transparent 0)",
                backgroundSize: "18px 18px",
              }}
            >
              {/* Map Radar */}
              {bgImage && (
                <div className="absolute inset-0 select-none pointer-events-none z-0 p-3">
                  <Image
                    src={bgImage}
                    alt={map.name}
                    fill
                    className="object-contain opacity-70 filter drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] scale-[0.92]"
                    priority
                  />
                </div>
              )}

              {/* Canvas */}
              <canvas
                ref={canvasRef}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                className={`absolute inset-0 z-10 touch-none ${
                  activeAbility
                    ? activeAbility.category === "wall"
                      ? "cursor-crosshair"
                      : "cursor-cell"
                    : "cursor-crosshair"
                }`}
                style={{ width: "100%", height: "100%" }}
              />

              {/* Placed Agent Tokens */}
              <div className="absolute inset-0 z-20 pointer-events-none">
                {placedAgents.map((agent) => (
                  <div
                    key={agent.id}
                    data-token-id={agent.id}
                    className="absolute pointer-events-auto group/token"
                    style={{
                      left: `${agent.x * 100}%`,
                      top: `${agent.y * 100}%`,
                      transform: "translate(-50%, -50%)",
                      willChange: "left, top",
                    }}
                  >
                    <div
                      onPointerDown={handleAgentDragStart(agent.id)}
                      onPointerMove={handleAgentDragMove(agent.id)}
                      onPointerUp={handleAgentDragEnd(agent.id)}
                      className={`relative size-10 rounded-full border-[2px] cursor-grab active:cursor-grabbing shadow-[0_4px_12px_rgba(0,0,0,0.7)] bg-[#0a0c10] select-none transition-transform ${
                        draggingAgentId === agent.id
                          ? "border-val-red scale-110"
                          : "border-val-teal"
                      }`}
                    >
                      <Image
                        src={agent.iconUrl}
                        alt={agent.name}
                        fill
                        className="rounded-full object-cover pointer-events-none"
                      />
                      <button
                        onClick={() => handleRemoveAgent(agent.id)}
                        className="absolute -top-1 -right-1 hidden group-hover/token:flex size-4 items-center justify-center rounded-full bg-val-red text-white hover:bg-val-red-hover pointer-events-auto border border-black/30 shadow cursor-pointer transition-transform hover:scale-110 p-0"
                        title="Remove agent"
                      >
                        <X size={8} className="stroke-[3]" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Placed Ability Drag Handles (non-wall only) */}
                {placedAbilities
                  .filter((a): a is PlacedAbility => a != null)
                  .filter((a) => a.category !== "wall")
                  .map((ab) => (
                    <div
                      key={ab.id}
                      data-token-id={ab.id}
                      className="absolute pointer-events-auto group/ability"
                      style={{
                        left: `${ab.x * 100}%`,
                        top: `${ab.y * 100}%`,
                        transform: "translate(-50%, -50%)",
                        willChange: "left, top",
                      }}
                    >
                      <div
                        onPointerDown={handleAbilityDragStart(ab.id)}
                        onPointerMove={handleAbilityDragMove(ab.id)}
                        onPointerUp={handleAbilityDragEnd(ab.id)}
                        className="relative size-6 rounded-full cursor-grab active:cursor-grabbing select-none flex items-center justify-center"
                        style={{
                          backgroundColor: getCategoryBorder(ab.category),
                          boxShadow: `0 0 8px ${getCategoryBorder(ab.category)}`,
                        }}
                      >
                        {ab.abilityIcon && (
                          <Image
                            src={ab.abilityIcon}
                            alt={ab.abilityName}
                            width={14}
                            height={14}
                            className="pointer-events-none invert brightness-200"
                          />
                        )}
                        <button
                          onClick={() => handleRemoveAbility(ab.id)}
                          className="absolute -top-1 -right-1 hidden group-hover/ability:flex size-3.5 items-center justify-center rounded-full bg-val-red text-white pointer-events-auto border border-black/30 shadow cursor-pointer p-0"
                        >
                          <X size={7} className="stroke-[3]" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* ── Right Sidebar: Ability Dock ── */}
          {selectedAgent && (
            <div className="hidden md:flex flex-col border-l border-white/8 bg-black/20 w-[200px] overflow-hidden">
              {/* Agent Info */}
              <div className="flex items-center gap-2 px-3 py-3 border-b border-white/8 bg-black/30">
                <div className="relative size-9 rounded-full border border-val-teal/50 bg-black/50 overflow-hidden flex-shrink-0">
                  <Image
                    src={
                      selectedAgent.displayIcon || selectedAgent.imageUrl || ""
                    }
                    alt={selectedAgent.name}
                    fill
                    className="object-cover rounded-full"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white truncate">
                    {selectedAgent.name}
                  </span>
                  <span className="text-[9px] text-white/30 uppercase tracking-wider">
                    {selectedAgent.roleName}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedAgent(null);
                    setActiveAbility(null);
                  }}
                  className="ml-auto flex-shrink-0 size-5 flex items-center justify-center text-white/30 hover:text-white cursor-pointer bg-transparent border-none outline-none p-0"
                >
                  <X size={12} />
                </button>
              </div>

              {/* Abilities List */}
              <div className="flex flex-col gap-1 p-2 overflow-y-auto flex-1">
                <span className="text-[8px] font-bold uppercase tracking-widest text-white/25 px-1 mb-1">
                  Click ability, then click on map
                </span>
                {selectedAgent.abilities
                  ?.filter((ab): ab is AgentAbility => ab != null)
                  .filter((ab) => ab.slot !== "Passive")
                  .map((ability) => {
                    const cat = classifyAbility(ability);
                    const isActive =
                      activeAbility?.ability.displayName ===
                      ability.displayName;

                    return (
                      <button
                        key={ability.slot}
                        onClick={() => {
                          audio.playClick();
                          if (isActive) {
                            setActiveAbility(null);
                          } else {
                            setActiveAbility({
                              ability,
                              category: cat,
                            });
                          }
                        }}
                        onMouseEnter={() => audio.playHover()}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded transition-all cursor-pointer text-left border outline-none ${
                          isActive
                            ? "bg-white/10 border-white/20 text-white"
                            : "bg-white/3 border-transparent text-white/50 hover:bg-white/7 hover:text-white/80"
                        }`}
                      >
                        {/* Ability Icon */}
                        <div
                          className="flex size-7 items-center justify-center rounded flex-shrink-0"
                          style={{
                            backgroundColor: isActive
                              ? getCategoryBorder(cat)
                              : "rgba(255,255,255,0.06)",
                          }}
                        >
                          {ability.displayIcon ? (
                            <Image
                              src={ability.displayIcon}
                              alt={ability.displayName}
                              width={16}
                              height={16}
                              className="pointer-events-none invert brightness-200"
                            />
                          ) : (
                            <span className="text-[9px] font-bold text-white/50">
                              {SLOT_LABELS[ability.slot] || "?"}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider truncate">
                            {ability.displayName}
                          </span>
                          <span
                            className="text-[8px] uppercase tracking-wider"
                            style={{
                              color: getCategoryBorder(cat),
                              opacity: 0.7,
                            }}
                          >
                            {SLOT_LABELS[ability.slot] || ability.slot} · {cat}
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* ── Agent Picker Modal Overlay ── */}
        {agentPickerOpen && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setAgentPickerOpen(false)}
          >
            <div
              className="w-full max-w-3xl mx-4 bg-[#0a0c10] border border-white/10 clip-angular shadow-2xl p-5 flex flex-col gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-oswald text-sm font-bold uppercase tracking-wider text-white">
                  Select Agent
                </h3>
                <button
                  onClick={() => setAgentPickerOpen(false)}
                  className="text-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {allAgents.map((agent) => {
                  const icon = agent.displayIcon || agent.imageUrl;
                  if (!icon) return null;
                  const isSelected = selectedAgent?._id === agent._id;
                  return (
                    <button
                      key={agent._id}
                      onClick={() => {
                        handleSelectAgent(agent);
                        setAgentPickerOpen(false);
                      }}
                      onMouseEnter={() => audio.playHover()}
                      className={`group relative aspect-square rounded-sm border transition-all overflow-hidden cursor-pointer ${
                        isSelected
                          ? "border-val-red shadow-[0_0_10px_rgba(255,70,85,0.35)]"
                          : "border-white/10 hover:border-white/30"
                      }`}
                      title={agent.name}
                    >
                      <Image
                        src={icon}
                        alt={agent.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors" />
                      {isSelected && (
                        <div className="absolute inset-0 ring-1 ring-inset ring-val-red" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
