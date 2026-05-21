import type { AbilityStats } from "@/lib/data/ability-stats";

export interface WikiAbilityDatum {
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

export const VALORANT_WIKI_ABILITIES: readonly WikiAbilityDatum[] = [
  {
    "agent": "Brimstone",
    "ability": "Stim Beacon",
    "page": "Stim_Beacon",
    "url": "https://valorant.fandom.com/wiki/Stim_Beacon",
    "extractedAt": "2026-05-21T10:35:39.360Z",
    "durationSec": 4,
    "radiusM": 6,
    "rawMatches": [
      "Unequip time :: 0.7 seconds Game files",
      "Radius :: 6 meters Game files",
      "Buffs :: + 10% Equip speed + 10% Fire rate + 10% Reload speed + 10% Recovery speed + 10% Speed Boost Game files &",
      "Buff duration :: 4 seconds Game files",
      "Beacon duration :: 12 seconds Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Brimstone",
    "ability": "Incendiary",
    "page": "Incendiary",
    "url": "https://valorant.fandom.com/wiki/Incendiary",
    "extractedAt": "2026-05-21T10:35:39.811Z",
    "durationSec": 8,
    "radiusM": 4.5,
    "rawMatches": [
      "Equip time :: 1.1 seconds Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Radius :: 4.5 meters Game files",
      "Damage :: 1 per tick Range's training bot",
      "Total 420-465 x0.5 multiplier to objects :: &",
      "Ticks/Tick rate :: 60 per second (1 every 0.0167 secs) Total 420-465 ticks Game files",
      "Duration :: Total 8 seconds 0.25-second explosion time 0.75-second spread time 7 seconds at full size Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Brimstone",
    "ability": "Sky Smoke",
    "page": "Sky_Smoke",
    "url": "https://valorant.fandom.com/wiki/Sky_Smoke",
    "extractedAt": "2026-05-21T10:35:40.309Z",
    "durationSec": 19.25,
    "radiusM": 4.15,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Max cast range :: 55 meters",
      "Unequip time :: 0.7 seconds Game files",
      "Deploy time :: 1 seconds",
      "Radius :: 4.15 meters",
      "rowspan=2|20px|link= Duration :: 19.25 seconds",
      "Expiration warning at 17.75 seconds :: }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Brimstone",
    "ability": "Orbital Strike",
    "page": "Orbital_Strike",
    "url": "https://valorant.fandom.com/wiki/Orbital_Strike",
    "extractedAt": "2026-05-21T10:35:40.804Z",
    "durationSec": 3,
    "radiusM": 9,
    "rawMatches": [
      "Equip time :: 0.74 seconds Game files",
      "Max cast range :: 60 meters Game files",
      "Unequip time :: 1 second Game files",
      "Windup time :: 2 seconds Game files",
      "Radius :: 9 meters Game files",
      "Damage :: 20 per tick Total 400-500 Range's training bot",
      "Ticks/Tick rate :: 6.67 per second (1 every 0.15 seconds) Total 20-25 ticks Game files",
      "Duration :: 3 seconds at full size 0.75-second fadeaway time }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Viper",
    "ability": "Snake Bite",
    "page": "Snake_Bite",
    "url": "https://valorant.fandom.com/wiki/Snake_Bite",
    "extractedAt": "2026-05-21T10:35:41.272Z",
    "durationSec": 6.5,
    "radiusM": 4.5,
    "rawMatches": [
      "Equip time :: 0.8 seconds",
      "Unequip time :: 0.7 seconds Game files",
      "Radius :: 4.5 meters",
      "rowspan=3|20px|link= Damage :: 1 per tick Range's training bot",
      "Total 76-79 (152-158 with Vulnerable) :: Range's training bot",
      "rowspan=2|20px|link= Ticks/Tick rate :: 12.5 per second 1 every 0.08 seconds Game files",
      "Total 76-79 ticks :: Range's training bot",
      "Duration :: 6.5 seconds",
      "Vulnerable duration :: 2 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Viper",
    "ability": "Poison Cloud",
    "page": "Poison_Cloud",
    "url": "https://valorant.fandom.com/wiki/Poison_Cloud",
    "extractedAt": "2026-05-21T10:35:41.744Z",
    "radiusM": 4.5,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Pickup distance (Buy phase only) :: 4 meters",
      "Windup time :: Total 1.75 seconds 0.75-second windup (fuel consumed after this point) 1 second for smoke to fully form",
      "Radius :: 4.5 meters",
      "Deactivation time :: 0.8 seconds",
      "Activation cooldowns :: 2 seconds (Deactivation) Game files",
      "5 seconds (Activation) :: }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Viper",
    "ability": "Toxic Screen",
    "page": "Toxic_Screen",
    "url": "https://valorant.fandom.com/wiki/Toxic_Screen",
    "extractedAt": "2026-05-21T10:35:42.214Z",
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Total Emitters at max range :: 30 In-game",
      "Wall Dimensions :: 2 meters between emitters 60 meters at max length 4-meter height",
      "Windup times :: 0.5-second windup (fuel consumed after this point) Game files",
      "Deactivation time :: 0.8 seconds",
      "Activation cooldowns :: 2 seconds (Deactivation) Game files",
      "5 seconds (Activation) :: }"
    ],
    "confidence": "low"
  },
  {
    "agent": "Omen",
    "ability": "Shrouded Step",
    "page": "Shrouded_Step",
    "url": "https://valorant.fandom.com/wiki/Shrouded_Step",
    "extractedAt": "2026-05-21T10:35:42.765Z",
    "durationSec": 1.2,
    "rawMatches": [
      "Equip time :: 0.5 seconds Game files",
      "Max cast distance :: 15 meters Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Teleport duration :: Total duration: 1.2 seconds",
      "Arrival audio cue radius :: 12.5 meters Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Omen",
    "ability": "Paranoia",
    "page": "Paranoia",
    "url": "https://valorant.fandom.com/wiki/Paranoia",
    "extractedAt": "2026-05-21T10:35:43.250Z",
    "durationSec": 2,
    "rawMatches": [
      "Equip time :: 1.1 seconds Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Area size :: 25 meter travel length",
      "4.3 meter radius :: Game files",
      "Orb velocity :: 20 meters per second",
      "Nearsight duration :: 2 seconds Game files",
      "Nearsighted vision radius :: 7.5 meters Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Omen",
    "ability": "Dark Cover",
    "page": "Dark_Cover",
    "url": "https://valorant.fandom.com/wiki/Dark_Cover",
    "extractedAt": "2026-05-21T10:35:43.732Z",
    "durationSec": 15,
    "radiusM": 4.1,
    "rawMatches": [
      "Equip time :: 0.6 seconds",
      "Max deploy distance :: 80 meters Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Orb velocity :: 64 meters per second",
      "Deploy time :: 1 second Game files",
      "Radius :: 4.1 meters Game files",
      "rowspan=2|20px|link= Duration :: 15 seconds",
      "Expiration warning at 13.5 seconds :: }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Omen",
    "ability": "From the Shadows",
    "page": "From_the_Shadows",
    "url": "https://valorant.fandom.com/wiki/From_the_Shadows",
    "extractedAt": "2026-05-21T10:35:44.220Z",
    "durationSec": 4,
    "rawMatches": [
      "Equip time :: 0.5 seconds Game files",
      "Teleport duration :: Total duration: 4 seconds 1.5-second windup 2.5-second arrival at target location Game files",
      "Audio cue radius :: 22.5 meters }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Killjoy",
    "ability": "Alarmbot",
    "page": "Alarmbot",
    "url": "https://valorant.fandom.com/wiki/Alarmbot",
    "extractedAt": "2026-05-21T10:35:44.677Z",
    "durationSec": 4,
    "rawMatches": [
      "Equip time :: 0.85 seconds",
      "Max deploy length :: 10 meters Game files",
      "Unequip time :: 0.75 seconds",
      "Deploy time :: 1.85 seconds",
      "Proximity radius to remain active :: 40 meters",
      "rowspan=\"2\" |20px|link= Detection radii :: Bot detecting enemies: 5.5 meters Game files",
      "Proximity to target needed to explode :: 2 meters Game files",
      "Windup time :: Total minimum: 1 second 0.5-second alert phase 0.5-second windup phase (Duration further increased by travel time) Game files",
      "Vulnerable duration :: 4 seconds",
      "Reactivation time :: 2 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Killjoy",
    "ability": "Nanoswarm",
    "page": "Nanoswarm",
    "url": "https://valorant.fandom.com/wiki/Nanoswarm",
    "extractedAt": "2026-05-21T10:35:45.151Z",
    "durationSec": 4,
    "radiusM": 4.5,
    "rawMatches": [
      "Equip time :: 0.74 seconds Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Buy Phase pickup range :: 4 meters Game files",
      "Detection radius :: 5.25 meters",
      "Activation windup time :: Total 1 second",
      "0.5-second damage delay :: Game files",
      "Radius :: 4.5 meters",
      "Damage :: 1 per tick Total 180 x0.5 multiplier to objects Range's training bot",
      "Ticks/Tick Rate :: 45 per second (1 every 0.022 seconds)",
      "Total 180 ticks :: Range's training bot",
      "Duration :: 4 seconds Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Killjoy",
    "ability": "Turret",
    "page": "Turret",
    "url": "https://valorant.fandom.com/wiki/Turret",
    "extractedAt": "2026-05-21T10:35:45.601Z",
    "rawMatches": [
      "Equip time :: 1.1 seconds Game files",
      "Max deploy length :: 4.5 meters Game files",
      "Unequip time :: 0.7 seconds",
      "Deploy time :: 2.7 seconds Game files",
      "Detection cone angle :: 100°",
      "Proximity radius to remain active :: 40 meters",
      "Windup time :: 0.75 seconds Game files",
      "Damage :: 0–20 meters: 8 per shot, 24 per burst 20–35 meters: 6 per shot, 18 per burst 35+ meters: 4 per shot, 12 per burst Media reveal",
      "Bullet tagging slow :: 50%",
      "Fire rate :: Overall cycle: 1.375 seconds 1 second between bursts 0.125 seconds between shots Game files",
      "Reactivation time :: 2 seconds }"
    ],
    "confidence": "low"
  },
  {
    "agent": "Killjoy",
    "ability": "Lockdown",
    "page": "Lockdown",
    "url": "https://valorant.fandom.com/wiki/Lockdown",
    "extractedAt": "2026-05-21T10:35:46.132Z",
    "durationSec": 8,
    "radiusM": 32.5,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Max deploy length :: 0.5 meters Game files",
      "Deploy time :: 0.52 seconds Game files",
      "Unequip time :: 0.15 seconds Game files",
      "Radius :: 32.5 meters Game files",
      "rowspan=2|20px|link= Windup time :: 13 seconds In-game",
      "Detain duration :: 8 seconds Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Cypher",
    "ability": "Trapwire",
    "page": "Trapwire",
    "url": "https://valorant.fandom.com/wiki/Trapwire",
    "extractedAt": "2026-05-21T10:35:46.582Z",
    "durationSec": 0.5,
    "rangeM": 4,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Max deploy distance :: 20 meters Game files",
      "Max wire length :: 15 meters",
      "Unequip time :: 0.7 seconds Game files",
      "Deploy time :: 1.5 seconds Game files",
      "Detection distance :: 3 meters Game files",
      "Recall duration :: 0.5 seconds Game files",
      "Triggered Slow duration :: 1.25 seconds",
      "Windup time :: 0.9 seconds",
      "Distance required to move away when affected :: 4 meters",
      "Damage :: 5 In-game",
      "Re-arm time :: 2 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Cypher",
    "ability": "Cyber Cage",
    "page": "Cyber_Cage",
    "url": "https://valorant.fandom.com/wiki/Cyber_Cage",
    "extractedAt": "2026-05-21T10:35:47.035Z",
    "durationSec": 7.25,
    "rawMatches": [
      "Unequip time :: 0.7 seconds Game files",
      "Cylinder radius :: 3.72 meters Game files",
      "Duration :: Total duration: 7.25 seconds 0.75-second formation time 6 seconds at full size 0.5-second deactivation time Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Cypher",
    "ability": "Spycam",
    "page": "Spycam",
    "url": "https://valorant.fandom.com/wiki/Spycam",
    "extractedAt": "2026-05-21T10:35:47.472Z",
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Max deploy distance :: 20 meters Game files",
      "5px Max deploy height :: 4.5 meters Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Deploy time :: 1.15 seconds",
      "rowspan=2|20px|link= Detection radii :: Agent detecting cam while inactive: 8 meters",
      "Reveal ticks/tick Rate :: 1 every 2 seconds Continues indefinitely until dart removed Game files",
      "Dart removal channel time :: 1.85 seconds",
      "Dart cooldown :: 6 seconds Game files }"
    ],
    "confidence": "low"
  },
  {
    "agent": "Cypher",
    "ability": "Neural Theft",
    "page": "Neural_Theft",
    "url": "https://valorant.fandom.com/wiki/Neural_Theft",
    "extractedAt": "2026-05-21T10:35:47.936Z",
    "rawMatches": [
      "Max cast distance :: 18 meters",
      "Unequip time :: 1 second Game files",
      "1st reveal windup time :: 2 seconds Game files",
      "2nd reveal windup time :: 4 seconds }"
    ],
    "confidence": "low"
  },
  {
    "agent": "Sova",
    "ability": "Shock Bolt",
    "page": "Shock_Bolt",
    "url": "https://valorant.fandom.com/wiki/Shock_Bolt",
    "extractedAt": "2026-05-21T10:35:48.399Z",
    "radiusM": 4,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Maximum bounces :: 2 In-game",
      "Minimum charge times and projectile strengths :: Immediately cast as a Class 2 Projectile 0.333 seconds/1st bar filled for Class 3 Projectile 0.667 seconds/2nd bar filled for Class 4 Projectile 1.000 second/3rd bar filled for Class 5 Projectile",
      "Unequip time :: 0.7 seconds Game files",
      "Windup time :: 0.4 seconds Game files",
      "Radii :: 1.5 meters (Inner) 4 meters (Outer) Game files",
      "rowspan=2|20px|link= Damage :: Minimum: 1",
      "Maximum: 75 (Minimum Outer radius damage to Inner radius damage) :: }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Sova",
    "ability": "Recon Bolt",
    "page": "Recon_Bolt",
    "url": "https://valorant.fandom.com/wiki/Recon_Bolt",
    "extractedAt": "2026-05-21T10:35:48.897Z",
    "durationSec": 0.75,
    "radiusM": 30,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Maximum bounces :: 2 In-game",
      "Minimum charge times and projectile strengths :: Immediately cast as a Class 2 Projectile 0.333 seconds/1st bar filled for Class 3 Projectile 0.667 seconds/2nd bar filled for Class 4 Projectile 1.000 second/3rd bar filled for Class 5 Projectile",
      "Unequip time :: 0.7 seconds Game files",
      "Windup time :: 0.667 seconds",
      "Radius :: 30 meters Game files",
      "rowspan=2|20px|link= Sonar pulses :: 1 every 1.6 seconds Game files",
      "Reveal duration :: 0.75 seconds Media reveal [https://www.threads.net/@valorant/post/DIjhD4dP5xp @valorant on Threads] }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Sova",
    "ability": "Owl Drone",
    "page": "Owl_Drone",
    "url": "https://valorant.fandom.com/wiki/Owl_Drone",
    "extractedAt": "2026-05-21T10:35:49.418Z",
    "durationSec": 7,
    "rawMatches": [
      "Equip time :: 0.9 seconds Game files",
      "Deploy time :: 0.25 seconds",
      "Duration :: 7 seconds",
      "Reveal stats :: 0.6-second reveal per ping",
      "Dart cooldown :: 5 seconds Game files",
      "Unequip time :: 0.7 seconds Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Sova",
    "ability": "Hunter's Fury",
    "page": "Hunter's_Fury",
    "url": "https://valorant.fandom.com/wiki/Hunter's_Fury",
    "extractedAt": "2026-05-21T10:35:49.883Z",
    "durationSec": 6,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Ammunition :: 3 charges In-game",
      "Max Duration :: 6 seconds (Not including equip time) Game files",
      "Windup time per charge :: 1 second",
      "Fire rate :: 1 every 2.125 seconds (including charge windup time)",
      "Self-knockback distance :: 1.5 meters",
      "Cylinder size :: 66 meter length 1.76 meter radius Game files",
      "Damage :: 80 Range's training bot",
      "Reveal duration :: 1 second",
      "Unequip time :: 1 second Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Sage",
    "ability": "Barrier Orb",
    "page": "Barrier_Orb",
    "url": "https://valorant.fandom.com/wiki/Barrier_Orb",
    "extractedAt": "2026-05-21T10:35:50.344Z",
    "durationSec": 40,
    "rawMatches": [
      "Equip time :: 0.8 seconds",
      "Max cast length :: 15 meters",
      "Unequip time :: 0.7 seconds Game files",
      "Deploy time :: 1.35 seconds",
      "Time taken to fortify :: 2 seconds (Begins upon casting)",
      "Size :: 4 segments 2.6 x 1.5 meters per segment Total 10.4 x 1.5 meters Game files",
      "Duration :: Total 40 seconds (Includes deploy time) Begins to decay after 35 seconds Game files (~ ) }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Sage",
    "ability": "Slow Orb",
    "page": "Slow_Orb",
    "url": "https://valorant.fandom.com/wiki/Slow_Orb",
    "extractedAt": "2026-05-21T10:35:50.935Z",
    "durationSec": 7,
    "rawMatches": [
      "Equip time :: 0.5 seconds Game files",
      "Unequip time :: 0.4 seconds Game files",
      "Windup time :: 0.5 seconds",
      "Slow amount :: 50%",
      "Duration :: 7 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Sage",
    "ability": "Healing Orb",
    "page": "Healing_Orb",
    "url": "https://valorant.fandom.com/wiki/Healing_Orb",
    "extractedAt": "2026-05-21T10:35:51.375Z",
    "durationSec": 5,
    "rawMatches": [
      "Equip time :: 0.5 seconds Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Healing :: 20 HP/sec, total 100 HP (Heal) 10 HP/sec, total 50 HP (Self heal)",
      "Duration :: 5 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Sage",
    "ability": "Resurrection",
    "page": "Resurrection",
    "url": "https://valorant.fandom.com/wiki/Resurrection",
    "extractedAt": "2026-05-21T10:35:51.887Z",
    "durationSec": 1.3,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Max cast distance :: 12 meters",
      "Windup time :: 2 seconds Game files",
      "Unequip time :: 1 second Game files",
      "Revive duration :: 1.3 seconds Game files }",
      "\"Who killed me? They're dead!\" :: }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Phoenix",
    "ability": "Blaze",
    "page": "Blaze",
    "url": "https://valorant.fandom.com/wiki/Blaze",
    "extractedAt": "2026-05-21T10:35:52.373Z",
    "durationSec": 8,
    "rangeM": 21,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Deploy time :: 0.125-0.75 seconds (Depending on distance)",
      "Unequip time :: 0.5 seconds",
      "Length :: 1–21 meters",
      "Damage :: 1 per tick Total 225-240 Range's training bot",
      "x0.5 multiplier to objects :: Game files ( )",
      "Ticks/Tick Rate :: 30 per second (1 every 0.033 seconds) Total 225-240 ticks",
      "Duration :: 8 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Phoenix",
    "ability": "Curveball",
    "page": "Curveball",
    "url": "https://valorant.fandom.com/wiki/Curveball",
    "extractedAt": "2026-05-21T10:35:52.824Z",
    "durationSec": 1.5,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Unequip time :: 0.48 seconds Game files",
      "Windup time :: 0.6 seconds",
      "Max blind duration :: 1.5 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Phoenix",
    "ability": "Hot Hands",
    "page": "Hot_Hands",
    "url": "https://valorant.fandom.com/wiki/Hot_Hands",
    "extractedAt": "2026-05-21T10:35:53.305Z",
    "durationSec": 4,
    "radiusM": 4.5,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Maximum air time :: 1.5 seconds Game files",
      "Radius :: 4.5 meters",
      "Damage :: 1 per tick Total 195-240 x0.5 multiplier to objects Range's training bot",
      "Ticks/Tick Rate :: 60 per second (1 every 0.0167 seconds) Total 195-240 ticks Game files",
      "Duration :: 4 seconds Game files",
      "3.25 seconds at full size :: }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Phoenix",
    "ability": "Run It Back",
    "page": "Run_It_Back",
    "url": "https://valorant.fandom.com/wiki/Run_It_Back",
    "extractedAt": "2026-05-21T10:35:53.770Z",
    "rawMatches": [],
    "confidence": "low"
  },
  {
    "agent": "Raze",
    "ability": "Boom Bot",
    "page": "Boom_Bot",
    "url": "https://valorant.fandom.com/wiki/Boom_Bot",
    "extractedAt": "2026-05-21T10:35:54.223Z",
    "durationSec": 5,
    "radiusM": 6,
    "rangeM": 15,
    "rawMatches": [
      "Equip time :: 1.1 seconds Game files",
      "Deploy time :: 0.7 seconds Game files",
      "Unequip time :: 0 seconds Game files",
      "Duration :: 5 seconds (Includes Deploy time)",
      "Max detection cone distance :: 15 meters Game files",
      "Proximity to target needed to explode :: 2.5 meters Game files",
      "Windup time :: 0.6 seconds Game files",
      "Radii :: 2 meters (Inner) 6 meters (Outer) Game files",
      "Damage :: 30-80 150 in Escalation x2.5 multiplier to objects (Minimum Outer radius damage to Inner radius damage) & }"
    ],
    "confidence": "high"
  },
  {
    "agent": "Raze",
    "ability": "Blast Pack",
    "page": "Blast_Pack",
    "url": "https://valorant.fandom.com/wiki/Blast_Pack",
    "extractedAt": "2026-05-21T10:35:54.691Z",
    "durationSec": 5,
    "radiusM": 5,
    "rawMatches": [
      "Unequip time :: 0.7 seconds Game files",
      "Max duration :: 5 seconds Game files",
      "Radii :: 2 meters (Inner) 5 meters (Outer) Game files",
      "Time needed to arm :: 1.5 seconds",
      "rowspan=3|20px|link= Damage :: No damage before arming",
      "20-50 after arming (Minimum Outer radius damage to Inner radius damage) :: Range's training bot &",
      "x2.25 multiplier to objects :: }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Raze",
    "ability": "Paint Shells",
    "page": "Paint_Shells",
    "url": "https://valorant.fandom.com/wiki/Paint_Shells",
    "extractedAt": "2026-05-21T10:35:55.129Z",
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Windup times :: 2.25 seconds (Initial grenade) 0.667 seconds (Sub-munitions)",
      "rowspan=2|20px|link= Radii :: 2.5 meters (Inner) Game files",
      "Damage :: 1-55 (Minimum Outer radius damage to Inner radius damage) & Range's training bot }"
    ],
    "confidence": "low"
  },
  {
    "agent": "Raze",
    "ability": "Showstopper",
    "page": "Showstopper",
    "url": "https://valorant.fandom.com/wiki/Showstopper",
    "extractedAt": "2026-05-21T10:35:55.592Z",
    "durationSec": 10,
    "radiusM": 7,
    "rawMatches": [
      "Equip time :: 1.4 seconds <!--",
      "Reequip time :: 0.7 seconds -->",
      "Max duration :: 10 seconds (including Equip time) Game files",
      "Radii :: 4 meters (Inner) 7 meters (Outer) Game files",
      "Damage :: 30-150 (Minimum Outer radius damage to Inner radius damage) x10 multiplier to objects Game files",
      "Unequip time :: 0.4 seconds Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Jett",
    "ability": "Cloudburst",
    "page": "Cloudburst",
    "url": "https://valorant.fandom.com/wiki/Cloudburst",
    "extractedAt": "2026-05-21T10:35:56.066Z",
    "durationSec": 2.5,
    "radiusM": 3.35,
    "rawMatches": [
      "Unequip time :: 0.25 seconds Game files",
      "Maximum travel time in air :: 2 seconds Game files",
      "Radius :: 3.35 meters Game files",
      "Duration :: 2.5 seconds (includes 0.6-second deployment time) }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Jett",
    "ability": "Updraft",
    "page": "Updraft",
    "url": "https://valorant.fandom.com/wiki/Updraft",
    "extractedAt": "2026-05-21T10:35:56.528Z",
    "durationSec": 0.6,
    "rawMatches": [
      "Duration :: 0.6 seconds Game files",
      "Dash distance :: 5 meters }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Jett",
    "ability": "Tailwind",
    "page": "Tailwind",
    "url": "https://valorant.fandom.com/wiki/Tailwind",
    "extractedAt": "2026-05-21T10:35:57.011Z",
    "durationSec": 7.5,
    "rawMatches": [
      "Windup :: 1 second",
      "Empowered Duration :: 7.5 seconds",
      "Dash Duration :: 0.45 seconds Game files",
      "Base dash distance :: 11 meters",
      "Unequip time :: 0.2 seconds Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Jett",
    "ability": "Blade Storm",
    "page": "Blade_Storm",
    "url": "https://valorant.fandom.com/wiki/Blade_Storm",
    "extractedAt": "2026-05-21T10:35:57.512Z",
    "rawMatches": [
      "Initial windup time :: 1.02 seconds Game files",
      "Ammunition :: 5 blades In-game",
      "Reequip time :: 0.5 seconds Game files",
      "Quick equip time :: 0.15 seconds Game files",
      "Damage :: 50 Range's training bot",
      "Damage multipliers :: Headshot: x3 Leg shot: x0.85 &",
      "'Single Fire' fire rate :: 6 per second 1 every 0.167 seconds",
      "Unequip times (out of ammo) :: 0.167 seconds (Single fire) 0.45 seconds (Burst fire) Game files }",
      "rowspan=\"3\" |0–50 m :: Head 1 0.000 1 0.000 1 0.000",
      "Body :: 2 0.167 3 0.333 3 0.333",
      "Legs :: 3 0.333 3 0.333 4 0.5 }"
    ],
    "confidence": "low"
  },
  {
    "agent": "Reyna",
    "ability": "Leer",
    "page": "Leer",
    "url": "https://valorant.fandom.com/wiki/Leer",
    "extractedAt": "2026-05-21T10:35:57.977Z",
    "durationSec": 1.6,
    "rawMatches": [
      "Equip time :: 0.77 seconds Game files",
      "Deployment distance :: 10 meters (Can be reduced if pushed back by terrain) Game files",
      "Unequip time :: 0.5 seconds",
      "Windup time :: 0.55 seconds to travel to target location at max deployment distance",
      "Duration while applying nearsight :: 1.6 seconds",
      "Max vision radius while nearsighted :: 6 meters Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Reyna",
    "ability": "Devour",
    "page": "Devour",
    "url": "https://valorant.fandom.com/wiki/Devour",
    "extractedAt": "2026-05-21T10:35:58.452Z",
    "durationSec": 3,
    "rawMatches": [
      "Activation delay (without Empress) :: 0.1 seconds",
      "Unequip time :: 0.5 seconds Game files",
      "Healing :: 1 per tick Total 50 In-game",
      "rowspan=2|20px|link= Ticks/Tick rate :: Standard 16.7 per second (1 every 0.06 seconds) Total 50 ticks rowspan=2|",
      "Healing duration :: 3 seconds 2.5 seconds (Empress) Game files",
      "20px Overheal duration (without Empress) :: 10 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Reyna",
    "ability": "Dismiss",
    "page": "Dismiss",
    "url": "https://valorant.fandom.com/wiki/Dismiss",
    "extractedAt": "2026-05-21T10:35:58.958Z",
    "durationSec": 1.5,
    "rawMatches": [
      "Duration :: 1.5 seconds",
      "Unequip time :: 0.6 seconds Game files",
      "Movement speed increase :: 12 m/s }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Reyna",
    "ability": "Empress",
    "page": "Empress",
    "url": "https://valorant.fandom.com/wiki/Empress",
    "extractedAt": "2026-05-21T10:35:59.445Z",
    "rawMatches": [
      "Windup time :: 1 second Game files",
      "Buffs :: + 10% Equip speed + 10% Fire rate + 10% Reload speed + 10% Recovery speed }"
    ],
    "confidence": "low"
  },
  {
    "agent": "Breach",
    "ability": "Aftershock",
    "page": "Aftershock",
    "url": "https://valorant.fandom.com/wiki/Aftershock",
    "extractedAt": "2026-05-21T10:35:59.940Z",
    "rawMatches": [
      "Equip time :: 0.9 seconds Game files",
      "Max deploy distance :: 35 meters Game files",
      "Unequip time :: 0.7 seconds Game files ( )",
      "Cylinder size :: 10 meter length Game files",
      "Windup time :: 2.2 seconds Game files",
      "Damage :: 80 per tick Total 160",
      "Ticks/Tick Rate :: 1 every 0.6 seconds Total 2 ticks & }"
    ],
    "confidence": "low"
  },
  {
    "agent": "Breach",
    "ability": "Flashpoint",
    "page": "Flashpoint",
    "url": "https://valorant.fandom.com/wiki/Flashpoint",
    "extractedAt": "2026-05-21T10:36:00.393Z",
    "durationSec": 2.25,
    "rawMatches": [
      "Equip time :: 1.1 seconds Game files",
      "Max deploy distance :: 35 meters Game files",
      "Max wall penetration depth :: 10 meters Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Windup time :: 0.5 seconds",
      "Max blind duration :: 2.25 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Breach",
    "ability": "Fault Line",
    "page": "Fault_Line",
    "url": "https://valorant.fandom.com/wiki/Fault_Line",
    "extractedAt": "2026-05-21T10:36:00.851Z",
    "durationSec": 2.5,
    "rangeM": 8,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Area size :: 8 to 56-meter length, depending on charge time",
      "Distance between Breach and AoE :: 8 meters",
      "Time required to fully charge :: 1 second",
      "Unequip time :: 0.7 seconds Game files",
      "Windup time :: 1.1 seconds",
      "Concuss duration :: 2.5 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Breach",
    "ability": "Rolling Thunder",
    "page": "Rolling_Thunder",
    "url": "https://valorant.fandom.com/wiki/Rolling_Thunder",
    "extractedAt": "2026-05-21T10:36:01.319Z",
    "durationSec": 4,
    "rangeM": 8,
    "rawMatches": [
      "Equip time :: 1.1 seconds Game files",
      "Channel time :: 0.6 seconds Game files",
      "Unequip time :: 0.4 seconds Game files",
      "Area size :: 32-meter length",
      "Distance between Breach and AoE :: 8 meters",
      "Blast delay :: 0.6 seconds",
      "Ticks/Tick Rate :: 1 every 0.255 seconds Total 8 ticks",
      "Displacement Distance :: 7 meters",
      "Concuss duration :: 4 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Skye",
    "ability": "Regrowth",
    "page": "Regrowth",
    "url": "https://valorant.fandom.com/wiki/Regrowth",
    "extractedAt": "2026-05-21T10:36:01.854Z",
    "radiusM": 18,
    "rawMatches": [
      "Equip time :: 0.5 seconds Game files",
      "Radius :: 18 meters Game files",
      "Healing :: 1 per tick Total 100 In-game",
      "Tick/Tick rate :: 20 per second 1 every 0.05 seconds Total 100 ticks Game files",
      "Healing pool :: 100 HP In-game",
      "Unequip time :: 0.7 seconds Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Skye",
    "ability": "Trailblazer",
    "page": "Trailblazer",
    "url": "https://valorant.fandom.com/wiki/Trailblazer",
    "extractedAt": "2026-05-21T10:36:02.354Z",
    "durationSec": 6,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Deploy time :: 0.18 seconds Game files",
      "Vision radius :: 22.5 meters",
      "Duration :: 6 seconds Game files",
      "Jump distance :: 12 meters",
      "Explosion radius :: 3.5 meters Game files",
      "Damage :: 30 Game files",
      "Concuss duration :: Minimum: 2.5 seconds",
      "Unequip time :: 0.7 seconds Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Skye",
    "ability": "Guiding Light",
    "page": "Guiding_Light",
    "url": "https://valorant.fandom.com/wiki/Guiding_Light",
    "extractedAt": "2026-05-21T10:36:02.819Z",
    "durationSec": 2,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Unequip time :: 0.85 seconds",
      "Velocity :: 18 meters per second Game files",
      "Duration :: 2 seconds",
      "Flash max duration windup time :: 0.75 seconds",
      "Flash activation windup time :: 0.3 seconds",
      "Max flash duration :: 1-2.25 seconds (based on duration windup) ( ) }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Skye",
    "ability": "Seekers",
    "page": "Seekers",
    "url": "https://valorant.fandom.com/wiki/Seekers",
    "extractedAt": "2026-05-21T10:36:03.286Z",
    "durationSec": 3,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Unequip time :: 0.55 seconds Game files",
      "Number of Seekers deployed :: 3 In-game",
      "Max lifespan :: 15 seconds Game files",
      "Nearsight duration :: 3 seconds Game files",
      "Nearsight vision radius :: 7.5 meters Game files",
      "Slow duration :: 5 seconds Game files",
      "Slow potency :: 60% Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Yoru",
    "ability": "Fakeout",
    "page": "Fakeout",
    "url": "https://valorant.fandom.com/wiki/Fakeout",
    "extractedAt": "2026-05-21T10:36:03.730Z",
    "durationSec": 10,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Maximum image duration :: 10 seconds Game files<!--",
      "Flash angle :: 30° (either side of the direction the image is looking in) Game files-->",
      "Flash windup time :: 0.6 seconds Game files",
      "Max flash duration :: 2 seconds }",
      "Detection radius :: 30 meters",
      "Maximum duration :: 10 seconds Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Yoru",
    "ability": "Blindside",
    "page": "Blindside",
    "url": "https://valorant.fandom.com/wiki/Blindside",
    "extractedAt": "2026-05-21T10:36:04.186Z",
    "durationSec": 1.5,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Unequip time :: 0.5 seconds",
      "Max travel time in air :: 2 seconds",
      "Windup time :: 0.6 seconds",
      "Max flash duration :: 1.5 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Yoru",
    "ability": "Gatecrash",
    "page": "Gatecrash",
    "url": "https://valorant.fandom.com/wiki/Gatecrash",
    "extractedAt": "2026-05-21T10:36:04.732Z",
    "durationSec": 15,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Max deploy length :: 3 meters Game files",
      "Unequip time :: 0.5 seconds Game files",
      "Tether Duration :: 15 seconds",
      "Detection radius :: 4 meters",
      "Tether audio cue radius :: 12.5 meters",
      "Teleport duration :: Total 1.2 seconds 0.5-second windup 0.7-second arrival at tether location Game files",
      "Teleport audio cue radius :: 42.5 meters Game files",
      "Fake decal duration :: 30 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Yoru",
    "ability": "Dimensional Drift",
    "page": "Dimensional_Drift",
    "url": "https://valorant.fandom.com/wiki/Dimensional_Drift",
    "extractedAt": "2026-05-21T10:36:05.186Z",
    "durationSec": 10,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Cast delay :: 0.4 seconds Game files",
      "Duration :: 10 seconds",
      "Detection radius :: 15 meters (footstep audio only)",
      "Unequip/Return time :: 0.8 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Astra",
    "ability": "Gravity Well",
    "page": "Gravity_Well",
    "url": "https://valorant.fandom.com/wiki/Gravity_Well",
    "extractedAt": "2026-05-21T10:36:05.674Z",
    "durationSec": 2,
    "radiusM": 4.75,
    "rawMatches": [
      "Windup time :: 1.25 seconds",
      "Radius :: 4.75 meters",
      "Pull duration :: 2 seconds",
      "Vulnerable duration :: 2.5 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Astra",
    "ability": "Nova Pulse",
    "page": "Nova_Pulse",
    "url": "https://valorant.fandom.com/wiki/Nova_Pulse",
    "extractedAt": "2026-05-21T10:36:06.124Z",
    "durationSec": 2.5,
    "radiusM": 4.75,
    "rawMatches": [
      "Radius :: 4.75 meters |group=\"s\"}}",
      "Windup time :: 1 second",
      "Concuss duration :: 2.5 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Astra",
    "ability": "Nebula",
    "page": "Nebula_/_Dissipate",
    "url": "https://valorant.fandom.com/wiki/Nebula_/_Dissipate",
    "extractedAt": "2026-05-21T10:36:06.592Z",
    "durationSec": 14.25,
    "radiusM": 4.75,
    "rawMatches": [
      "Windup time :: 0.75 seconds Game files",
      "Radius :: 4.75 meters",
      "Duration :: Nebula: 14.25 seconds Expiration warning at 12.75 seconds",
      "Dissipate: 1 second :: Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Astra",
    "ability": "Cosmic Divide",
    "page": "Cosmic_Divide",
    "url": "https://valorant.fandom.com/wiki/Cosmic_Divide",
    "extractedAt": "2026-05-21T10:36:07.047Z",
    "rawMatches": [
      "Unequip time :: 0.4 seconds Game files",
      "Windup time :: 2.667 seconds",
      "Duration :: 21-second total effective duration 2.5-second deformation time }"
    ],
    "confidence": "low"
  },
  {
    "agent": "KAY/O",
    "ability": "FRAG/ment",
    "page": "FRAG-ment",
    "url": "https://valorant.fandom.com/wiki/FRAG-ment",
    "extractedAt": "2026-05-21T10:36:07.559Z",
    "durationSec": 4,
    "radiusM": 1,
    "rawMatches": [
      "Equip time :: 0.7 seconds Game files",
      "Unequip time :: 0.6 seconds",
      "Windup :: 0.5 seconds Game files",
      "Radii :: 1 meter (Inner) Game files",
      "Damage :: 25-60 per tick Total 100-240 (Minimum Outer radius damage to Inner radius damage) Range's training bot",
      "Ticks/Tick Rate :: 1 every 1 second Game files",
      "Total 4 ticks :: Range's training bot",
      "Duration :: 4 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "KAY/O",
    "ability": "FLASH/drive",
    "page": "FLASH-drive",
    "url": "https://valorant.fandom.com/wiki/FLASH-drive",
    "extractedAt": "2026-05-21T10:36:08.032Z",
    "durationSec": 2.25,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Unequip time :: 0.6 seconds",
      "Windup time on bounce :: 0.8 seconds (Primary fire) (max windup time not affected)",
      "Max windup time :: 1.6 seconds (Primary fire) 1 second (Alt fire) Media reveal [https://www.polygon.com/22538352/valorant-new-agent-kay-o-abilities-kit-ultimate-suppression-robot-episode-3 KAY/O media reveal]",
      "Telegraph windup time :: 0.3 seconds",
      "Max blind duration :: 2.25 seconds & <!--",
      "1.5 seconds (Alt fire) :: --> }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "KAY/O",
    "ability": "ZERO/point",
    "page": "ZERO-point",
    "url": "https://valorant.fandom.com/wiki/ZERO-point",
    "extractedAt": "2026-05-21T10:36:08.558Z",
    "durationSec": 8,
    "radiusM": 15,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Unequip time :: 0.5 seconds",
      "Radius :: 15 meters Game files",
      "Windup :: 1 second Game files",
      "Suppression duration :: 8 seconds In-game }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "KAY/O",
    "ability": "NULL/cmd",
    "page": "NULL-cmd",
    "url": "https://valorant.fandom.com/wiki/NULL-cmd",
    "extractedAt": "2026-05-21T10:36:09.157Z",
    "durationSec": 4,
    "radiusM": 42.5,
    "rawMatches": [
      "Windup time :: 1 second Game files",
      "Radius :: 42.5 meters Game files",
      "Buffs :: + 10% Fire rate + 10% Reload speed + 10% Recovery speed +10% Equip speed Game files &",
      "Suppression duration :: 4 seconds In-game",
      "rowspan=\"2\" |20px|link= Ticks/Tick Rate :: 1 every 3 seconds",
      "5 ticks :: In-game",
      "Overloaded Duration :: 12 seconds Game files",
      "Downed Health :: 850 HP In-game",
      "Downed Duration :: 15 seconds In-game",
      "Stabilization duration :: 1.5 seconds",
      "Revive duration :: 1.55 seconds Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Chamber",
    "ability": "Trademark",
    "page": "Trademark",
    "url": "https://valorant.fandom.com/wiki/Trademark",
    "extractedAt": "2026-05-21T10:36:09.613Z",
    "durationSec": 0.75,
    "rawMatches": [
      "Equip time :: 1 second Game files",
      "Max cast radius :: 12 meters Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Deploy time :: 2 seconds <!--",
      "Proximity radius to remain active :: 50 meters -->",
      "Search radius :: 10 meters Game files",
      "Recall duration :: 0.75 seconds Game files",
      "Windup time :: 0.9 seconds Game files",
      "Slow radius :: 6 meters Game files",
      "Slow duration :: 4 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Chamber",
    "ability": "Headhunter",
    "page": "Headhunter",
    "url": "https://valorant.fandom.com/wiki/Headhunter",
    "extractedAt": "2026-05-21T10:36:10.093Z",
    "rawMatches": [
      "Equip time :: 0.3 seconds Game files",
      "Ammunition :: 8 rounds max. (4 rounds max. in Spike Rush) No reserve In-game &",
      "Damage :: 159 Head 55 Body 46 Legs Game files",
      "Damage multipliers :: Headshot: x2.9 Leg shot: x0.85 Game files",
      "Fire mode :: Semi In-game",
      "Fire rate :: 4 per second 1 every 0.25 seconds Game files",
      "Wall penetration :: High",
      "ADS Zoom :: x1.5 Game files",
      "Unequip time (out of ammo) :: 0.5 seconds }",
      "rowspan=\"3\" |0–50 m :: Head 1 0.000 1 0.000 1 0.000",
      "Body :: 2 0.250 3 0.500 3 0.500",
      "Legs :: 3 0.500 3 0.500 4 0.750 }",
      "{| class=\"wikitable\" style=\"text-align: center;\" :: + ! rowspan=\"2\" |Firing Mode ! colspan=\"2\" |1st Shot Spread (°) ! colspan=\"2\" |Max Spread (°) ! colspan=\"4\" |Movement penalties (+°)",
      "Primary Fire :: 0.25 0.19 3 2.25 rowspan=\"2\" |0.1 rowspan=\"2\" |1.2 rowspan=\"2\" |3 rowspan=\"2\" |7",
      "Alternate Fire :: colspan=\"2\"|0 2.75 2.06 }"
    ],
    "confidence": "low"
  },
  {
    "agent": "Chamber",
    "ability": "Rendezvous",
    "page": "Rendezvous",
    "url": "https://valorant.fandom.com/wiki/Rendezvous",
    "extractedAt": "2026-05-21T10:36:10.548Z",
    "durationSec": 1.3,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Max cast distance :: 8.5 meters Game files",
      "Unequip time :: 0.6 seconds Game files",
      "Anchor radius :: 18 meters",
      "Teleport duration :: Total duration: 1.3 seconds 0.1-second windup 1.2-second arrival at anchor Game files",
      "Audio cue radius :: 42.5 meters Game files",
      "Recall time :: 0.7 seconds Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Chamber",
    "ability": "Tour de Force",
    "page": "Tour_de_Force",
    "url": "https://valorant.fandom.com/wiki/Tour_de_Force",
    "extractedAt": "2026-05-21T10:36:11.001Z",
    "rawMatches": [],
    "confidence": "low"
  },
  {
    "agent": "Neon",
    "ability": "Relay Bolt",
    "page": "Relay_Bolt",
    "url": "https://valorant.fandom.com/wiki/Relay_Bolt",
    "extractedAt": "2026-05-21T10:36:11.546Z",
    "durationSec": 5,
    "radiusM": 5,
    "rawMatches": [
      "Unequip time :: 0.7 seconds Game files",
      "Max projectile duration :: 5 seconds Game files",
      "Radius :: 5 meters Game files",
      "Explosion windup time :: 1 second",
      "Concuss duration :: 2.5 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Neon",
    "ability": "High Gear",
    "page": "High_Gear",
    "url": "https://valorant.fandom.com/wiki/High_Gear",
    "extractedAt": "2026-05-21T10:36:12.040Z",
    "durationSec": 0.7,
    "rawMatches": [
      "Activation animation duration :: 0.7 seconds Game files",
      "Movement speed increase :: +35% (9.11 m/s) Game files,",
      "Slide duration :: 0.6 seconds Game files",
      "Slide distance :: 7 meters }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Neon",
    "ability": "Fast Lane",
    "page": "Fast_Lane",
    "url": "https://valorant.fandom.com/wiki/Fast_Lane",
    "extractedAt": "2026-05-21T10:36:12.596Z",
    "durationSec": 4,
    "rangeM": 46.5,
    "rawMatches": [
      "Unequip time :: 1 second Game files",
      "Deploy time :: 0.4 seconds Game files",
      "Length :: 46.5 m total 45 meters in front of Neon 1.5 m behind Neon Game files",
      "Distance between walls :: 3.5 meters Game files",
      "Duration :: 4 seconds",
      "rowspan=2|20px|link= Wall Dissolve Duration :: 2 seconds",
      "(Includes 1-second telegraph time during walls' active duration) :: Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Neon",
    "ability": "Overdrive",
    "page": "Overdrive",
    "url": "https://valorant.fandom.com/wiki/Overdrive",
    "extractedAt": "2026-05-21T10:36:13.115Z",
    "rawMatches": [
      "Initial windup time :: 1 second Game files",
      "Ammunition :: 40 per \"magazine\" Minimum 10 ammo required to fire beam Infinite reserve In-game",
      "Reequip time :: 0.333 seconds",
      "Damage :: 0-20 meters: 18 20-42 meters: 18-10 43+ meters: 10",
      "Damage multipliers :: Headshot: x3 Leg shot: x0.85",
      "Fire rate :: 20 per second 1 every 0.05 seconds Game files",
      "Movement penalties :: Airborne: +7° spread Game files",
      "Reload time :: 0.5 second delay then 1 ammo every 0.05 seconds Game files }",
      "rowspan=\"3\" |Min (18 dmg) :: Head 2 0.05 3 0.1 3 0.1",
      "Body :: 6 0.25 7 0.3 9 0.4",
      "Legs :: 7 0.3 9 0.4 10 0.45",
      "rowspan=\"3\" |Max (10 dmg) :: Head 4 0.15 5 0.2 5 0.2",
      "Body :: 10 0.45 13 0.6 15 0.7",
      "Legs :: 13 0.6 16 0.75 19 0.9 }"
    ],
    "confidence": "low"
  },
  {
    "agent": "Fade",
    "ability": "Prowler",
    "page": "Prowler",
    "url": "https://valorant.fandom.com/wiki/Prowler",
    "extractedAt": "2026-05-21T10:36:13.596Z",
    "durationSec": 2.5,
    "rawMatches": [
      "Equip time :: 1.1 seconds Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Search duration :: 2.5 seconds",
      "Detection distance :: 15 meters (Agent) 10 meters (Terror Trail) Game files",
      "Travel speeds :: 10 meters/second (Initial) 12 meters/second (Agent detected) 15 meters/second (Terror Trail detected) Game files",
      "Proximity needed to target to nearsight :: 2.5 meters Game files",
      "Windup time :: 0.6 seconds",
      "Nearsight duration :: 2.75 seconds",
      "Nearsight vision radius :: 7 meters }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Fade",
    "ability": "Seize",
    "page": "Seize",
    "url": "https://valorant.fandom.com/wiki/Seize",
    "extractedAt": "2026-05-21T10:36:14.055Z",
    "durationSec": 4.5,
    "rawMatches": [
      "Equip time :: 0.8 seconds",
      "Unequip time :: 0.7 seconds",
      "Maximum air time :: 1.5 seconds Game files",
      "Windup :: 0.7 seconds Game files",
      "Decay stats :: 75 HP Health restored over 5 seconds In-game",
      "Zone radius :: 6.58 meters Game files",
      "Zone Duration :: 4.5 seconds Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Fade",
    "ability": "Haunt",
    "page": "Haunt",
    "url": "https://valorant.fandom.com/wiki/Haunt",
    "extractedAt": "2026-05-21T10:36:14.509Z",
    "durationSec": 1.5,
    "radiusM": 30,
    "rawMatches": [
      "Equip time :: 0.85 seconds",
      "Unequip time :: 0.7 seconds",
      "Maximum air time :: 1.5 seconds Game files",
      "Windup :: 0.825 seconds Game files",
      "Radius :: 30 meters Game files",
      "Eye duration :: 1.5 seconds",
      "Trail duration :: 12 seconds Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Fade",
    "ability": "Nightfall",
    "page": "Nightfall",
    "url": "https://valorant.fandom.com/wiki/Nightfall",
    "extractedAt": "2026-05-21T10:36:14.978Z",
    "durationSec": 8,
    "rawMatches": [
      "Equip time :: 0.7 seconds Game files",
      "Area size :: 40-meter length 20-meter width Game files &",
      "Windup :: 0.6 seconds",
      "Unequip time :: 1 second Game files",
      "Ticks/Tick Rate :: 1 every 0.355 seconds Total 10 ticks Game files",
      "Debuff duration :: 8 seconds",
      "Decay Stats :: 80 HP }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Harbor",
    "ability": "Cascade",
    "page": "Cascade",
    "url": "https://valorant.fandom.com/wiki/Cascade",
    "extractedAt": "2026-05-21T10:36:15.460Z",
    "durationSec": 7,
    "rangeM": 9.75,
    "rawMatches": [
      "Equip time :: 1 second Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Windup :: 0.7 seconds Game files",
      "Chunks :: 5 Game files",
      "Length :: 1.95 meters per chunk 9.75 meters total (width) Game files",
      "5px|link= Height :: 6 meters Game files",
      "Velocity :: 6.5 meters/second Game files",
      "Maximum rise :: 1.1 meters Game files",
      "Maximum drop :: 8 meters Game files",
      "Travel distance :: 5-35 meters Game files",
      "Stationary Duration :: 7 seconds",
      "Debuff :: 30% Slow Game files",
      "Slow Duration :: 0.6 seconds Game files",
      "Deactivation time :: 0.5 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Harbor",
    "ability": "Cove",
    "page": "Cove",
    "url": "https://valorant.fandom.com/wiki/Cove",
    "extractedAt": "2026-05-21T10:36:15.914Z",
    "durationSec": 19.25,
    "radiusM": 4.6,
    "rawMatches": [
      "Equip time :: 0.6 seconds",
      "Max deploy distance :: 80 meters Game files",
      "Smoke unequip time :: 0.7 seconds",
      "Orb velocity :: 64 meters per second Game files",
      "Deploy time :: 1 second Game files",
      "Radius :: 4.6 meters Game files",
      "Duration :: 19.25 seconds",
      "Shield windup :: 0.8 seconds Game files",
      "Shield unequip time :: 0.5 seconds Game files",
      "Shield deactivation time :: 1 second",
      "Smoke deactivation time :: 1 second }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Harbor",
    "ability": "High Tide",
    "page": "High_Tide",
    "url": "https://valorant.fandom.com/wiki/High_Tide",
    "extractedAt": "2026-05-21T10:36:16.378Z",
    "durationSec": 15,
    "rawMatches": [
      "Equip time :: 0.6 seconds Game files",
      "Unequip time :: 0.6 seconds Game files",
      "Sphere Velocity :: 25 meters/second Game files",
      "Maximum bend :: 180 degrees/second Game files",
      "Travel distance :: 60 meters",
      "5px|link= Wall Height :: 8 meters",
      "Duration :: 15 seconds",
      "Debuff :: 30% Slow Game files",
      "Slow Duration :: 0.6 seconds Game files",
      "Deactivation time :: 1.5 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Harbor",
    "ability": "Reckoning",
    "page": "Reckoning",
    "url": "https://valorant.fandom.com/wiki/Reckoning",
    "extractedAt": "2026-05-21T10:36:16.815Z",
    "durationSec": 7,
    "rawMatches": [
      "20px Equip time :: 0.8 seconds Game files",
      "20px Cast time :: 0.7 seconds Game files",
      "20px Unequip time :: 0.9 seconds Game files",
      "Chunks :: 5 Observed",
      "rowspan=2|20px|link= Length :: 5.6 meters per chunk (Including overlap) Game files",
      "Effective distance between Harbor and wave :: 8 meters",
      "Velocity :: 8 meters/second Game files",
      "Maximum rise :: 1.1 meters Game files",
      "Maximum drop :: 8 meters Game files",
      "Travel distance :: 34 meters",
      "Duration (if stopped) :: 7 seconds",
      "20px Nearsight duration :: 3 seconds Game files",
      "20px Slow duration :: 2 seconds }",
      "Equip time :: 0.8 seconds Game files",
      "Cast location :: 24 meters Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Cast time :: 0.2 seconds Game files",
      "Pool Radius :: 21.25 meters Game files",
      "Base pool travel speed :: 0.875 meters/second Game files",
      "Pool duration :: 9 seconds Game files"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Gekko",
    "ability": "Wingman",
    "page": "Wingman",
    "url": "https://valorant.fandom.com/wiki/Wingman",
    "extractedAt": "2026-05-21T10:36:17.332Z",
    "durationSec": 5,
    "rangeM": 15,
    "rawMatches": [
      "Equip time :: 0.9 seconds Game files",
      "Unequip time :: 0.4 seconds Game files",
      "Run speed :: 6.3 meters/second Game files",
      "Search duration :: 5 seconds Game files",
      "Max detection cone distance :: 15 meters Game files<!--",
      "Detection cone angle :: 90° (either side of the direction Wingman is looking in) -->",
      "Proximity to target needed to activate blast :: 6 meters Game files",
      "Blast windup :: 0.6 seconds Game files",
      "Concuss duration :: 2.5 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Gekko",
    "ability": "Dizzy",
    "page": "Dizzy",
    "url": "https://valorant.fandom.com/wiki/Dizzy",
    "extractedAt": "2026-05-21T10:36:17.777Z",
    "durationSec": 1,
    "rawMatches": [
      "Equip time :: 0.9 seconds Game files",
      "Unequip time :: 0.85 seconds Game files",
      "Activation windup :: 0.65 seconds",
      "Blind windup on target acquisition :: 0.35 seconds",
      "Effective active duration :: 1 second",
      "Max detection distance :: 45 meters Game files",
      "Plasma explosion radius on target :: 2.5 meters Game files",
      "Plasma blind duration :: Total 2 seconds 1 second at max potency 1 second to fade away Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Gekko",
    "ability": "Mosh Pit",
    "page": "Mosh_Pit",
    "url": "https://valorant.fandom.com/wiki/Mosh_Pit",
    "extractedAt": "2026-05-21T10:36:18.312Z",
    "radiusM": 6.2,
    "rawMatches": [
      "Equip time :: 0.9 seconds Game files",
      "Unequip time :: 0.85 seconds Game files",
      "Radii :: Inner: 5.5 meters Outer: 6.2 meters Game files",
      "Windup :: 3 seconds Game files",
      "rowspan=2|20px|link= Damage :: DoT 1 per tick Total 30 damage Range's training bot",
      "Explosion Inner radius: 50 per tick Outer radius: 25 per tick Total 150/75 damage :: Game files",
      "rowspan=2|20px|link= Ticks/Tick rate :: DoT 1 every 0.1 seconds Total 30 ticks",
      "Explosion 1 every 0.1 seconds Total 3 ticks :: Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Gekko",
    "ability": "Thrash",
    "page": "Thrash",
    "url": "https://valorant.fandom.com/wiki/Thrash",
    "extractedAt": "2026-05-21T10:36:18.760Z",
    "durationSec": 0.6,
    "rawMatches": [
      "Equip time :: 0.9 seconds Game files",
      "Deployment duration :: 0.6 seconds Game files",
      "Max vision radius :: 20 meters",
      "Speed :: 11.22 meters/second Game files",
      "Search duration :: 6 seconds Game files",
      "Lunge distance :: 13 meters",
      "Lunge duration :: 0.8 seconds",
      "Lunge radius :: 5 meters Game files",
      "Detain duration :: 6 seconds Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Vision restoration duration :: 1.5 seconds Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Deadlock",
    "ability": "GravNet",
    "page": "GravNet",
    "url": "https://valorant.fandom.com/wiki/GravNet",
    "extractedAt": "2026-05-21T10:36:19.213Z",
    "radiusM": 6.5,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Windup :: 0.4 seconds Game files",
      "Radius :: 6.5 meters",
      "Slow amount :: 70% Game files",
      "Net removal channel time :: 1.5 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Deadlock",
    "ability": "Sonic Sensor",
    "page": "Sonic_Sensor",
    "url": "https://valorant.fandom.com/wiki/Sonic_Sensor",
    "extractedAt": "2026-05-21T10:36:19.680Z",
    "durationSec": 2.5,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Max deploy distance :: 14 meters Game files",
      "5px|link= Max deploy height :: 4.5 meters Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Deploy time :: 1.75 seconds Game files",
      "Area :: 9-meter length 8-meter width 2-meter depth Game files",
      "Windup :: 0.5 seconds",
      "Concuss duration :: 2.5 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Deadlock",
    "ability": "Barrier Mesh",
    "page": "Barrier_Mesh",
    "url": "https://valorant.fandom.com/wiki/Barrier_Mesh",
    "extractedAt": "2026-05-21T10:36:20.147Z",
    "durationSec": 30,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Deploy time :: 1 second Game files",
      "Time taken to fortify :: 3 seconds (Begins on impact with ground) Game files",
      "Barrier lengths :: 10 meters",
      "Duration :: Total 30 seconds (Includes deploy time) Begins to decay after 25 seconds Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Deadlock",
    "ability": "Annihilation",
    "page": "Annihilation",
    "url": "https://valorant.fandom.com/wiki/Annihilation",
    "extractedAt": "2026-05-21T10:36:20.623Z",
    "durationSec": 10,
    "rawMatches": [
      "Equip time :: 1.1 seconds Game files",
      "Reequip time :: 0.7 seconds Game files",
      "Max duration :: 10 seconds (including Equip time) Game files",
      "Pulse radius :: 3 meters",
      "Pulse speed :: 82.5 meters/second Game files",
      "Maximum pulse travel distance :: 40 meters Game files",
      "Pulse radius at path end :: 6.5 meters Game files",
      "Windup time :: 0.5 seconds Game files",
      "Self-knockback distance :: 1.5 meters",
      "Unequip time :: 0.25 seconds Game files",
      "Cocoon duration :: 7 seconds Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Iso",
    "ability": "Double Tap",
    "page": "Double_Tap",
    "url": "https://valorant.fandom.com/wiki/Double_Tap",
    "extractedAt": "2026-05-21T10:36:21.080Z",
    "durationSec": 12,
    "rawMatches": [
      "Windup :: 1 seconds",
      "Reload speed increase :: +25% Game files",
      "Flow state duration :: 12 seconds",
      "Energy orb duration :: 3 seconds",
      "Shield width :: 1 meter }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Iso",
    "ability": "Undercut",
    "page": "Undercut",
    "url": "https://valorant.fandom.com/wiki/Undercut",
    "extractedAt": "2026-05-21T10:36:21.611Z",
    "durationSec": 1.55,
    "radiusM": 3,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Unequip time :: 0.5 seconds Game files",
      "Velocity :: 22.5 meters/second Game files",
      "Duration :: 1.55 seconds Game files",
      "Travel distance :: 34.875 meters",
      "Radius :: 3 meters Game files",
      "Vulnerable duration :: 4 seconds Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Iso",
    "ability": "Contingency",
    "page": "Contingency",
    "url": "https://valorant.fandom.com/wiki/Contingency",
    "extractedAt": "2026-05-21T10:36:22.212Z",
    "durationSec": 5.4,
    "rangeM": 5,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Unequip time :: 0.5 seconds Game files",
      "Travel distance :: 27.5 meters (primary cast) 13.75 meters (alt cast) Game files",
      "Distance between Iso and wall on cast :: 5 meters Game files",
      "Time taken to fully form :: 0.4 seconds Game files",
      "Duration :: 5.4 seconds total 4.6 seconds at full size Game files",
      "Deactivation time :: 0.4 seconds Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Iso",
    "ability": "Kill Contract",
    "page": "Kill_Contract",
    "url": "https://valorant.fandom.com/wiki/Kill_Contract",
    "extractedAt": "2026-05-21T10:36:22.704Z",
    "durationSec": 0.5,
    "rawMatches": [
      "Equip time :: 1.1 seconds Game files",
      "Column area :: 36-meter length 15-meter width Game files &",
      "Unequip time :: 0.8 seconds",
      "Capture windup :: 0.9 seconds",
      "Transportation duration to and from arena :: 0.5 seconds Game files",
      "Arena creation duration :: 1.5 seconds Game files",
      "Max duel duration :: 13 seconds Game files",
      "Initial distance between agents on Arena spawn :: 21 meters",
      "Contingency duration :: 2.5 seconds",
      "Time until exit on kill :: 2 seconds Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Clove",
    "ability": "Meddle",
    "page": "Meddle",
    "url": "https://valorant.fandom.com/wiki/Meddle",
    "extractedAt": "2026-05-21T10:36:23.139Z",
    "durationSec": 5,
    "radiusM": 4,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Windup :: 0.75 seconds after in contact with ground",
      "Radius :: 4 meters",
      "Decay rates :: Decay: 90 HP over 0.75 seconds (120 HP/s) Restoration: 90 HP over 1.75 seconds (51 HP/s)",
      "Maximum decayed health :: 90 HP In-game",
      "Decay duration :: 5 seconds (Includes decaying and restoration times) Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Clove",
    "ability": "Pick-Me-Up",
    "page": "Pick-Me-Up",
    "url": "https://valorant.fandom.com/wiki/Pick-Me-Up",
    "extractedAt": "2026-05-21T10:36:23.588Z",
    "rawMatches": [],
    "confidence": "low"
  },
  {
    "agent": "Clove",
    "ability": "Ruse",
    "page": "Ruse",
    "url": "https://valorant.fandom.com/wiki/Ruse",
    "extractedAt": "2026-05-21T10:36:24.084Z",
    "durationSec": 14,
    "radiusM": 4,
    "rawMatches": [
      "Equip time :: 0.6 seconds Game files",
      "Max cast range :: 60 meters (Alive) 42.5 meters (Dead) Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Windup time :: 1 second Game files",
      "Radius :: 4 meters Game files",
      "rowspan=2|20px|link= Duration :: Alive: 14 seconds (includes 0.5-second formation time and 0.5-second expiration time) Expiration warning at 12 seconds",
      "Dead: 6 seconds (includes 0.5-second formation time and 0.5-second expiration time) Expiration warning at 4 seconds :: }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Clove",
    "ability": "Not Dead Yet",
    "page": "Not_Dead_Yet",
    "url": "https://valorant.fandom.com/wiki/Not_Dead_Yet",
    "extractedAt": "2026-05-21T10:36:24.589Z",
    "durationSec": 1.5,
    "rawMatches": [
      "Revive duration :: 1.5 seconds Game files",
      "Maximum intangibility duration :: 2 seconds Game files",
      "Deactivation duration :: 0.8 seconds",
      "Resurrection timer :: 10 seconds ( ) }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Vyse",
    "ability": "Shear",
    "page": "Shear",
    "url": "https://valorant.fandom.com/wiki/Shear",
    "extractedAt": "2026-05-21T10:36:25.056Z",
    "durationSec": 6,
    "rawMatches": [
      "Equip time :: 0.7 seconds",
      "Max deploy distance :: 15 meters Game files",
      "rowspan=3|20px|link= Wall dimensions :: Min-Max Length: 1-12 meters Game files",
      "Unequip time :: 0.8 seconds",
      "Deploy time :: 2 seconds Game files",
      "Detection distance :: 3.5 meters Game files",
      "Windup :: 0.8 seconds",
      "rowspan=3|20px|link= Duration :: Total 6 seconds <!--",
      "Expiration warning at 3.7 seconds :: *-->",
      "0.8-second deactivation time :: Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Vyse",
    "ability": "Arc Rose",
    "page": "Arc_Rose",
    "url": "https://valorant.fandom.com/wiki/Arc_Rose",
    "extractedAt": "2026-05-21T10:36:25.549Z",
    "durationSec": 2,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Max targeting distance :: 20 meters Game files",
      "Max wall penetration :: 10 meters Game files",
      "5px|link= Max deploy height :: 4.5 meters Game files",
      "Unequip time :: 0.7 seconds Game files",
      "Detection radius :: 10 meters Game files",
      "Deploy time :: 0.8 seconds Game files",
      "Max recall distance :: 32.5 meters Game files",
      "Windup time :: 0.5 seconds Game files",
      "Max blind duration :: 2 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Vyse",
    "ability": "Razorvine",
    "page": "Razorvine",
    "url": "https://valorant.fandom.com/wiki/Razorvine",
    "extractedAt": "2026-05-21T10:36:26.095Z",
    "durationSec": 6,
    "radiusM": 6.25,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Unequip time :: 0.8 seconds Game files",
      "Deploy time :: 0.75 seconds Game files",
      "Detection radius :: 3.5 meters Game files",
      "Windup :: 0.2 seconds Game files",
      "Radius :: 6.25 meters Game files",
      "Slow amount :: 15% Game files",
      "Damage per distance :: 10 per 1.25 meters",
      "Duration :: Total 6 seconds (Includes Windup) }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Vyse",
    "ability": "Steel Garden",
    "page": "Steel_Garden",
    "url": "https://valorant.fandom.com/wiki/Steel_Garden",
    "extractedAt": "2026-05-21T10:36:26.540Z",
    "durationSec": 8,
    "radiusM": 28,
    "rawMatches": [
      "Equip time :: 0.7 seconds Game files",
      "Radius :: 28 meters",
      "Unequip time :: 0.8 seconds Game files",
      "Windup :: 4.4 seconds",
      "Jammed duration :: 8 seconds Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Tejo",
    "ability": "Stealth Drone",
    "page": "Stealth_Drone",
    "url": "https://valorant.fandom.com/wiki/Stealth_Drone",
    "extractedAt": "2026-05-21T10:36:27.018Z",
    "durationSec": 6,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Max deploy length :: 6 meters",
      "Deploy time :: 0.3 seconds Game files",
      "Vision radius :: 18 meters Game files<!--",
      "Vision cone angle :: 60° (either side of the direction Stealth Drone is looking in) Game files-->",
      "Detection radius :: 18 meters Game files",
      "Re-stealth timer :: 2 seconds Game files",
      "Duration :: 6 seconds Game files",
      "Windup time :: 0.4 seconds Game files",
      "Unequip time :: 0.5 seconds Game files",
      "Detonation radius :: 16 meters",
      "Pulse velocity :: 16 meters over 0.7 seconds",
      "Suppress duration :: 8 seconds Game files }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Tejo",
    "ability": "Guided Salvo",
    "page": "Guided_Salvo",
    "url": "https://valorant.fandom.com/wiki/Guided_Salvo",
    "extractedAt": "2026-05-21T10:36:27.594Z",
    "radiusM": 4.5,
    "rawMatches": [
      "Equip time :: 0.7 seconds",
      "Max deploy distance :: 45 meters",
      "Unequip time :: 0.92 seconds Game files",
      "5px|link= Flight altitude :: 2 meters Game files",
      "Radii :: Inner: 2.5 meters Outer: 4.5 meters Game files",
      "Windup time :: 1.25 seconds Game files",
      "Damage :: Inner radius: 65 per tick Outer radius: 50 per tick Total 195/150 damage x0.5 multiplier to objects",
      "Ticks/Tick Rate :: 1 every 0.8 seconds Total 3 ticks In-game }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Tejo",
    "ability": "Special Delivery",
    "page": "Special_Delivery",
    "url": "https://valorant.fandom.com/wiki/Special_Delivery",
    "extractedAt": "2026-05-21T10:36:28.065Z",
    "durationSec": 3,
    "rawMatches": [
      "20px Equip time :: 0.5 seconds Game files",
      "20px Unequip time :: 0.4 seconds Game files",
      "20px Max projectile duration :: 3 seconds Game files",
      "20px Radii :: 1.25 meters (Inner) 5.25 meters (Outer) Game files",
      "20px Windup time :: 0.9 seconds Game files",
      "Damage :: 20-35",
      "20px Concuss duration :: 2.5 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Tejo",
    "ability": "Armageddon",
    "page": "Armageddon",
    "url": "https://valorant.fandom.com/wiki/Armageddon",
    "extractedAt": "2026-05-21T10:36:28.516Z",
    "rawMatches": [
      "Equip time :: 0.6 seconds Game files",
      "Max deploy distance :: 52.5 meters Game files",
      "rowspan=3|20px|link= Windup time :: Total 3.08 seconds",
      "0.33-second activation delay :: Game files",
      "Unequip time :: 1 second Game files",
      "Area size :: 12-meter width 2-meter length per segment 16 segments, 32-meter total length Game files",
      "Damage :: 60 per tick In-game",
      "rowspan=2|20px|link= Detonation Ticks/Tick Rate per segment :: 1 every 0.25 seconds",
      "Total 4 ticks :: In-game",
      "Delay between successive segment detonations :: 0.25 seconds }"
    ],
    "confidence": "low"
  },
  {
    "agent": "Waylay",
    "ability": "Lightspeed",
    "page": "Lightspeed",
    "url": "https://valorant.fandom.com/wiki/Lightspeed",
    "extractedAt": "2026-05-21T10:36:28.966Z",
    "durationSec": 0.45,
    "rawMatches": [
      "Equip time :: 0.8 seconds Game files",
      "Dash duration :: 0.45 seconds per dash Game files",
      "Dash distance :: 9 meters",
      "Unequip time :: 0 seconds is only relevant to Lightspeed's Primary Fire use and counts the unequip time from the moment the first dash's movement ends.|group=\"s\"}} }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Waylay",
    "ability": "Saturate",
    "page": "Saturate",
    "url": "https://valorant.fandom.com/wiki/Saturate",
    "extractedAt": "2026-05-21T10:36:29.480Z",
    "durationSec": 3,
    "radiusM": 6,
    "rawMatches": [
      "Equip time :: ? seconds",
      "Unequip time :: 0.3 seconds Game files",
      "Maximum air time :: 1 second Game files",
      "Windup :: 0.6 seconds",
      "Radius :: 6 meters",
      "Hinder duration :: 3 seconds }"
    ],
    "confidence": "medium"
  },
  {
    "agent": "Waylay",
    "ability": "Convergent Paths",
    "page": "Convergent_Paths",
    "url": "https://valorant.fandom.com/wiki/Convergent_Paths",
    "extractedAt": "2026-05-21T10:36:29.935Z",
    "durationSec": 7,
    "rawMatches": [
      "20px Equip time :: 0.7 seconds Game files",
      "20px Area size :: 36 x 13.5 meters Game files &",
      "20px Distance between Waylay and AoE :: 3 meters Game files",
      "20px Channel time :: 0.6 seconds Game files",
      "20px Unequip time :: 0.5 seconds",
      "20px Windup :: 1 seconds",
      "rowspan=2|20px Ticks/Tick rate :: 1 every 0.125 seconds",
      "Total 4 ticks :: Game files",
      "20px Buffs :: +10% speed boost",
      "20px Buff duration :: 7 seconds Game files",
      "20px Debuff duration :: 6 seconds }"
    ],
    "confidence": "medium"
  }
];

export const VALORANT_WIKI_ABILITY_STATS = VALORANT_WIKI_ABILITIES.map((item): AbilityStats => ({
  key: item.ability.toLowerCase(),
  shape: item.radiusM != null ? "circle" : item.rangeM != null ? "wall" : "point",
  radiusM: item.radiusM,
  lengthM: item.rangeM,
  durationSec: item.durationSec,
  label: item.ability,
}));
