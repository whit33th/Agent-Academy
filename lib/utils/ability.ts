import type { AgentAbility } from "@/lib/types";

/** Generic ability category used by screenshots filtering. */
export type GenericAbilityType =
  | "smoke"
  | "wall"
  | "flash"
  | "molly"
  | "recon"
  | "heal"
  | "ultimate"
  | "other";

/** Tactical-board classification (smaller superset, no flash). */
export type AbilityCategory = "smoke" | "wall" | "molly" | "recon" | "generic";

/** Slot label → keybind mapping (uppercase). */
const SLOT_TO_KEY: Record<string, string> = {
  ability1: "Q",
  ability2: "E",
  grenade: "C",
  ultimate: "X",
  passive: "Passive",
};

export function getSlotKey(slot: string): string {
  return SLOT_TO_KEY[slot.toLowerCase()] ?? slot;
}

const SMOKE_TOKENS = ["smoke", "cloud", "nebula", "block vision"];
const WALL_TOKENS = ["wall", "barrier", "screen"];
const FLASH_TOKENS = ["flash", "blind", "guiding light", "flashbang"];
const MOLLY_TOKENS = [
  "molly",
  "swarm",
  "grenade",
  "bite",
  "incendiary",
  "fire",
  "burning",
  "damage over time",
];
const RECON_TOKENS = [
  "recon",
  "scan",
  "reveal",
  "sensor",
  "dart",
  "drone",
  "camera",
  "spy",
  "detect",
  "sonar",
];
const HEAL_TOKENS = ["heal", "support", "revive", "health"];

/** Map a Valorant ability to a generic screenshot category. */
export function mapAbilityToGenericType(
  slot: string,
  displayName: string,
  description: string,
): GenericAbilityType {
  const s = slot.toLowerCase();
  if (s === "ultimate") return "ultimate";

  const combined = `${displayName} ${description}`.toLowerCase();
  const hits = (tokens: string[]) => tokens.some((t) => combined.includes(t));

  if (hits(SMOKE_TOKENS)) return "smoke";
  if (hits(WALL_TOKENS)) return "wall";
  if (hits(FLASH_TOKENS)) return "flash";
  if (hits(MOLLY_TOKENS)) return "molly";
  if (hits(RECON_TOKENS)) return "recon";
  if (hits(HEAL_TOKENS)) return "heal";
  return "other";
}

/** Match a screenshot title/type to a specific ability (used by lineup viewer filter). */
export function matchScreenshotToAbility(
  screenshot: { title: string; abilityType: string | null },
  ability: AgentAbility,
  agentName: string,
): boolean {
  const title = (screenshot.title ?? "").toLowerCase();
  const type = (screenshot.abilityType ?? "").toLowerCase();
  const name = (ability.displayName ?? "").toLowerCase();
  const slot = (ability.slot ?? "").toLowerCase();
  const agent = agentName.toLowerCase();

  if (slot === "ultimate" || name.includes("ultimate")) {
    return (
      type === "ultimate" ||
      title.includes("ult") ||
      title.includes("ultimate") ||
      title.includes(name)
    );
  }

  // Agent-specific manual overrides (preserves prior behavior for Killjoy/Viper).
  if (agent === "killjoy") {
    if (name.includes("nanoswarm") || slot === "grenade") {
      return (
        type === "molly" ||
        ["molly", "nanoswarm", "granade", "grenade", "swarm"].some((t) =>
          title.includes(t),
        )
      );
    }
    if (name.includes("turret") || slot === "ability2") {
      return title.includes("turret") || title.includes("turet");
    }
    if (name.includes("alarmbot") || slot === "ability1") {
      return title.includes("alarm") || title.includes("bot");
    }
  }

  if (agent === "viper") {
    if (name.includes("toxic screen") || slot === "ability2") {
      return (
        type === "wall" ||
        ["wall", "screen", "toxic screen"].some((t) => title.includes(t))
      );
    }
    if (name.includes("poison cloud") || slot === "ability1") {
      return ["cloud", "orb", "smoke", "poison"].some((t) => title.includes(t));
    }
    if (name.includes("snake bite") || slot === "grenade") {
      return ["bite", "snake", "molly"].some((t) => title.includes(t));
    }
  }

  // Generic keyword matching on remaining ability words.
  return name
    .split(" ")
    .filter((kw) => kw.length > 3)
    .some((kw) => title.includes(kw));
}

// ─── Tactical Board classification ───

const BOARD_SMOKE = [
  "smoke",
  "nebula",
  "dark cover",
  "cloudburst",
  "sky smoke",
  "shrouded step",
  "paranoia",
  "stim beacon",
  "orbital strike",
  "from the shadows",
];
const BOARD_WALL = ["wall", "barrier", "toxic screen", "blaze", "cosmic divide"];
const BOARD_MOLLY = [
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
const BOARD_RECON = [
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

export function classifyBoardAbility(ability: AgentAbility): AbilityCategory {
  const combined = `${ability.displayName ?? ""} ${ability.description ?? ""}`.toLowerCase();
  const hits = (tokens: string[]) => tokens.some((t) => combined.includes(t));
  if (hits(BOARD_WALL)) return "wall";
  if (hits(BOARD_SMOKE)) return "smoke";
  if (hits(BOARD_MOLLY)) return "molly";
  if (hits(BOARD_RECON)) return "recon";
  return "generic";
}

export function getCategoryColor(cat: AbilityCategory): string {
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

export function getCategoryBorder(cat: AbilityCategory): string {
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
