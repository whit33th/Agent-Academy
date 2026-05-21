import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

interface WikiAbilitySeed {
  agent: string;
  ability: string;
  page: string;
}

interface ExtractedAbilityData {
  agent: string;
  ability: string;
  page: string;
  url: string;
  extractedAt: string;
  durationSec?: number;
  radiusM?: number;
  rangeM?: number;
  widthM?: number;
  rawMatches: string[];
  confidence: "low" | "medium" | "high";
}

const WIKI_API = "https://valorant.fandom.com/api.php";
const OUT_DIR = path.join(process.cwd(), "lib", "generated");
const OUT_JSON = path.join(OUT_DIR, "valorant-wiki-abilities.json");
const OUT_TS = path.join(OUT_DIR, "valorant-wiki-abilities.ts");

const SEEDS: WikiAbilitySeed[] = [
  { agent: "Brimstone", ability: "Stim Beacon", page: "Stim_Beacon" },
  { agent: "Brimstone", ability: "Incendiary", page: "Incendiary" },
  { agent: "Brimstone", ability: "Sky Smoke", page: "Sky_Smoke" },
  { agent: "Brimstone", ability: "Orbital Strike", page: "Orbital_Strike" },
  { agent: "Viper", ability: "Snake Bite", page: "Snake_Bite" },
  { agent: "Viper", ability: "Poison Cloud", page: "Poison_Cloud" },
  { agent: "Viper", ability: "Toxic Screen", page: "Toxic_Screen" },
  // { agent: "Viper", ability: "Viper's Pit", page: "Viper%27s_Pit" },
  { agent: "Omen", ability: "Shrouded Step", page: "Shrouded_Step" },
  { agent: "Omen", ability: "Paranoia", page: "Paranoia" },
  { agent: "Omen", ability: "Dark Cover", page: "Dark_Cover" },
  { agent: "Omen", ability: "From the Shadows", page: "From_the_Shadows" },
  { agent: "Killjoy", ability: "Alarmbot", page: "Alarmbot" },
  { agent: "Killjoy", ability: "Nanoswarm", page: "Nanoswarm" },
  { agent: "Killjoy", ability: "Turret", page: "Turret" },
  { agent: "Killjoy", ability: "Lockdown", page: "Lockdown" },
  { agent: "Cypher", ability: "Trapwire", page: "Trapwire" },
  { agent: "Cypher", ability: "Cyber Cage", page: "Cyber_Cage" },
  { agent: "Cypher", ability: "Spycam", page: "Spycam" },
  { agent: "Cypher", ability: "Neural Theft", page: "Neural_Theft" },
  { agent: "Sova", ability: "Shock Bolt", page: "Shock_Bolt" },
  { agent: "Sova", ability: "Recon Bolt", page: "Recon_Bolt" },
  { agent: "Sova", ability: "Owl Drone", page: "Owl_Drone" },
  { agent: "Sova", ability: "Hunter's Fury", page: "Hunter's_Fury" },
  { agent: "Sage", ability: "Barrier Orb", page: "Barrier_Orb" },
  { agent: "Sage", ability: "Slow Orb", page: "Slow_Orb" },
  { agent: "Sage", ability: "Healing Orb", page: "Healing_Orb" },
  { agent: "Sage", ability: "Resurrection", page: "Resurrection" },
  { agent: "Phoenix", ability: "Blaze", page: "Blaze" },
  { agent: "Phoenix", ability: "Curveball", page: "Curveball" },
  { agent: "Phoenix", ability: "Hot Hands", page: "Hot_Hands" },
  { agent: "Phoenix", ability: "Run It Back", page: "Run_It_Back" },
  { agent: "Raze", ability: "Boom Bot", page: "Boom_Bot" },
  { agent: "Raze", ability: "Blast Pack", page: "Blast_Pack" },
  { agent: "Raze", ability: "Paint Shells", page: "Paint_Shells" },
  { agent: "Raze", ability: "Showstopper", page: "Showstopper" },
  { agent: "Jett", ability: "Cloudburst", page: "Cloudburst" },
  { agent: "Jett", ability: "Updraft", page: "Updraft" },
  { agent: "Jett", ability: "Tailwind", page: "Tailwind" },
  { agent: "Jett", ability: "Blade Storm", page: "Blade_Storm" },
  { agent: "Reyna", ability: "Leer", page: "Leer" },
  { agent: "Reyna", ability: "Devour", page: "Devour" },
  { agent: "Reyna", ability: "Dismiss", page: "Dismiss" },
  { agent: "Reyna", ability: "Empress", page: "Empress" },
  { agent: "Breach", ability: "Aftershock", page: "Aftershock" },
  { agent: "Breach", ability: "Flashpoint", page: "Flashpoint" },
  { agent: "Breach", ability: "Fault Line", page: "Fault_Line" },
  { agent: "Breach", ability: "Rolling Thunder", page: "Rolling_Thunder" },
  { agent: "Skye", ability: "Regrowth", page: "Regrowth" },
  { agent: "Skye", ability: "Trailblazer", page: "Trailblazer" },
  { agent: "Skye", ability: "Guiding Light", page: "Guiding_Light" },
  { agent: "Skye", ability: "Seekers", page: "Seekers" },
  { agent: "Yoru", ability: "Fakeout", page: "Fakeout" },
  { agent: "Yoru", ability: "Blindside", page: "Blindside" },
  { agent: "Yoru", ability: "Gatecrash", page: "Gatecrash" },
  { agent: "Yoru", ability: "Dimensional Drift", page: "Dimensional_Drift" },
  { agent: "Astra", ability: "Gravity Well", page: "Gravity_Well" },
  { agent: "Astra", ability: "Nova Pulse", page: "Nova_Pulse" },
  { agent: "Astra", ability: "Nebula", page: "Nebula_/_Dissipate" },
  { agent: "Astra", ability: "Cosmic Divide", page: "Cosmic_Divide" },
  { agent: "KAY/O", ability: "FRAG/ment", page: "FRAG-ment" },
  { agent: "KAY/O", ability: "FLASH/drive", page: "FLASH-drive" },
  { agent: "KAY/O", ability: "ZERO/point", page: "ZERO-point" },
  { agent: "KAY/O", ability: "NULL/cmd", page: "NULL-cmd" },
  { agent: "Chamber", ability: "Trademark", page: "Trademark" },
  { agent: "Chamber", ability: "Headhunter", page: "Headhunter" },
  { agent: "Chamber", ability: "Rendezvous", page: "Rendezvous" },
  { agent: "Chamber", ability: "Tour de Force", page: "Tour_de_Force" },
  { agent: "Neon", ability: "Relay Bolt", page: "Relay_Bolt" },
  { agent: "Neon", ability: "High Gear", page: "High_Gear" },
  { agent: "Neon", ability: "Fast Lane", page: "Fast_Lane" },
  { agent: "Neon", ability: "Overdrive", page: "Overdrive" },
  { agent: "Fade", ability: "Prowler", page: "Prowler" },
  { agent: "Fade", ability: "Seize", page: "Seize" },
  { agent: "Fade", ability: "Haunt", page: "Haunt" },
  { agent: "Fade", ability: "Nightfall", page: "Nightfall" },
  { agent: "Harbor", ability: "Cascade", page: "Cascade" },
  { agent: "Harbor", ability: "Cove", page: "Cove" },
  { agent: "Harbor", ability: "High Tide", page: "High_Tide" },
  { agent: "Harbor", ability: "Reckoning", page: "Reckoning" },
  { agent: "Gekko", ability: "Wingman", page: "Wingman" },
  { agent: "Gekko", ability: "Dizzy", page: "Dizzy" },
  { agent: "Gekko", ability: "Mosh Pit", page: "Mosh_Pit" },
  { agent: "Gekko", ability: "Thrash", page: "Thrash" },
  { agent: "Deadlock", ability: "GravNet", page: "GravNet" },
  { agent: "Deadlock", ability: "Sonic Sensor", page: "Sonic_Sensor" },
  { agent: "Deadlock", ability: "Barrier Mesh", page: "Barrier_Mesh" },
  { agent: "Deadlock", ability: "Annihilation", page: "Annihilation" },
  { agent: "Iso", ability: "Double Tap", page: "Double_Tap" },
  { agent: "Iso", ability: "Undercut", page: "Undercut" },
  { agent: "Iso", ability: "Contingency", page: "Contingency" },
  { agent: "Iso", ability: "Kill Contract", page: "Kill_Contract" },
  { agent: "Clove", ability: "Meddle", page: "Meddle" },
  { agent: "Clove", ability: "Pick-Me-Up", page: "Pick-Me-Up" },
  { agent: "Clove", ability: "Ruse", page: "Ruse" },
  { agent: "Clove", ability: "Not Dead Yet", page: "Not_Dead_Yet" },
  { agent: "Vyse", ability: "Shear", page: "Shear" },
  { agent: "Vyse", ability: "Arc Rose", page: "Arc_Rose" },
  { agent: "Vyse", ability: "Razorvine", page: "Razorvine" },
  { agent: "Vyse", ability: "Steel Garden", page: "Steel_Garden" },
  { agent: "Tejo", ability: "Stealth Drone", page: "Stealth_Drone" },
  { agent: "Tejo", ability: "Guided Salvo", page: "Guided_Salvo" },
  { agent: "Tejo", ability: "Special Delivery", page: "Special_Delivery" },
  { agent: "Tejo", ability: "Armageddon", page: "Armageddon" },
  { agent: "Waylay", ability: "Lightspeed", page: "Lightspeed" },
  { agent: "Waylay", ability: "Saturate", page: "Saturate" },
  { agent: "Waylay", ability: "Convergent Paths", page: "Convergent_Paths" },
];

async function fetchWikiText(page: string): Promise<string> {
  const url = `${WIKI_API}?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&origin=*`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AgentAcademyAbilitySync/1.0 (local development)",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${page}: ${response.status}`);
  }
  const json = (await response.json()) as {
    parse?: { wikitext?: { "*"?: string } };
    error?: { info?: string };
  };
  if (json.error) throw new Error(`${page}: ${json.error.info}`);
  return json.parse?.wikitext?.["*"] ?? "";
}

function normalizeNumber(value: string): number {
  return Number(value.replace(",", "."));
}

function findFirst(text: string, patterns: RegExp[]): number | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return normalizeNumber(match[1]);
  }
  return undefined;
}

function maxMeterValueNear(text: string, label: RegExp): number | undefined {
  const labelMatch = text.match(label);
  if (!labelMatch?.index) return undefined;
  const slice = text.slice(labelMatch.index, labelMatch.index + 260);
  const meters = Array.from(
    slice.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:m|meters?|metres?)/gi),
  ).map((match) => normalizeNumber(match[1]));
  return meters.length ? Math.max(...meters) : undefined;
}

function secondsNear(text: string, label: RegExp): number | undefined {
  const labelMatch = text.match(label);
  if (!labelMatch?.index) return undefined;
  const slice = text.slice(labelMatch.index, labelMatch.index + 180);
  const seconds = Array.from(
    slice.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:s|sec|seconds?)/gi),
  ).map((match) => normalizeNumber(match[1]));
  return seconds[0];
}

function cleanCell(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\{\{[^}]+\}\}/g, " ")
    .replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/g, "$2")
    .replace(/'''?/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseWikiTableRows(
  wikitext: string,
): { stat: string; value: string }[] {
  const rows: { stat: string; value: string }[] = [];
  const tables = wikitext.match(/\{\|[\s\S]*?\|\}/g) ?? [];

  for (const table of tables) {
    if (!/wikitable/i.test(table)) continue;
    for (const rawRow of table.split(/\n\|-/g)) {
      const cells = rawRow
        .split(/\n\|/g)
        .map((cell) => cleanCell(cell.replace(/^rowspan="\d+"\|/i, "")))
        .filter(Boolean);
      if (cells.length < 2) continue;
      const stat = cells[0]
        .replace(/^20px\|link=\s*/i, "")
        .replace(/^Stat\s+Value\s+Confirmed value\??/i, "")
        .trim();
      const value = cells.slice(1).join(" ");
      if (stat && value) rows.push({ stat, value });
    }
  }

  return rows;
}

function maxMeters(value: string): number | undefined {
  const meters = Array.from(
    value.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:m|meters?|metres?)/gi),
  ).map((match) => normalizeNumber(match[1]));
  return meters.length ? Math.max(...meters) : undefined;
}

function firstSeconds(value: string): number | undefined {
  const seconds = value.match(/(\d+(?:[.,]\d+)?)\s*(?:s|sec|seconds?)/i);
  return seconds?.[1] ? normalizeNumber(seconds[1]) : undefined;
}

function extract(
  seed: WikiAbilitySeed,
  wikitext: string,
): ExtractedAbilityData {
  const rows = parseWikiTableRows(wikitext);

  const rowFor = (test: RegExp) => rows.find((row) => test.test(row.stat));

  const durationRow = rowFor(/(?:^|\b)(?:max\s+)?duration(?:\b|$)/i);
  const radiiRow = rowFor(
    /^(?:radii|radius|outer radius|effect radius|aoe radius)\b/i,
  );
  const rangeRow = rowFor(
    /^(?:range|distance|length|max detection cone distance|max range)\b/i,
  );
  const widthRow = rowFor(/^(?:width|wall length|wall width)\b/i);

  const durationSec = durationRow ? firstSeconds(durationRow.value) : undefined;
  const radiusM = radiiRow ? maxMeters(radiiRow.value) : undefined;
  const rangeM = rangeRow ? maxMeters(rangeRow.value) : undefined;
  const widthM = widthRow ? maxMeters(widthRow.value) : undefined;

  const extractedNumbers = [durationSec, radiusM, rangeM, widthM].filter(
    (value) => value != null,
  ).length;

  const confidence: "low" | "medium" | "high" =
    extractedNumbers >= 3 ? "high" : extractedNumbers >= 1 ? "medium" : "low";

  return {
    agent: seed.agent,
    ability: seed.ability,
    page: seed.page,
    url: `https://valorant.fandom.com/wiki/${seed.page}`,
    extractedAt: new Date().toISOString(),
    durationSec,
    radiusM,
    rangeM,
    widthM,
    rawMatches: rows.map((row) => `${row.stat} :: ${row.value}`).slice(0, 20),
    confidence,
  };
}

async function main() {
  const results: ExtractedAbilityData[] = [];
  for (const seed of SEEDS) {
    try {
      const wikitext = await fetchWikiText(seed.page);
      results.push(extract(seed, wikitext));
      await new Promise((resolve) => setTimeout(resolve, 250));
    } catch (error) {
      console.error(`[wiki-sync] ${seed.ability}:`, error);
    }
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_JSON, JSON.stringify(results, null, 2) + "\n", "utf8");
  await writeFile(
    OUT_TS,
    `import type { AbilityStats } from "@/lib/data/ability-stats";\n\nexport interface WikiAbilityDatum {\n  agent: string;\n  ability: string;\n  page: string;\n  url: string;\n  extractedAt: string;\n  durationSec?: number;\n  radiusM?: number;\n  rangeM?: number;\n  widthM?: number;\n  rawMatches: string[];\n  confidence: "low" | "medium" | "high";\n}\n\nexport const VALORANT_WIKI_ABILITIES: readonly WikiAbilityDatum[] = ${JSON.stringify(results, null, 2)};\n\nexport const VALORANT_WIKI_ABILITY_STATS = VALORANT_WIKI_ABILITIES.map((item): AbilityStats => ({\n  key: item.ability.toLowerCase(),\n  shape: item.radiusM != null ? "circle" : item.rangeM != null ? "wall" : "point",\n  radiusM: item.radiusM,\n  lengthM: item.rangeM,\n  durationSec: item.durationSec,\n  label: item.ability,\n}));\n`,
    "utf8",
  );
  console.log(`[wiki-sync] wrote ${results.length} abilities`);
}

void main();
