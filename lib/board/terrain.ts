/** Collision-space metres. Unlike radar coordinates, Z is retained for floor queries. */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}
export interface CollisionTriangle {
  a: Vector3;
  b: Vector3;
  c: Vector3;
  /** Stable authored instance/body identity, used by the game's query filter. */
  bodyId: string;
}
export interface TerrainHit {
  position: Vector3;
  normal: Vector3;
  distance: number;
  bodyId: string;
  triangle: number;
}
interface Bounds {
  min: Vector3;
  max: Vector3;
}
interface Node extends Bounds {
  left?: Node;
  right?: Node;
  faces?: readonly number[];
}
export interface TerrainQuery {
  /** Required: callers must supply the verified collision-channel/tag predicate. */
  acceptsBody: (bodyId: string) => boolean;
  /** Required: do not assume the native query is double-sided. */
  doubleSided: boolean;
}
const subtract = (a: Vector3, b: Vector3): Vector3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});
const cross = (a: Vector3, b: Vector3): Vector3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const dot = (a: Vector3, b: Vector3) => a.x * b.x + a.y * b.y + a.z * b.z;
const axes = ["x", "y", "z"] as const;

function triangleBounds(triangle: CollisionTriangle): Bounds {
  return {
    min: {
      x: Math.min(triangle.a.x, triangle.b.x, triangle.c.x),
      y: Math.min(triangle.a.y, triangle.b.y, triangle.c.y),
      z: Math.min(triangle.a.z, triangle.b.z, triangle.c.z),
    },
    max: {
      x: Math.max(triangle.a.x, triangle.b.x, triangle.c.x),
      y: Math.max(triangle.a.y, triangle.b.y, triangle.c.y),
      z: Math.max(triangle.a.z, triangle.b.z, triangle.c.z),
    },
  };
}
function buildNode(bounds: readonly Bounds[], faces: readonly number[]): Node {
  const min = { x: Infinity, y: Infinity, z: Infinity },
    max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const index of faces)
    for (const axis of axes) {
      min[axis] = Math.min(min[axis], bounds[index].min[axis]);
      max[axis] = Math.max(max[axis], bounds[index].max[axis]);
    }
  if (faces.length <= 8) return { min, max, faces };
  const axis = axes.reduce((longest, candidate) =>
    max[candidate] - min[candidate] > max[longest] - min[longest]
      ? candidate
      : longest,
  );
  const sorted = [...faces].sort(
    (a, b) =>
      bounds[a].min[axis] +
        bounds[a].max[axis] -
        (bounds[b].min[axis] + bounds[b].max[axis]) || a - b,
  );
  const middle = Math.floor(sorted.length / 2);
  return {
    min,
    max,
    left: buildNode(bounds, sorted.slice(0, middle)),
    right: buildNode(bounds, sorted.slice(middle)),
  };
}
function intersects(
  bounds: Bounds,
  origin: Vector3,
  direction: Vector3,
  maxDistance: number,
): boolean {
  let low = 0,
    high = maxDistance;
  for (const axis of axes) {
    if (direction[axis] === 0) {
      if (origin[axis] < bounds.min[axis] || origin[axis] > bounds.max[axis])
        return false;
      continue;
    }
    const a = (bounds.min[axis] - origin[axis]) / direction[axis],
      b = (bounds.max[axis] - origin[axis]) / direction[axis];
    low = Math.max(low, Math.min(a, b));
    high = Math.min(high, Math.max(a, b));
    if (low > high) return false;
  }
  return true;
}

/** Triangle queries are geometry infrastructure, not a substitute Pit growth algorithm. */
export class TerrainCollision {
  private readonly root: Node | null;
  constructor(private readonly triangles: readonly CollisionTriangle[]) {
    for (const face of triangles)
      if (
        ![face.a, face.b, face.c].every((point) =>
          axes.every((axis) => Number.isFinite(point[axis])),
        )
      )
        throw new Error("Non-finite terrain vertex.");
    this.root = triangles.length
      ? buildNode(
          triangles.map(triangleBounds),
          triangles.map((_, index) => index),
        )
      : null;
  }

  castSegment(
    start: Vector3,
    end: Vector3,
    query: TerrainQuery,
  ): readonly TerrainHit[] {
    const vector = subtract(end, start),
      length = Math.hypot(vector.x, vector.y, vector.z);
    if (!length || !this.root) return [];
    const direction = {
      x: vector.x / length,
      y: vector.y / length,
      z: vector.z / length,
    };
    const hits: TerrainHit[] = [],
      stack = [this.root];
    while (stack.length) {
      const node = stack.pop()!;
      if (!intersects(node, start, direction, length)) continue;
      if (node.left) stack.push(node.left);
      if (node.right) stack.push(node.right);
      for (const index of node.faces ?? []) {
        const triangle = this.triangles[index];
        if (!query.acceptsBody(triangle.bodyId)) continue;
        const edge1 = subtract(triangle.b, triangle.a),
          edge2 = subtract(triangle.c, triangle.a);
        const p = cross(direction, edge2),
          determinant = dot(edge1, p);
        if (
          query.doubleSided
            ? Math.abs(determinant) <= Number.EPSILON
            : determinant <= Number.EPSILON
        )
          continue;
        const inverse = 1 / determinant,
          offset = subtract(start, triangle.a);
        const u = dot(offset, p) * inverse;
        if (u < 0 || u > 1) continue;
        const q = cross(offset, edge1),
          v = dot(direction, q) * inverse;
        if (v < 0 || u + v > 1) continue;
        const distance = dot(edge2, q) * inverse;
        if (distance < 0 || distance > length) continue;
        const normal = cross(edge1, edge2),
          normalLength = Math.hypot(normal.x, normal.y, normal.z);
        if (!normalLength) continue;
        hits.push({
          position: {
            x: start.x + direction.x * distance,
            y: start.y + direction.y * distance,
            z: start.z + direction.z * distance,
          },
          normal: {
            x: normal.x / normalLength,
            y: normal.y / normalLength,
            z: normal.z / normalLength,
          },
          distance,
          bodyId: triangle.bodyId,
          triangle: index,
        });
      }
    }
    return hits.sort(
      (a, b) => a.distance - b.distance || a.triangle - b.triangle,
    );
  }
}
