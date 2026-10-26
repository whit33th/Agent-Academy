// Explicit gameplay profiles. Values are resolved from current local game exports,
// never inferred from display names, table order or the largest number on a page.
const marker = { kind: "marker" };
const circle = (radius, extra = {}) => ({ kind: "circle", radius, ...extra });
const path = (maxLength, extra = {}) => ({
  kind: "path",
  ...(maxLength === undefined ? {} : { maxLength }),
  ...extra,
});
const strip = (length, width, extra = {}) => ({
  kind: "strip",
  length,
  width,
  ...extra,
});
const wall = (length, extra = {}) => ({ kind: "wall", length, ...extra });
const teleport = (maxDistance) => ({
  kind: "teleport",
  ...(maxDistance === undefined ? {} : { maxDistance }),
});
const single = (geometry) => [{ id: "default", label: "Default", geometry }];
const modes = (...items) =>
  items.map(([id, label, geometry, targets]) => ({
    id,
    label,
    geometry,
    ...(targets ? { targets } : {}),
  }));
const profile = (slug, slot, placement, build, configure = () => ({})) => ({
  slug,
  slot,
  placement,
  build,
  configure,
});

export const profiles = [
  profile("astra", "Grenade", "point", (q) =>
    single(
      circle(
        q.sphere("radius", "GameObject_Rift_4_BlackHole", "GravitySphere"),
      ),
    ),
  ),
  profile("astra", "Ability1", "point", (q) =>
    single(
      circle(
        q.m(
          "radius",
          "GameObject_Rift_Q_FlashBurst",
          "self",
          "ConcussionRange",
        ),
      ),
    ),
  ),
  profile("astra", "Ability2", "point", (q) =>
    modes(
      [
        "nebula",
        "Nebula",
        circle(q.smoke("radius", "GameObject_Rift_E_SmokeZone")),
      ],
      [
        "dissipate",
        "Dissipate",
        circle(q.smoke("radius", "GameObject_Rift_E_SmokeZone")),
      ],
    ),
  ),
  profile("astra", "Ultimate", "direction", () =>
    single({ kind: "global-line" }),
  ),
  profile("breach", "Grenade", "direction", (q) =>
    single(
      strip(
        q.m(
          "length",
          "Ability_Breach_4_FusionBlast",
          "self",
          "ExplosionLength",
        ),
        q.m("width", "Ability_Breach_4_FusionBlast", "self", "ExplosionWidth"),
      ),
    ),
  ),
  profile("breach", "Ability1", "point", () => single(marker)),
  profile("breach", "Ability2", "direction", (q) => q.faultLine()),
  profile("breach", "Ultimate", "direction", (q) =>
    single(q.meshStrip("GameObject_Breach_X_Shockwave", "Zone1", "Zone8")),
  ),
  profile("brimstone", "Grenade", "point", (q) =>
    single(
      circle(q.sphere("radius", "GameObject_Sarge_E_SpeedStim", "BuffZone")),
    ),
  ),
  profile("brimstone", "Ability1", "point", (q) =>
    single(
      circle(
        q.m(
          "radius",
          "Patch_Sarge_Q_Molotov_Production",
          "self",
          "ClampedRadius",
        ),
      ),
    ),
  ),
  profile("brimstone", "Ability2", "point", (q) =>
    single(circle(q.smoke("radius", "GameObject_Sarge_4_Smoke_ProductionNEW"))),
  ),
  profile("brimstone", "Ultimate", "point", (q) =>
    single(
      circle(
        q.m(
          "radius",
          "GameObject_Sarge_X_OrbitalStrike_Production",
          "damageCapsule",
          "CapsuleRadius",
        ),
      ),
    ),
  ),
  profile("chamber", "Grenade", "point", (q) =>
    modes(
      [
        "detection",
        "Detection",
        circle(
          q.m(
            "radius",
            "GameObject_Deadeye_E_Trap",
            "self",
            "DetectionRadius2D",
          ),
        ),
      ],
      [
        "slow",
        "Slow field",
        circle(
          q.m(
            "slowRadius",
            "Patch_Deadeye_E_Slow_Large",
            "self",
            "ClampedRadius",
          ),
        ),
      ],
    ),
  ),
  profile("chamber", "Ability1", "point", () => single(marker)),
  profile("chamber", "Ability2", "point", (q) =>
    single(
      teleport(
        q.tuning(
          "activationRadius",
          "AbilityTuning_Deadeye_E_Teleport_Tether",
          "TeleportRadius",
        ),
      ),
    ),
  ),
  profile("chamber", "Ultimate", "point", () => single(marker)),
  profile("clove", "Grenade", "point", () => single(marker)),
  profile("clove", "Ability1", "point", (q) =>
    single(
      circle(
        q.m("radius", "GameObject_Smonk_Q_DecayExplosion", "self", "Radius"),
      ),
    ),
  ),
  profile("clove", "Ability2", "point", (q) =>
    modes(
      [
        "alive",
        "Alive",
        circle(q.smoke("radius", "GameObject_Smonk_NewSmoke")),
      ],
      [
        "after-death",
        "After death",
        circle(q.smoke("radius", "GameObject_Smonk_NewSmoke_PDS")),
      ],
    ),
  ),
  profile("clove", "Ultimate", "point", () => single(marker)),
  profile(
    "cypher",
    "Grenade",
    "segment",
    (q) =>
      single({
        kind: "segment",
        minLength: q.minimumWireLength(),
        maxLength: q.tuning(
          "maxLength",
          "AbilityTuning_Gumshoe_4_TripWire",
          "MaxWireLength",
        ),
      }),
    (q) => ({
      castRange: q.tuning(
        "castRange",
        "AbilityTuning_Gumshoe_4_TripWire",
        "WireTargetingDistance",
      ),
    }),
  ),
  profile("cypher", "Ability1", "point", (q) =>
    single(
      circle(
        q.tuning("radius", "AbilityTuning_Gumshoe_Q_CageTrap", "CageRadius"),
      ),
    ),
  ),
  profile("cypher", "Ability2", "direction", () => single({ kind: "facing" })),
  profile("cypher", "Ultimate", "point", () => single(marker)),
  profile("deadlock", "Grenade", "direction", (q) =>
    single({
      kind: "cross",
      armLength: q.m(
        "armLength",
        "GameObject_CableJamRoot",
        "self",
        "MaxHorizontalWallRange",
      ),
    }),
  ),
  profile("deadlock", "Ability1", "direction", (q) =>
    single(q.boxStrip("GameObject_StealthingTrap_SoundSensor", "BoxSenseArea")),
  ),
  profile("deadlock", "Ability2", "point", (q) =>
    single(
      circle(q.m("radius", "Patch_Cable_4_NetToss", "self", "ClampedRadius")),
    ),
  ),
  profile("deadlock", "Ultimate", "path", (q) =>
    single(
      path(q.m("maxLength", "Actor_FishingHook", "self", "Maximum Range"), {
        radius: q.m(
          "radius",
          "Actor_FishingHook",
          "self",
          "Projectile Stopped Radius",
        ),
      }),
    ),
  ),
  profile("fade", "Grenade", "path", () => single(path())),
  profile("fade", "Ability1", "point", (q) =>
    single(
      circle(
        q.m(
          "radius",
          "GameObject_Q_BountyHunter_Tether_SphereExpansion",
          "self",
          "Tether Scan Radius",
        ),
      ),
    ),
  ),
  profile("fade", "Ability2", "point", (q) =>
    single(
      circle(
        q.sphere(
          "radius",
          "GameObject_BountyHunter_E_LoSReveal_Source_Reactivate",
          "InRangeShape",
        ),
      ),
    ),
  ),
  profile("fade", "Ultimate", "direction", (q) =>
    single(
      q.meshStrip("GameObject_BountyHunter_X_WaveForm", "Zone1", "Zone10"),
    ),
  ),
  profile("gekko", "Grenade", "point", (q) =>
    single(
      circle(
        q.m(
          "radius",
          "Patch_Aggrobot_C_ExplodeyPatch",
          "self",
          "ClampedRadius",
        ),
        {
          innerRadius: q.m(
            "innerRadius",
            "Patch_Aggrobot_C_ExplodeyPatch",
            "self",
            "Inner Radius",
          ),
        },
      ),
    ),
  ),
  profile("gekko", "Ability1", "path", (q) =>
    modes(
      [
        "scout",
        "Scout",
        path(
          q.m(
            "maxLength",
            "Ability_Q_Aggrobot_SeekerNade",
            "self",
            "Max Path Distance",
          ),
          {
            radius: q.sphere(
              "radius",
              "Pawn_Aggrobot_SeekerNade",
              "PlayerExplodeSphere",
            ),
          },
        ),
      ],
      [
        "plant",
        "Plant / defuse",
        path(
          q.m(
            "maxLength",
            "Ability_Q_Aggrobot_SeekerNade",
            "self",
            "Max Path Distance",
          ),
        ),
      ],
    ),
  ),
  profile("gekko", "Ability2", "path", () => single(path())),
  profile("gekko", "Ultimate", "path", (q) =>
    single(
      path(undefined, {
        radius: q.m(
          "radius",
          "Pawn_Aggrobot_RollyPolly",
          "self",
          "Detain Radius",
        ),
      }),
    ),
  ),
  profile("harbor", "Grenade", "point", (q) =>
    single(
      circle(
        q.m(
          "radius",
          "GameObject_Mage_4_SplashGrenade",
          "self",
          "ExplosionRadius",
        ),
      ),
    ),
  ),
  profile("harbor", "Ability1", "path", (q) =>
    single(
      path(
        q.m("maxLength", "Projectile_Mage_Q_Wall", "self", "Max2D_Distance"),
      ),
    ),
  ),
  profile("harbor", "Ability2", "point", (q) =>
    single(circle(q.smoke("radius", "GameObject_Mage_E_WorldSmoke"))),
  ),
  profile("harbor", "Ultimate", "direction", (q) => q.harborWave()),
  profile("iso", "Grenade", "direction", (q) => q.contingency()),
  profile("iso", "Ability1", "direction", (q) =>
    single(
      strip(
        q.m(
          "length",
          "Projectile_Sequoia_Q_FragileMissile",
          "Comp_Projectile_MaximumRange",
          "TriggerDistance",
        ),
        q.m(
          "width",
          "Projectile_Sequoia_Q_FragileMissile",
          "Sphere",
          "SphereRadius",
          0.02,
        ),
      ),
    ),
  ),
  profile("iso", "Ability2", "point", () => single(marker)),
  profile("iso", "Ultimate", "direction", (q) =>
    single(
      q.singleMeshStrip("GameObject_Sequoia_X_LineCapture", "LineCollision"),
    ),
  ),
  profile("jett", "Grenade", "point", (q) =>
    single(circle(q.smoke("radius", "GameObject_Wushu_4_SmokeZone"))),
  ),
  profile("jett", "Ability1", "point", () => single(marker)),
  profile("jett", "Ability2", "path", (q) => single(path(q.dashLength()))),
  profile("jett", "Ultimate", "point", () => single(marker)),
  profile("kayo", "Grenade", "point", (q) =>
    single(
      circle(
        q.m(
          "radius",
          "Projectile_Grenadier_Q_SemtexBasic",
          "self",
          "Damage Outer Radius",
        ),
        {
          innerRadius: q.m(
            "innerRadius",
            "Projectile_Grenadier_Q_SemtexBasic",
            "self",
            "Damage Inner Radius",
          ),
        },
      ),
    ),
  ),
  profile("kayo", "Ability1", "point", () => single(marker)),
  profile("kayo", "Ability2", "point", (q) =>
    single(
      circle(
        q.m(
          "radius",
          "Gameobject_Grenadier_E_SuppressionPulse",
          "self",
          "Tech Scan Radius",
        ),
      ),
    ),
  ),
  profile("kayo", "Ultimate", "point", (q) =>
    single(
      circle(
        q.m(
          "radius",
          "Gameobject_Grenadier_X_UltPulse",
          "self",
          "ActualFinalRadius",
        ),
      ),
    ),
  ),
  profile("killjoy", "Grenade", "point", (q) =>
    single(
      circle(
        q.cylinderRadius(
          "radius",
          "GameObject_Killjoy_4_BeeSwarm_Damage",
          "Cylinder",
        ),
      ),
    ),
  ),
  profile("killjoy", "Ability1", "point", (q) =>
    single(
      circle(
        q.sphere(
          "radius",
          "Pawn_Killjoy_Q_StealthAlarmbot",
          "DetectEnemySphere",
        ),
      ),
    ),
  ),
  profile("killjoy", "Ability2", "direction", (q) =>
    single(q.vision("Controller_Killjoy_E_Turret")),
  ),
  profile("killjoy", "Ultimate", "point", (q) =>
    single(
      circle(q.sphere("radius", "GameObject_Killjoy_X_Bomb", "BombRadius")),
    ),
  ),
  profile("miks", "Grenade", "point", (q) =>
    modes(
      [
        "concuss",
        "Concuss",
        circle(q.tuning("radius", "AbilityTuning_Iris_Thumper", "Radius")),
      ],
      ["heal", "Heal", q.thumperHeal()],
    ),
  ),
  profile("miks", "Ability1", "point", () => single(marker)),
  profile("miks", "Ability2", "point", (q) =>
    single(circle(q.smoke("radius", "GameObject_Iris_E_Smoke"))),
  ),
  profile("miks", "Ultimate", "direction", (q) =>
    single({
      kind: "sector",
      radius: q.m(
        "radius",
        "GameObject_Iris_X_SonicWave",
        "ConeOverlap_ShooterCharacter",
        "ConeDistance",
      ),
      angle: q.m(
        "angle",
        "GameObject_Iris_X_SonicWave",
        "ConeOverlap_ShooterCharacter",
        "ConeAngle",
        1,
        "deg",
      ),
    }),
  ),
  profile("neon", "Grenade", "direction", (q) =>
    single(
      wall(q.m("length", "Projectile_Neon_C_Tunnel", "self", "MaxDistance"), {
        twinGap: q.m(
          "twinGap",
          "GameObject_Sprinter_4_Tunnel",
          "self",
          "TunnelWidth",
        ),
      }),
    ),
  ),
  profile("neon", "Ability1", "point", (q) =>
    modes(
      [
        "single",
        "One impact",
        circle(
          q.m(
            "radius",
            "GameObject_Sprinter_Q_ElectricSphere",
            "self",
            "Final Radius",
          ),
        ),
      ],
      [
        "double",
        "Two impacts",
        circle(
          q.m(
            "radius",
            "GameObject_Sprinter_Q_ElectricSphere",
            "self",
            "Final Radius",
          ),
        ),
        2,
      ],
    ),
  ),
  profile("neon", "Ability2", "path", () => single(path())),
  profile("neon", "Ultimate", "point", () => single(marker)),
  profile("omen", "Grenade", "point", (q) =>
    single(
      teleport(
        q.m(
          "maxDistance",
          "Ability_Wraith_E_ShortTeleport",
          "PlacementTargetingState",
          "TargetingRange",
        ),
      ),
    ),
  ),
  profile("omen", "Ability1", "direction", (q) =>
    single(
      strip(
        q.m(
          "length",
          "Projectile_Wraith_Q_NearsightMissile",
          "Comp_Projectile_MaximumRange",
          "TriggerDistance",
        ),
        q.m(
          "width",
          "Projectile_Wraith_Q_NearsightMissile",
          "RootSphere",
          "SphereRadius",
          0.02,
        ),
      ),
    ),
  ),
  profile("omen", "Ability2", "point", (q) =>
    single(circle(q.smoke("radius", "Zone_Wraith_4_Smoke"))),
  ),
  profile("omen", "Ultimate", "point", () => single(teleport())),
  profile("phoenix", "Grenade", "path", (q) =>
    single(
      path(
        q.m(
          "maxLength",
          "Projectile_Phoenix_Q_FlameWall_ThroughWall",
          "self",
          "Max2D_Distance",
        ),
      ),
    ),
  ),
  profile("phoenix", "Ability1", "point", (q) =>
    single(
      circle(
        q.m("radius", "Patch_Phoenix_MolotovFire", "self", "ClampedRadius"),
      ),
    ),
  ),
  profile("phoenix", "Ability2", "path", () =>
    modes(["left", "Curve left", path()], ["right", "Curve right", path()]),
  ),
  profile("phoenix", "Ultimate", "point", () => single(teleport())),
  profile("raze", "Grenade", "path", (q) =>
    single(
      path(undefined, {
        radius: q.m(
          "radius",
          "Pawn_Clay_E_Boomba",
          "self",
          "ExplosionOuterRadius",
        ),
      }),
    ),
  ),
  profile("raze", "Ability1", "point", (q) =>
    single(
      circle(
        q.m(
          "radius",
          "GameObject_Clay_Q_Explosion",
          "self",
          "DamageOuterRadius",
        ),
        {
          innerRadius: q.m(
            "innerRadius",
            "GameObject_Clay_Q_Explosion",
            "self",
            "DamageInnerRadius",
          ),
        },
      ),
    ),
  ),
  profile("raze", "Ability2", "point", (q) => q.paintShells()),
  profile("raze", "Ultimate", "point", (q) =>
    single(
      circle(
        q.m(
          "radius",
          "Projectile_Clay_X_Rocket",
          "RadialDamageProjectileEffect",
          "ExplosionRadius",
        ),
        {
          innerRadius: q.m(
            "innerRadius",
            "Projectile_Clay_X_Rocket",
            "RadialDamageProjectileEffect",
            "ExplosionInnerRadius",
          ),
        },
      ),
    ),
  ),
  profile("reyna", "Grenade", "point", () => single(marker)),
  profile("reyna", "Ability1", "point", () => single(marker)),
  profile("reyna", "Ability2", "point", () => single(marker)),
  profile("reyna", "Ultimate", "point", () => single(marker)),
  profile("sage", "Grenade", "direction", (q) => q.sageWall()),
  profile("sage", "Ability1", "point", (q) =>
    single(
      circle(
        q.m(
          "radius",
          "Patch_Thorne_4_SlowField_Production",
          "self",
          "ClampedRadius",
        ),
      ),
    ),
  ),
  profile("sage", "Ability2", "point", () => single(marker)),
  profile("sage", "Ultimate", "point", () => single(marker)),
  profile("skye", "Grenade", "point", (q) =>
    single(
      circle(
        q.sphere("radius", "GameObject_Guide_4_Heal_AOE", "OverlapSphere"),
      ),
    ),
  ),
  profile("skye", "Ability1", "path", (q) =>
    single(
      path(undefined, {
        radius: q.m(
          "radius",
          "Pawn_Guide_Q_PossessableScout",
          "Comp_Actor_ConcussionExplosion_AtLocation",
          "ConcussionRange",
        ),
      }),
    ),
  ),
  profile("skye", "Ability2", "path", () => single(path())),
  profile("skye", "Ultimate", "path", (q) =>
    single(
      path(undefined, {
        maxRoutes: q.countTuning(
          "maxRoutes",
          "AbilityTuning_Guide_X_Pack",
          "MaxSeekersSpawned",
        ),
      }),
    ),
  ),
  profile("sova", "Grenade", "path", () => single(path())),
  profile("sova", "Ability1", "point", (q) =>
    single(
      circle(
        q.sphere(
          "radius",
          "GameObject_Hunter_4_ExplosiveBolt_Explosion",
          "Sphere",
        ),
      ),
    ),
  ),
  profile("sova", "Ability2", "point", (q) =>
    single(
      circle(
        q.m(
          "radius",
          "GameObject_Hunter_Q_SonarPing",
          "self",
          "ActualFinalRadius",
        ),
      ),
    ),
  ),
  profile("sova", "Ultimate", "direction", (q) => q.huntersFury()),
  profile("tejo", "Grenade", "path", () => single(path())),
  profile("tejo", "Ability1", "point", (q) =>
    single(
      circle(
        q.m(
          "radius",
          "GameObject_Cashew_Q_ShellShockGrenade",
          "self",
          "Explosion Radius",
        ),
      ),
    ),
  ),
  profile("tejo", "Ability2", "point", (q) =>
    modes(
      [
        "single",
        "One target",
        circle(
          q.tuning(
            "radius",
            "AbilityTuning_Cashew_E_Airstrike",
            "ExplosionRadius",
          ),
        ),
      ],
      [
        "double",
        "Two targets",
        circle(
          q.tuning(
            "radius",
            "AbilityTuning_Cashew_E_Airstrike",
            "ExplosionRadius",
          ),
        ),
        2,
      ],
    ),
  ),
  profile("tejo", "Ultimate", "direction", (q) =>
    single(
      q.boxStrip(
        "GameObject_Cashew_X_SegmentManager",
        "Volume_EntireAffectedZone",
      ),
    ),
  ),
  profile("veto", "Grenade", "point", (q) =>
    single(
      teleport(
        q.sphere(
          "maxDistance",
          "GameObject_Pine_4_UsableTeleport",
          "RangeCollider",
        ),
      ),
    ),
  ),
  profile("veto", "Ability1", "point", (q) =>
    single(
      circle(
        q.m(
          "radius",
          "GameObject_Pine_Q_Tether_SphereExpansion",
          "self",
          "TetherScanRadius",
        ),
      ),
    ),
  ),
  profile("veto", "Ability2", "point", (q) =>
    single(q.vision("Pawn_Pine_E_RadEater")),
  ),
  profile("veto", "Ultimate", "point", () => single(marker)),
  profile("viper", "Grenade", "point", (q) =>
    single(
      circle(
        q.m(
          "radius",
          "Patch_Pandemic_AcidMolotov_NewMolotov",
          "self",
          "ClampedRadius",
        ),
      ),
    ),
  ),
  profile("viper", "Ability1", "point", (q) =>
    single(
      circle(
        q.sphere("radius", "GameObject_Pandemic_4_SmokeZone", "SmokeSphere"),
      ),
    ),
  ),
  profile("viper", "Ability2", "direction", (q) =>
    single(
      wall(
        q.m(
          "length",
          "Projectile_Pandemic_E_SmokeScreen_NoCollision",
          "self",
          "Max2D_Distance",
        ),
      ),
    ),
  ),
  profile("viper", "Ultimate", "point", (q) => q.vipersPit()),
  profile("vyse", "Grenade", "point", (q) =>
    single(
      circle(q.m("radius", "Patch_Nox_BarbedWire", "self", "ClampedRadius")),
    ),
  ),
  profile("vyse", "Ability1", "path", (q) =>
    single(
      path(
        q.m(
          "maxLength",
          "LineTargetingState_NoxWallFirstAnchor",
          "self",
          "MaxWallLength",
        ),
      ),
    ),
  ),
  profile("vyse", "Ability2", "point", () => single(marker)),
  profile("vyse", "Ultimate", "point", (q) =>
    single(
      circle(
        q.m(
          "radius",
          "Gameobject_Nox_DisarmPulse",
          "self",
          "ActualFinalRadius",
        ),
      ),
    ),
  ),
  profile("waylay", "Grenade", "point", (q) =>
    single(
      circle(
        q.m(
          "radius",
          "GameObject_Terra_C_TimeSlowGrenade_Explosion",
          "self",
          "Debuff Radius",
        ),
      ),
    ),
  ),
  profile("waylay", "Ability1", "path", () => single(path())),
  profile("waylay", "Ability2", "point", () => single(teleport())),
  profile("waylay", "Ultimate", "direction", (q) => single(q.waylayBeam())),
  profile("yoru", "Grenade", "path", () => single(path())),
  profile("yoru", "Ability1", "path", () => single(path())),
  profile("yoru", "Ability2", "path", (q) =>
    modes(
      [
        "moving",
        "Moving tether",
        path(
          q.m(
            "maxLength",
            "Pawn_Stealth_E_TeleporterMoving",
            "self",
            "Max Travel Distance",
          ),
        ),
      ],
      ["stationary", "Stationary tether", teleport()],
    ),
  ),
  profile("yoru", "Ultimate", "path", () => single(path())),
];
