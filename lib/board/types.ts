import type { AgentAbility } from "@/lib/types";

export type ActiveAbilitySlot = Exclude<AgentAbility["slot"], "Passive">;
export type Point = Readonly<{ x: number; y: number }>;
export type Tool = "select" | "pen" | "line" | "arrow" | "eraser";

/** Map-oriented metres: +x is radar right, +y is radar down. */
export interface MapCalibration {
  mapId: string;
  mapUuid: string;
  gameBuild: string;
  manifestId: string;
  radar: string;
  radarWidth: number;
  radarHeight: number;
  metersWide: number;
  metersHigh: number;
  worldToRadar: readonly [number, number, number, number, number, number];
  callouts: readonly {
    regionName: string;
    superRegion: string | null;
    x: number;
    y: number;
  }[];
}

export interface MetricEvidence {
  value: number;
  unit: "m" | "deg" | "s" | "count" | "raw";
  package: string;
  component: string;
  property: string;
  sourceBuild: string;
  source: string;
}

export type AbilityGeometry =
  | { kind: "marker" }
  | { kind: "facing" }
  | {
      kind: "compound-wall";
      polygons: readonly (readonly Point[])[];
      travel?: number;
    }
  | { kind: "circle"; radius: number; innerRadius?: number }
  | { kind: "sector"; radius: number; angle: number }
  | {
      kind: "strip";
      length: number;
      width: number;
      centered?: boolean;
      startOffset?: number;
    }
  | { kind: "wall"; length: number; twinGap?: number; centered?: boolean }
  | { kind: "cross"; armLength: number }
  | { kind: "path"; maxLength?: number; radius?: number; maxRoutes?: number }
  | { kind: "segment"; maxLength: number; minLength?: number }
  | { kind: "teleport"; maxDistance?: number }
  | {
      kind: "ground-volume";
      cellSize: number;
      cellCount: number;
      maxVolumeConstraint: number;
      stepUp: number;
      stepDown: number;
    }
  | { kind: "global-line" };

export interface AbilityMode {
  id: string;
  label: string;
  geometry: AbilityGeometry;
  /** Number of independently editable target centres in one cast. */
  targets?: number;
}

export interface AbilityDefinition {
  id: string;
  agentId: string;
  agentSlug: string;
  slot: ActiveAbilitySlot;
  name: string;
  icon: string | null;
  color: string;
  placement: "point" | "direction" | "segment" | "path";
  modes: readonly AbilityMode[];
  castRange?: number;
  ownerActivationRadius?: number;
  evidence: Record<string, MetricEvidence>;
}

export interface Stroke {
  id: string;
  kind: "stroke";
  type: Exclude<Tool, "select">;
  color: string;
  /** CSS pixels, intentionally independent of map metres. */
  width: number;
  points: readonly Point[];
}

export interface AbilityInstance {
  id: string;
  kind: "ability";
  definitionId: string;
  mode: string;
  position: Point;
  /** Clockwise degrees in map-oriented coordinates. */
  rotation: number;
  points: readonly Point[];
  source?: Point;
  /** Additional routes of the same cast, sharing its origin. */
  routes?: readonly (readonly Point[])[];
  showOwnerRange?: boolean;
}

export interface AgentInstance {
  id: string;
  kind: "agent";
  agentId: string;
  position: Point;
}

export type BoardObject = Stroke | AbilityInstance | AgentInstance;

export interface BoardDocumentV2 {
  version: 2;
  mapId: string;
  gameBuild: string;
  dataVersion: string;
  objects: readonly BoardObject[];
}

export type ObjectSelection = { id: string; handle?: number | "source" } | null;

export const ACTIVE_SLOTS: readonly ActiveAbilitySlot[] = [
  "Grenade",
  "Ability1",
  "Ability2",
  "Ultimate",
];
export const COLORS = [
  "#ff4655",
  "#00f3ff",
  "#ffd400",
  "#7c5cff",
  "#5cff8d",
  "#ffffff",
];
export const WIDTHS = [2, 4, 8];
export const BOARD_LIMITS = {
  abilities: 200,
  agents: 200,
  strokes: 2000,
  points: 50000,
  routePoints: 128,
  routes: 3,
} as const;
