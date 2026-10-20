import type { PlacedAbility, Point, Stroke } from "./model";
import { findAbilityStats } from "@/lib/data/ability-stats";
export function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function formatAbilityMeta(displayName: string): string {
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

export function getAbilityEndpoints(ability: PlacedAbility): {
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

export function getAbilityStartPoint(ability: PlacedAbility): Point {
  return getAbilityEndpoints(ability).start;
}

export function drawStroke(
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
