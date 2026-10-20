import { getAgents } from "@/lib/catalog/catalog";
import type { PlacedAbility, PlacedAgent, Point, Stroke } from "./model";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object");
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
function point(value: unknown): value is Point {
  return (
    isRecord(value) &&
    finite(value.x) &&
    finite(value.y) &&
    value.x >= 0 &&
    value.x <= 1 &&
    value.y >= 0 &&
    value.y <= 1
  );
}
function identifier(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 100;
}
const color = (value: unknown): value is string =>
  typeof value === "string" && /^#[a-f0-9]{6}$/i.test(value);

/** Accept old shared links, but never trust their shape, sizes or image URLs. */
export function loadSharedBoard(encoded?: string): {
  strokes: Stroke[];
  placedAbilities: PlacedAbility[];
  placedAgents: PlacedAgent[];
} {
  const empty = { strokes: [], placedAbilities: [], placedAgents: [] };
  if (!encoded || encoded.length > 256 * 1024) return empty;
  try {
    const parsed: unknown = JSON.parse(atob(encoded));
    if (
      !isRecord(parsed) ||
      !Array.isArray(parsed.strokes) ||
      !Array.isArray(parsed.placedAbilities) ||
      !Array.isArray(parsed.placedAgents)
    )
      return empty;
    if (
      parsed.strokes.length > 2000 ||
      parsed.placedAbilities.length > 200 ||
      parsed.placedAgents.length > 200
    )
      return empty;
    let points = 0;
    const strokes: Stroke[] = [];
    for (const row of parsed.strokes) {
      if (
        !isRecord(row) ||
        !identifier(row.id) ||
        !["pen", "line", "arrow", "eraser"].includes(String(row.type)) ||
        !color(row.color) ||
        !finite(row.width) ||
        row.width <= 0 ||
        row.width > 32 ||
        !Array.isArray(row.points) ||
        !row.points.every(point)
      )
        return empty;
      points += row.points.length;
      if (points > 50000) return empty;
      strokes.push({
        id: row.id,
        type: row.type as Stroke["type"],
        color: row.color,
        width: row.width,
        points: row.points,
      });
    }
    const agents = getAgents();
    const placedAgents: PlacedAgent[] = [];
    for (const row of parsed.placedAgents) {
      if (!isRecord(row) || !point(row) || !identifier(row.id)) return empty;
      const agent = agents.find((agent) => agent.name === row.agentName);
      if (agent?.displayIcon)
        placedAgents.push({
          id: row.id,
          agentName: agent.name,
          iconUrl: agent.displayIcon,
          x: row.x,
          y: row.y,
        });
    }
    const placedAbilities: PlacedAbility[] = [];
    for (const row of parsed.placedAbilities) {
      if (
        !isRecord(row) ||
        !point(row) ||
        !identifier(row.id) ||
        !color(row.color) ||
        !finite(row.rotation) ||
        !["circle", "wall", "point", "cone", "cross"].includes(
          String(row.shape),
        )
      )
        return empty;
      const agent = agents.find((agent) => agent.name === row.agentName);
      const ability = agent?.abilities.find(
        (ability) => ability.displayName === row.abilityName,
      );
      if (!agent || !ability) continue;
      const geometry: Partial<PlacedAbility> = {};
      for (const key of [
        "radius",
        "length",
        "coneAngle",
        "coneRange",
        "endX",
        "endY",
      ] as const) {
        if (row[key] === undefined) continue;
        if (
          !finite(row[key]) ||
          row[key] < 0 ||
          row[key] > (key === "coneAngle" ? 360 : 2)
        )
          return empty;
        geometry[key] = row[key];
      }
      placedAbilities.push({
        ...geometry,
        id: row.id,
        agentName: agent.name,
        abilityName: ability.displayName,
        abilityIcon: ability.displayIcon,
        color: row.color,
        shape: row.shape as PlacedAbility["shape"],
        x: row.x,
        y: row.y,
        rotation: row.rotation % 360,
      });
    }
    return { strokes, placedAgents, placedAbilities };
  } catch {
    return empty;
  }
}
