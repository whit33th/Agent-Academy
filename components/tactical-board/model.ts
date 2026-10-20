import type { Agent, GameMap } from "@/lib/types";
import type { AbilityShape } from "@/lib/data/ability-stats";
export interface TacticalBoardProps {
  map: GameMap;
  allAgents: Agent[];
  initialStateStr?: string;
  onClose: () => void;
}

export type Tool = "select" | "pen" | "line" | "arrow" | "eraser";

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  type: "pen" | "line" | "arrow" | "eraser";
  color: string;
  width: number;
  points: Point[];
}

export interface PlacedAbility {
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

export interface PlacedAgent {
  id: string;
  agentName: string;
  iconUrl: string;
  x: number;
  y: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Constants

export const COLORS = [
  "#ff4655",
  "#00f3ff",
  "#ffd400",
  "#7c5cff",
  "#5cff8d",
  "#ffffff",
];
export const WIDTHS = [2, 4, 8];

// ───────────────────────────────────────────────────────────────────────────
// Main component
