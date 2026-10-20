/**
 * Per-agent portrait framing tuned to match Valorant's agent select crop.
 * Falls back to `defaultPortrait` for any agent not listed.
 */
export interface PortraitConfig {
  scale: number;
  x: number;
  y: number;
  objectPosition: string;
}

const defaultPortrait: PortraitConfig = {
  scale: 1.25,
  x: 0,
  y: 24,
  objectPosition: "center 8%",
};

const portraitByAgent: Record<string, PortraitConfig> = {
  jett: { scale: 1.75, x: -26, y: 60, objectPosition: "center 2%" },
  phoenix: { scale: 1.75, x: -1, y: 70, objectPosition: "center 2%" },
  sage: { scale: 1.75, x: 28, y: 67, objectPosition: "center 2%" },
  sova: { scale: 1.75, x: 4, y: 80, objectPosition: "center 2%" },
  viper: { scale: 1.75, x: 4, y: 60, objectPosition: "center 2%" },
  cypher: { scale: 1.75, x: 14, y: 73, objectPosition: "center 2%" },
  brimstone: { scale: 1.35, x: 4, y: 18, objectPosition: "center 12%" },
  killjoy: { scale: 1.75, x: 9, y: 62, objectPosition: "center 2%" },
  breach: { scale: 1.71, x: 10, y: 70, objectPosition: "center 2%" },
  omen: { scale: 1.75, x: 9, y: 65, objectPosition: "center 2%" },
  raze: { scale: 1.75, x: -5, y: 60, objectPosition: "center 2%" },
  reyna: { scale: 1.75, x: 9, y: 60, objectPosition: "center 2%" },
  skye: { scale: 1.75, x: -2, y: 71, objectPosition: "center 2%" },
  yoru: { scale: 1.73, x: 9, y: 62, objectPosition: "center 2%" },
  astra: { scale: 1.75, x: 72, y: 60, objectPosition: "center 2%" },
  "kay/o": { scale: 1.6, x: 40, y: 60, objectPosition: "center 2%" },
  chamber: { scale: 1.75, x: 0, y: 70, objectPosition: "center 2%" },
  neon: { scale: 1.75, x: 22, y: 70, objectPosition: "center 2%" },
  fade: { scale: 1.75, x: 13, y: 80, objectPosition: "center 2%" },
  harbor: { scale: 1.75, x: 12, y: 65, objectPosition: "center 2%" },
  gekko: { scale: 1.75, x: -15, y: 65, objectPosition: "center 2%" },
  deadlock: { scale: 1.75, x: 20, y: 65, objectPosition: "center 2%" },
  iso: { scale: 1.75, x: 3, y: 55, objectPosition: "center 2%" },
  clove: { scale: 1.75, x: 23, y: 80, objectPosition: "center 2%" },
  vyse: { scale: 1.73, x: 9, y: 90, objectPosition: "center 2%" },
  tejo: { scale: 1.75, x: 9, y: 80, objectPosition: "center 2%" },
  miks: { scale: 1.75, x: -21, y: 90, objectPosition: "center 2%" },
  veto: { scale: 1.75, x: -15, y: 96, objectPosition: "center 2%" },
  waylay: { scale: 1.75, x: 33, y: 60, objectPosition: "center 2%" },
};

export function getPortraitConfig(agentName: string): PortraitConfig {
  return portraitByAgent[agentName.toLowerCase()] ?? defaultPortrait;
}
