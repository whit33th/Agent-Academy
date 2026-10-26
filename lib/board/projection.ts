import type { MapCalibration, Point } from "./types";

export function radarToMap(point: Point, map: MapCalibration): Point {
  return { x: point.x * map.metersWide, y: point.y * map.metersHigh };
}

export function mapToRadar(point: Point, map: MapCalibration): Point {
  return { x: point.x / map.metersWide, y: point.y / map.metersHigh };
}

export function worldToMap(worldMeters: Point, map: MapCalibration): Point {
  const [a, b, c, d, tx, ty] = map.worldToRadar;
  return radarToMap(
    {
      x: (worldMeters.x * a + worldMeters.y * b) * 100 + tx,
      y: (worldMeters.x * c + worldMeters.y * d) * 100 + ty,
    },
    map,
  );
}

export function mapToWorld(point: Point, map: MapCalibration): Point {
  const radar = mapToRadar(point, map);
  const [a, b, c, d, tx, ty] = map.worldToRadar;
  const determinant = a * d - b * c;
  return {
    x: (d * (radar.x - tx) - b * (radar.y - ty)) / (determinant * 100),
    y: (a * (radar.y - ty) - c * (radar.x - tx)) / (determinant * 100),
  };
}

export interface Viewport {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function clientToMap(
  point: Point,
  viewport: Viewport,
  map: MapCalibration,
): Point {
  return radarToMap(
    {
      x: (point.x - viewport.left) / viewport.width,
      y: (point.y - viewport.top) / viewport.height,
    },
    map,
  );
}

export function mapToScreen(
  point: Point,
  viewport: Pick<Viewport, "width" | "height">,
  map: MapCalibration,
): Point {
  const p = mapToRadar(point, map);
  return { x: p.x * viewport.width, y: p.y * viewport.height };
}

export function insideMap(point: Point, map: MapCalibration): boolean {
  return (
    point.x >= 0 &&
    point.y >= 0 &&
    point.x <= map.metersWide &&
    point.y <= map.metersHigh
  );
}

/** Restrict the anchor, never independently clamp a shape's endpoints. */
export function clampAnchor(point: Point, map: MapCalibration): Point {
  return {
    x: Math.max(0, Math.min(map.metersWide, point.x)),
    y: Math.max(0, Math.min(map.metersHigh, point.y)),
  };
}
