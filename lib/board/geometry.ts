import type {
  AbilityDefinition,
  AbilityGeometry,
  AbilityInstance,
  BoardObject,
  MapCalibration,
  Point,
  Stroke,
} from "./types";

export const add = (a: Point, b: Point): Point => ({
  x: a.x + b.x,
  y: a.y + b.y,
});
export const subtract = (a: Point, b: Point): Point => ({
  x: a.x - b.x,
  y: a.y - b.y,
});
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export const angle = (a: Point, b: Point) =>
  (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
export const normalizeAngle = (value: number) => ((value % 360) + 360) % 360;
export function rotate(point: Point, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: point.x * Math.cos(radians) - point.y * Math.sin(radians),
    y: point.x * Math.sin(radians) + point.y * Math.cos(radians),
  };
}

export function translateObject<T extends BoardObject>(
  object: T,
  delta: Point,
): T {
  if (object.kind === "stroke")
    return {
      ...object,
      points: object.points.map((point) => add(point, delta)),
    };
  if (object.kind === "agent")
    return { ...object, position: add(object.position, delta) };
  return {
    ...object,
    position: add(object.position, delta),
    points: object.points.map((point) => add(point, delta)),
    ...(object.routes
      ? {
          routes: object.routes.map((route) =>
            route.map((point) => add(point, delta)),
          ),
        }
      : {}),
    ...(object.source ? { source: add(object.source, delta) } : {}),
  };
}

/** The position is the cast/device anchor, never an inferred half-length pivot. */
export function rotateAbility(
  object: AbilityInstance,
  degrees: number,
): AbilityInstance {
  const delta = degrees - object.rotation;
  return {
    ...object,
    rotation: normalizeAngle(degrees),
    points: object.points.map((point) =>
      add(object.position, rotate(subtract(point, object.position), delta)),
    ),
    ...(object.routes
      ? {
          routes: object.routes.map((route) =>
            route.map((point) =>
              add(
                object.position,
                rotate(subtract(point, object.position), delta),
              ),
            ),
          ),
        }
      : {}),
  };
}

export function modeGeometry(
  definition: AbilityDefinition,
  object: Pick<AbilityInstance, "mode">,
): AbilityGeometry {
  const mode = definition.modes.find((mode) => mode.id === object.mode);
  if (!mode)
    throw new Error(`Unsupported mode ${object.mode} for ${definition.id}`);
  return mode.geometry;
}

export function constrainLength(
  origin: Point,
  point: Point,
  maxLength?: number,
): Point {
  const length = distance(origin, point);
  return maxLength !== undefined && length > maxLength && length > 0
    ? add(origin, {
        x: ((point.x - origin.x) * maxLength) / length,
        y: ((point.y - origin.y) * maxLength) / length,
      })
    : point;
}

export function pathLength(points: readonly Point[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++)
    length += distance(points[i - 1], points[i]);
  return length;
}

export function constrainPath(
  points: readonly Point[],
  maxLength?: number,
): readonly Point[] {
  if (maxLength === undefined) return points;
  const result: Point[] = [];
  let remaining = maxLength;
  for (const point of points) {
    if (!result.length) {
      result.push(point);
      continue;
    }
    const previous = result.at(-1)!;
    const length = distance(previous, point);
    result.push(constrainLength(previous, point, remaining));
    remaining -= length;
    if (remaining <= 0) break;
  }
  return result;
}

/** Keep endpoints and the most significant bends when a drawn route is very dense. */
export function simplifyRoute(
  points: readonly Point[],
  maximum: number,
): readonly Point[] {
  if (points.length <= maximum) return points;
  if (maximum < 2) throw new Error("A route needs at least two endpoints.");
  const result = [...points];
  while (result.length > maximum) {
    let best = 1,
      deviation = Infinity;
    for (let i = 1; i < result.length - 1; i++) {
      const candidate = pointSegmentDistance(
        result[i],
        result[i - 1],
        result[i + 1],
      );
      if (candidate < deviation) {
        best = i;
        deviation = candidate;
      }
    }
    result.splice(best, 1);
  }
  return result;
}

export interface ShapePrimitive {
  kind: "path" | "circle";
  path?: string;
  center?: Point;
  radius?: number;
  filled: boolean;
  dashed?: boolean;
  /** A decorative wall width is screen-space; gameplay strip widths are path geometry. */
  wall?: boolean;
}

function polygon(points: readonly Point[]): string {
  return (
    points
      .map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`)
      .join(" ") + " Z"
  );
}

function localPolygon(
  points: readonly Point[],
  object: AbilityInstance,
): string {
  return polygon(
    points.map((point) => add(object.position, rotate(point, object.rotation))),
  );
}

export function abilityPrimitives(
  object: AbilityInstance,
  definition: AbilityDefinition,
  map: MapCalibration,
): readonly ShapePrimitive[] {
  const geometry = modeGeometry(definition, object);
  const result: ShapePrimitive[] = [];
  const circle = (
    center: Point,
    radius: number,
    dashed = false,
    filled = true,
  ) => result.push({ kind: "circle", center, radius, filled, dashed });
  const line = (points: readonly Point[], wall = false) =>
    result.push({
      kind: "path",
      path: points
        .map((point, i) => `${i ? "L" : "M"}${point.x} ${point.y}`)
        .join(" "),
      filled: false,
      wall,
    });
  if (object.showOwnerRange && definition.ownerActivationRadius !== undefined)
    circle(object.position, definition.ownerActivationRadius, true, false);

  switch (geometry.kind) {
    case "marker":
      break;
    case "facing": {
      const reach = map.metersWide * 0.025;
      line([
        object.position,
        add(object.position, rotate({ x: reach, y: 0 }, object.rotation)),
      ]);
      break;
    }
    case "compound-wall": {
      for (const points of geometry.polygons)
        result.push({
          kind: "path",
          path: localPolygon(points, object),
          filled: true,
        });
      break;
    }
    case "circle": {
      const targets = [object.position, ...object.points];
      for (const point of targets) {
        circle(point, geometry.radius, true);
        if (geometry.innerRadius !== undefined)
          circle(point, geometry.innerRadius, true, false);
      }
      break;
    }
    case "sector": {
      const half = geometry.angle / 2;
      const a = add(
        object.position,
        rotate({ x: geometry.radius, y: 0 }, object.rotation - half),
      );
      const b = add(
        object.position,
        rotate({ x: geometry.radius, y: 0 }, object.rotation + half),
      );
      if (geometry.angle >= 360) circle(object.position, geometry.radius);
      else
        result.push({
          kind: "path",
          filled: true,
          path: `M${object.position.x} ${object.position.y} L${a.x} ${a.y} A${geometry.radius} ${geometry.radius} 0 ${geometry.angle > 180 ? 1 : 0} 1 ${b.x} ${b.y} Z`,
        });
      break;
    }
    case "strip": {
      const start =
        (geometry.centered ? -geometry.length / 2 : 0) +
        (geometry.startOffset ?? 0);
      const end = start + geometry.length;
      const half = geometry.width / 2;
      result.push({
        kind: "path",
        filled: true,
        path: localPolygon(
          [
            { x: start, y: -half },
            { x: end, y: -half },
            { x: end, y: half },
            { x: start, y: half },
          ],
          object,
        ),
      });
      break;
    }
    case "wall": {
      const start = geometry.centered ? -geometry.length / 2 : 0;
      for (const offset of geometry.twinGap
        ? [-geometry.twinGap / 2, geometry.twinGap / 2]
        : [0]) {
        line(
          [
            { x: start, y: offset },
            { x: start + geometry.length, y: offset },
          ].map((point) =>
            add(object.position, rotate(point, object.rotation)),
          ),
          true,
        );
      }
      break;
    }
    case "cross": {
      for (const rotation of [0, 90])
        line(
          [
            { x: -geometry.armLength, y: 0 },
            { x: geometry.armLength, y: 0 },
          ].map((point) =>
            add(object.position, rotate(point, object.rotation + rotation)),
          ),
          true,
        );
      break;
    }
    case "path": {
      for (const route of [object.points, ...(object.routes ?? [])]) {
        const points = [object.position, ...route];
        line(
          points,
          definition.agentSlug === "harbor" ||
            (definition.agentSlug === "phoenix" &&
              definition.slot === "Grenade"),
        );
        if (geometry.radius !== undefined)
          circle(points.at(-1)!, geometry.radius, true);
      }
      break;
    }
    case "segment":
      line([object.position, ...object.points]);
      break;
    case "teleport": {
      if (object.source) {
        line([object.source, object.position]);
      }
      break;
    }
    case "ground-volume":
      break;
    case "global-line": {
      const reach = Math.hypot(map.metersWide, map.metersHigh) * 2;
      line(
        [
          add(object.position, rotate({ x: -reach, y: 0 }, object.rotation)),
          add(object.position, rotate({ x: reach, y: 0 }, object.rotation)),
        ],
        true,
      );
      break;
    }
  }
  return result;
}

export function pointSegmentDistance(
  point: Point,
  start: Point,
  end: Point,
): number {
  const delta = subtract(end, start);
  const length2 = delta.x * delta.x + delta.y * delta.y;
  const t = length2
    ? Math.max(
        0,
        Math.min(
          1,
          ((point.x - start.x) * delta.x + (point.y - start.y) * delta.y) /
            length2,
        ),
      )
    : 0;
  return distance(point, {
    x: start.x + delta.x * t,
    y: start.y + delta.y * t,
  });
}

export function hitStroke(
  stroke: Stroke,
  point: Point,
  tolerance: number,
): boolean {
  if (stroke.type === "eraser") return false;
  if (stroke.points.length === 1)
    return distance(stroke.points[0], point) <= tolerance;
  for (let i = 1; i < stroke.points.length; i++)
    if (
      pointSegmentDistance(point, stroke.points[i - 1], stroke.points[i]) <=
      tolerance
    )
      return true;
  return false;
}

export function hitAbility(
  object: AbilityInstance,
  definition: AbilityDefinition,
  point: Point,
  tolerance: number,
): boolean {
  if (distance(object.position, point) <= tolerance) return true;
  const geometry = modeGeometry(definition, object);
  const local = rotate(subtract(point, object.position), -object.rotation);
  switch (geometry.kind) {
    case "circle":
      return [object.position, ...object.points].some(
        (center) => distance(point, center) <= geometry.radius,
      );
    case "sector":
      return (
        Math.hypot(local.x, local.y) <= geometry.radius &&
        Math.abs((Math.atan2(local.y, local.x) * 180) / Math.PI) <=
          geometry.angle / 2
      );
    case "strip": {
      const start =
        (geometry.centered ? -geometry.length / 2 : 0) +
        (geometry.startOffset ?? 0);
      return (
        local.x >= start &&
        local.x <= start + geometry.length &&
        Math.abs(local.y) <= geometry.width / 2 + tolerance
      );
    }
    case "wall": {
      const start = geometry.centered ? -geometry.length / 2 : 0;
      return (
        local.x >= start - tolerance &&
        local.x <= start + geometry.length + tolerance &&
        Math.abs(local.y) <= (geometry.twinGap ?? 0) / 2 + tolerance
      );
    }
    case "cross":
      return (
        Math.max(Math.abs(local.x), Math.abs(local.y)) <=
          geometry.armLength + tolerance &&
        Math.min(Math.abs(local.x), Math.abs(local.y)) <= tolerance
      );
    case "global-line":
      return Math.abs(local.y) <= tolerance;
    case "teleport":
      return (
        !!object.source &&
        pointSegmentDistance(point, object.source, object.position) <= tolerance
      );
    case "path": {
      return [object.points, ...(object.routes ?? [])].some((route) => {
        const points = [object.position, ...route];
        return (
          (geometry.radius !== undefined &&
            distance(point, points.at(-1)!) <= geometry.radius) ||
          points.some(
            (end, i) =>
              i > 0 &&
              pointSegmentDistance(point, points[i - 1], end) <= tolerance,
          )
        );
      });
    }
    case "segment":
      return (
        !!object.points[0] &&
        pointSegmentDistance(point, object.position, object.points[0]) <=
          tolerance
      );
    case "marker":
      return false;
    case "facing":
      return false;
    case "compound-wall":
      return geometry.polygons.some((polygon) =>
        hitPolygon(local, polygon, tolerance),
      );
    case "ground-volume":
      return false;
  }
}

function hitPolygon(
  point: Point,
  polygon: readonly Point[],
  tolerance: number,
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (pointSegmentDistance(point, a, b) <= tolerance) return true;
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
