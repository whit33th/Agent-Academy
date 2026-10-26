import {
  countsToDegrees,
  DEG_TO_RAD,
  normalizeYaw,
  VALORANT_HORIZONTAL_FOV,
} from "./sensitivity";
import type { AimSettings } from "./settings";
import { AIM_TARGETS, type AimTargetStyle } from "./targets";
export const TARGET_DISTANCE = 15;
export const EYE_HEIGHT = 1.6;
export const PLAY_YAW = 30;
export const PLAY_PITCH = 13;
export const FIXED_STEP = 1 / 120;
export interface Ball {
  id: number;
  yaw: number;
  pitch: number;
  originYaw: number;
  originPitch: number;
  phase: number;
  direction: number;
  style: AimTargetStyle;
}
export interface RangeState {
  yaw: number;
  pitch: number;
  balls: Ball[];
  hits: number;
  shots: number;
  elapsed: number;
  heldTime: number;
  onTargetTime: number;
  lastHitAt: number | null;
  intervalTotal: number;
  intervalCount: number;
}
export interface AimStats {
  hits: number;
  shots: number;
  elapsed: number;
  accuracy: number | null;
  heldTime: number;
  onTargetTime: number;
  averageInterval: number | null;
}
export function createRange(
  settings: AimSettings,
  random: () => number = Math.random,
): RangeState {
  const state: RangeState = {
    yaw: 0,
    pitch: 0,
    balls: [],
    hits: 0,
    shots: 0,
    elapsed: 0,
    heldTime: 0,
    onTargetTime: 0,
    lastHitAt: null,
    intervalTotal: 0,
    intervalCount: 0,
  };
  for (let i = 0; i < (settings.mode === "moving" ? 3 : 1); i++) {
    const ball: Ball = {
      id: i,
      yaw: 0,
      pitch: 0,
      originYaw: 0,
      originPitch: 0,
      phase: 0,
      direction: 1,
      style: AIM_TARGETS[i % AIM_TARGETS.length].id,
    };
    placeBall(ball, state, settings, random);
    state.balls.push(ball);
  }
  return state;
}
export function look(
  state: RangeState,
  x: number,
  y: number,
  sensitivity: number,
) {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(sensitivity) ||
    sensitivity <= 0
  )
    return;
  state.yaw = normalizeYaw(state.yaw + countsToDegrees(x, sensitivity));
  state.pitch = Math.max(
    -89,
    Math.min(89, state.pitch - countsToDegrees(y, sensitivity)),
  );
}
export function targetPosition(ball: Ball) {
  const yaw = ball.yaw * DEG_TO_RAD,
    pitch = ball.pitch * DEG_TO_RAD;
  return {
    x: Math.sin(yaw) * Math.cos(pitch) * TARGET_DISTANCE,
    y: EYE_HEIGHT + Math.sin(pitch) * TARGET_DISTANCE,
    z: -Math.cos(yaw) * Math.cos(pitch) * TARGET_DISTANCE,
  };
}
export function targetRadius(diameter: number) {
  return Math.tan((diameter * DEG_TO_RAD) / 2) * TARGET_DISTANCE;
}

/** Camera-facing circular target: perspective position/depth without stretching flat artwork. */
export function projectTarget(
  state: RangeState,
  ball: Ball,
  diameter: number,
  width: number,
  height: number,
) {
  const point = targetPosition(ball);
  const yaw = state.yaw * DEG_TO_RAD,
    pitch = state.pitch * DEG_TO_RAD;
  const sy = Math.sin(yaw),
    cy = Math.cos(yaw),
    sp = Math.sin(pitch),
    cp = Math.cos(pitch);
  const wx = point.x,
    wy = point.y - EYE_HEIGHT,
    wz = point.z;
  const x = wx * cy + wz * sy;
  const y = -wx * sy * sp + wy * cp + wz * cy * sp;
  const z = wx * sy * cp + wy * sp - wz * cy * cp;
  const radius = targetRadius(diameter);
  if (z <= radius || width <= 0 || height <= 0) return null;
  const focal =
    width / (2 * Math.tan((VALORANT_HORIZONTAL_FOV * DEG_TO_RAD) / 2));
  const major = (focal * radius) / z;
  const centerX = width / 2 + (focal * x) / z;
  const centerY = height / 2 - (focal * y) / z;
  if (
    centerX + major < 0 ||
    centerX - major > width ||
    centerY + major < 0 ||
    centerY - major > height
  )
    return null;
  return { x: centerX, y: centerY, major, minor: major, rotation: 0 };
}
/** The sphere ray test and camera-facing circular core have the same center-hit condition. */
export function aimedTarget(state: RangeState, diameter: number): Ball | null {
  const yaw = state.yaw * DEG_TO_RAD,
    pitch = state.pitch * DEG_TO_RAD;
  const dx = Math.sin(yaw) * Math.cos(pitch),
    dy = Math.sin(pitch),
    dz = -Math.cos(yaw) * Math.cos(pitch);
  const radius = targetRadius(diameter);
  let hit: Ball | null = null,
    closest = Infinity;
  for (const ball of state.balls) {
    const position = targetPosition(ball);
    const x = position.x,
      y = position.y - EYE_HEIGHT,
      z = position.z;
    const along = x * dx + y * dy + z * dz;
    const perpendicularSquared = x * x + y * y + z * z - along * along;
    if (along <= 0 || perpendicularSquared > radius * radius) continue;
    const near =
      along - Math.sqrt(Math.max(0, radius * radius - perpendicularSquared));
    if (near < closest) {
      closest = near;
      hit = ball;
    }
  }
  return hit;
}
export function shoot(
  state: RangeState,
  settings: AimSettings,
  random = Math.random,
) {
  if (settings.mode === "tracking") return false;
  state.shots++;
  const ball = aimedTarget(state, settings.diameter);
  if (!ball) return false;
  state.hits++;
  if (state.lastHitAt !== null) {
    state.intervalTotal += state.elapsed - state.lastHitAt;
    state.intervalCount++;
  }
  state.lastHitAt = state.elapsed;
  placeBall(ball, state, settings, random);
  return true;
}
export function step(
  state: RangeState,
  dt: number,
  settings: AimSettings,
  held: boolean,
) {
  const remaining = settings.duration
    ? Math.max(0, settings.duration - state.elapsed)
    : Infinity;
  const seconds = Math.min(Math.max(0, dt), 0.05, remaining);
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  state.elapsed += seconds;
  if (settings.mode !== "flicks")
    for (const ball of state.balls) {
      ball.phase += (seconds * settings.speed) / 12;
      ball.yaw = ball.originYaw + Math.sin(ball.phase) * 12 * ball.direction;
      ball.pitch = ball.originPitch + Math.sin(ball.phase * 0.6) * 3;
    }
  if (settings.mode === "tracking" && held) {
    state.heldTime += seconds;
    if (aimedTarget(state, settings.diameter)) state.onTargetTime += seconds;
  }
}
export function rangeStats(state: RangeState, settings: AimSettings): AimStats {
  const denominator =
    settings.mode === "tracking" ? state.heldTime : state.shots;
  return {
    hits: state.hits,
    shots: state.shots,
    elapsed: state.elapsed,
    heldTime: state.heldTime,
    onTargetTime: state.onTargetTime,
    accuracy: denominator
      ? (settings.mode === "tracking" ? state.onTargetTime : state.hits) /
        denominator
      : null,
    averageInterval: state.intervalCount
      ? state.intervalTotal / state.intervalCount
      : null,
  };
}
function placeBall(
  ball: Ball,
  state: RangeState,
  settings: AimSettings,
  random: () => number,
) {
  const choices = AIM_TARGETS.filter(
    (target) =>
      target.id !== ball.style &&
      !state.balls.some((other) => other !== ball && other.style === target.id),
  );
  const nextStyle =
    choices[
      Math.min(choices.length - 1, Math.floor(random() * choices.length))
    ];
  if (nextStyle) ball.style = nextStyle.id;
  const horizontal = settings.mode === "flicks" ? PLAY_YAW : PLAY_YAW - 12;
  const vertical = settings.mode === "flicks" ? PLAY_PITCH : PLAY_PITCH - 3;
  const clearance = Math.max(4, settings.diameter * 1.5);
  const artwork = AIM_TARGETS.find((target) => target.id === ball.style)!;
  const free = (yaw: number, pitch: number) => {
    if (
      Math.hypot(normalizeYaw(yaw - state.yaw), pitch - state.pitch) <
        clearance ||
      !state.balls.every(
        (other) =>
          other === ball ||
          Math.hypot(yaw - other.yaw, pitch - other.pitch) >= clearance,
      )
    )
      return false;
    // Test the whole sprite in the same 16:9 view, not just its world-space range.
    const projected = projectTarget(
      state,
      { ...ball, yaw, pitch },
      settings.diameter,
      16,
      9,
    );
    if (!projected) return false;
    const size = projected.major / artwork.coreRadius;
    return (
      projected.x - size * artwork.centerX >= 0 &&
      projected.x + size * (1 - artwork.centerX) <= 16 &&
      projected.y - size * artwork.centerY >= 0 &&
      projected.y + size * (1 - artwork.centerY) <= 9
    );
  };
  let yaw = 0,
    pitch = 0,
    found = false;
  for (let attempt = 0; attempt < 32; attempt++) {
    yaw = (random() * 2 - 1) * horizontal;
    pitch = (random() * 2 - 1) * vertical;
    if (free(yaw, pitch)) {
      found = true;
      break;
    }
  }
  if (!found) {
    outer: for (let x = -horizontal; x <= horizontal; x += clearance)
      for (let y = -vertical; y <= vertical; y += clearance) {
        if (free(x, y)) {
          yaw = x;
          pitch = y;
          break outer;
        }
      }
  }
  ball.yaw = ball.originYaw = yaw;
  ball.pitch = ball.originPitch = pitch;
  ball.phase = 0;
  ball.direction = random() < 0.5 ? -1 : 1;
}
