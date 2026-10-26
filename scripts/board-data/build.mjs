import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { loadGameSources, metric } from "./sources.mjs";
import { profiles } from "./profiles.mjs";
import { verifyRelease } from "./verification.mjs";

const root = process.cwd();
const input = path.resolve(
  process.argv.find((arg) => arg.startsWith("--input="))?.slice(8) ??
    "outputs/board-data-research",
);
const sources = await loadGameSources(path.join(input, "raw"));
const catalog = JSON.parse(
  await readFile("lib/generated/valorant-catalog.json", "utf8"),
);
const version = JSON.parse(
  await readFile(path.join(input, "version-public.json"), "utf8"),
).data;
const mapsSource = JSON.parse(
  await readFile(path.join(input, "maps-public.json"), "utf8"),
).data;
const report = JSON.parse(
  await readFile(path.join(input, "allpublic-report.json"), "utf8"),
);
if (
  report.sourceBuild !== version.version ||
  report.manifest !== version.manifestId
)
  throw new Error("Game export and calibration builds differ.");
if (
  report.records.some((record) => !record.ok) ||
  report.missingPublicPackages.length
)
  throw new Error("Game export is incomplete.");
const gameBuild = version.version;
const radarSources = JSON.parse(
  await readFile("scripts/board-data/radar-sources.json", "utf8"),
);
if (
  radarSources.gameBuild !== gameBuild ||
  radarSources.manifestId !== report.manifest
)
  throw new Error("Radar source bindings belong to another game build.");
const failures = [];
const one = (geometry) => [{ id: "default", label: "Default", geometry }];

function resolver() {
  const evidence = {};
  const m = (field, pkg, component, property, factor = 0.01, unit = "m") => {
    const result = metric(
      sources,
      gameBuild,
      pkg,
      component,
      property,
      unit,
      factor,
    );
    evidence[field] = { ...result, source: `riot-manifest:${report.manifest}` };
    return result.value;
  };
  const derived = (field, value, formula, inputs) => {
    if (!Number.isFinite(value))
      throw new Error(`Invalid derived metric ${field}`);
    evidence[field] = {
      ...evidence[inputs[0]],
      value,
      formula,
      inputs: inputs.map((key) => evidence[key]),
    };
    return value;
  };
  const raw = (field, pkg, comp, property) =>
    m(field, pkg, comp, property, 1, "raw");
  const sphere = (field, pkg, component) => {
    const radius = m(`${field}.unscaled`, pkg, component, "SphereRadius");
    let scale;
    try {
      scale = raw(`${field}.scale`, pkg, component, "RelativeScale3D.X");
    } catch (error) {
      if (!error.message.includes("Missing effective property")) throw error;
      // USceneComponent's identity transform has unit scale. Missing game radii never default.
      scale = 1;
    }
    return derived(
      field,
      radius * scale,
      "SphereRadius / 100 * effective RelativeScale3D.X",
      [
        `${field}.unscaled`,
        ...(evidence[`${field}.scale`] ? [`${field}.scale`] : []),
      ],
    );
  };
  const boxStrip = (pkg, component) => {
    const scale = (axis) => {
      try {
        return raw(`scale${axis}`, pkg, component, `RelativeScale3D.${axis}`);
      } catch (error) {
        if (!error.message.includes("Missing effective property")) throw error;
        return 1;
      }
    };
    const length =
        m("length", pkg, component, "BoxExtent.X", 0.02) * scale("X"),
      width = m("width", pkg, component, "BoxExtent.Y", 0.02) * scale("Y");
    let offset = 0;
    try {
      offset =
        m("centerOffset", pkg, component, "RelativeLocation.X") - length / 2;
    } catch (error) {
      if (!error.message.includes("Missing effective property")) throw error;
    }
    return { kind: "strip", length, width, startOffset: offset };
  };
  const meshStrip = (pkg, first, last) => {
    const start = m("firstCenter", pkg, first, "RelativeLocation.X");
    const end = m("lastCenter", pkg, last, "RelativeLocation.X");
    const cellLength = raw("cellLength", pkg, first, "RelativeScale3D.X");
    const width = raw("width", pkg, first, "RelativeScale3D.Y");
    const cubeEdge =
      sources.read("Cube", "BodySetup_1", "AggGeom.BoxElems.0.X").value / 100;
    const length = derived(
      "length",
      end - start + cellLength * cubeEdge,
      "last center - first center + collision cube edge * scaleX",
      ["firstCenter", "lastCenter", "cellLength"],
    );
    const offset = m("startOffset", pkg, "self", "ForwardVectorOffSet");
    return {
      kind: "strip",
      length,
      width: width * cubeEdge,
      startOffset: offset + start - (cellLength * cubeEdge) / 2,
    };
  };
  const tuning = (
    field,
    pkg,
    row,
    factor = 0.01,
    unit = "m",
    kind = "Float",
  ) => {
    const entry = sources.byName.get(pkg);
    const table = entry?.exports.find((object) => object.Type === "DataTable");
    const entryValue = table?.Rows?.[row]?.Value;
    const value =
      entryValue?.Type === `EAbilityTuningValueType::${kind}`
        ? entryValue[`${kind}Value`]
        : undefined;
    if (typeof value !== "number")
      throw new Error(`Missing Float tuning ${pkg}:${row}`);
    evidence[field] = {
      value: value * factor,
      unit,
      package: entry.packagePath,
      component: table.Name,
      property: `Rows.${row}.Value.${kind}Value`,
      sourceBuild: gameBuild,
      source: `riot-manifest:${report.manifest}`,
      sourceHash: entry.hash,
      rawValue: value,
      conversion: factor,
    };
    return value * factor;
  };
  return {
    evidence,
    m,
    raw,
    sphere,
    boxStrip,
    meshStrip,
    tuning,
    countTuning: (field, pkg, row) =>
      tuning(field, pkg, row, 1, "count", "Int"),
    minimumWireLength() {
      const squared = raw(
        "minimumDistanceSquared",
        "StateComponent_Gumshoe_4_TripWirePlace",
        "self",
        "MinRequiredDistanceSquared",
      );
      return derived(
        "minimumLength",
        Math.sqrt(squared) / 100,
        "sqrt(MinRequiredDistanceSquared) / 100",
        ["minimumDistanceSquared"],
      );
    },
    thumperHeal() {
      const radius = tuning(
        "healRadius",
        "AbilityTuning_Iris_Thumper",
        "Radius",
      );
      const scale = raw(
        "passiveHealScale",
        "GameObject_Thumper_Heal",
        "PassiveHealAreaOfEffect",
        "RelativeScale3D.X",
      );
      return {
        kind: "circle",
        radius,
        innerRadius: derived(
          "passiveHealRadius",
          radius * scale,
          "runtime SetSphereRadius(tuned Radius) * component scaleX",
          ["healRadius", "passiveHealScale"],
        ),
      };
    },
    harborWave() {
      const pkg = "GameObject_Mage_X_TidalWave";
      const chunks = tuning(
        "chunks",
        "AbilityTuning_Mage_X_Wave",
        "WaveNumChunks",
        1,
        "count",
        "Int",
      );
      const spacing = m("chunkSpacing", pkg, "self", "ChunkSpacing");
      const chunkWidth = m(
        "chunkWidth",
        "GameObject_Mage_X_TidalWave_Chunk",
        "self",
        "ChunkWidth",
      );
      return one({
        kind: "strip",
        length: m("length", pkg, "self", "Range"),
        width: derived(
          "width",
          (chunks - 1) * spacing + chunkWidth,
          "(WaveNumChunks - 1) * ChunkSpacing + ChunkWidth",
          ["chunks", "chunkSpacing", "chunkWidth"],
        ),
      });
    },
    smoke: (field, pkg) => sphere(field, pkg, "VisionBlockingSphere"),
    cylinderRadius(field, pkg, component) {
      const mesh = sources.byName
        .get("Cylinder")
        ?.exports.find((object) => object.Type === "BodySetup");
      const vertices = mesh?.Properties?.AggGeom?.ConvexElems?.[0]?.VertexData;
      if (!vertices?.length)
        throw new Error("Missing authored cylinder collision vertices.");
      const localRadius =
        Math.max(...vertices.map((point) => Math.hypot(point.X, point.Y))) /
        100;
      const scale = raw(`${field}.scale`, pkg, component, "RelativeScale3D.X");
      evidence[`${field}.meshRadius`] = {
        value: localRadius,
        unit: "m",
        package: "/Engine/BasicShapes/Cylinder",
        component: mesh.Name,
        property: "AggGeom.ConvexElems.0.VertexData",
        sourceBuild: gameBuild,
        source: `riot-manifest:${report.manifest}`,
      };
      return derived(
        field,
        localRadius * scale,
        "max local collision vertex XY radius * component scaleX",
        [`${field}.meshRadius`, `${field}.scale`],
      );
    },
    singleMeshStrip(pkg, component) {
      const length = raw("length", pkg, component, "RelativeScale3D.X");
      const width = raw("width", pkg, component, "RelativeScale3D.Y");
      const center = m("center", pkg, component, "RelativeLocation.X");
      const cubeEdge =
        sources.read("Cube", "BodySetup_1", "AggGeom.BoxElems.0.X").value / 100;
      return {
        kind: "strip",
        length: length * cubeEdge,
        width: width * cubeEdge,
        startOffset: center - (length * cubeEdge) / 2,
      };
    },
    vision: (pkg) => ({
      kind: "sector",
      radius: m("radius", pkg, "AISenseConfig_Sight_0", "SightRadius"),
      angle: m(
        "angle",
        pkg,
        "AISenseConfig_Sight_0",
        "PeripheralVisionAngleDegrees",
        2,
        "deg",
      ),
    }),
    faultLine() {
      const pkg = "GameObject_Breach_E_SweetSpotFissure";
      const base = raw("baseLength", pkg, "LineCollision", "RelativeScale3D.X");
      const width = raw("width", pkg, "LineCollision", "RelativeScale3D.Y");
      const extra = raw("extraCharge", pkg, "self", "ExtraChargePercent");
      const offset = m("startOffset", pkg, "self", "ForwardVectorOffSet");
      const cubeEdge =
        sources.read("Cube", "BodySetup_1", "AggGeom.BoxElems.0.X").value / 100;
      return [
        {
          id: "full",
          label: "Full charge",
          geometry: {
            kind: "strip",
            length: derived(
              "maxLength",
              base * cubeEdge * (1 + extra),
              "cubeEdge * scaleX * (1 + ExtraChargePercent)",
              ["baseLength", "extraCharge"],
            ),
            width: width * cubeEdge,
            startOffset: offset,
          },
        },
        {
          id: "minimum",
          label: "Minimum charge",
          geometry: {
            kind: "strip",
            length: derived(
              "minLength",
              base * cubeEdge * extra,
              "cubeEdge * scaleX * ExtraChargePercent",
              ["baseLength", "extraCharge"],
            ),
            width: width * cubeEdge,
            startOffset: offset,
          },
        },
      ];
    },
    waylayBeam() {
      const pkg = "GameObject_Terra_X_DelayedBeam_Beam";
      const length = m("length", pkg, "LeftCollider", "BoxExtent.X", 0.02);
      const halfWidth = m("halfStrip", pkg, "LeftCollider4", "BoxExtent.Y");
      const lastCenter = m(
        "lastCenter",
        pkg,
        "LeftCollider4",
        "RelativeLocation.Y",
      );
      return {
        kind: "strip",
        length,
        width: derived(
          "width",
          2 * (lastCenter + halfWidth),
          "2 * (last strip center + half strip width)",
          ["lastCenter", "halfStrip"],
        ),
        startOffset: m("startOffset", pkg, "self", "ForwardVectorOffSet"),
      };
    },
    huntersFury() {
      return one({
        kind: "strip",
        length: m(
          "length",
          "StateComponent_Hunter_X_UltDamage",
          "self",
          "CapsuleRange",
        ),
        width: m(
          "width",
          "Ability_Hunter_X_LaserMulti",
          "Capsule",
          "CapsuleRadius",
          0.02,
        ),
      });
    },
    paintShells() {
      return [
        {
          id: "primary",
          label: "Primary blast",
          geometry: {
            kind: "circle",
            radius: m(
              "radius",
              "Projectile_Clay_4_Projectile_Primary",
              "RadialDamageProjectileEffect",
              "ExplosionRadius",
            ),
            innerRadius: m(
              "innerRadius",
              "Projectile_Clay_4_Projectile_Primary",
              "RadialDamageProjectileEffect",
              "ExplosionInnerRadius",
            ),
          },
        },
        {
          id: "cluster",
          label: "Cluster blast",
          geometry: {
            kind: "circle",
            radius: m(
              "clusterRadius",
              "Projectile_Clay_4_Projectile_Secondary",
              "RadialDamageProjectileEffect",
              "ExplosionRadius",
            ),
          },
          targets: 4,
        },
      ];
    },
    sageWall() {
      return one({
        kind: "strip",
        length: m(
          "segmentLength",
          "GameObject_Thorne_E_Wall_Fortifying",
          "self",
          "WallSegmentLength",
          0.04,
        ),
        width: m(
          "width",
          "AB_Thorne_S0_E_toppivot",
          "BodySetup_0",
          "AggGeom.BoxElems.0.X",
        ),
        centered: true,
      });
    },
    dashLength() {
      return derived(
        "maxLength",
        (raw("speed", "ForceModule_Wushu_E_Dash", "self", "BaseVelocity") *
          raw("duration", "ForceModule_Wushu_E_Dash", "self", "Duration")) /
          100,
        "base dash speed * maximum active duration / 100",
        ["speed", "duration"],
      );
    },
    contingency() {
      const pkg = "GameObject_Sequoia_4_MovingCover";
      const polygons = [];
      for (const component of [
        "FrontWallHitbox",
        "LeftWallHitbox",
        "RightWallHitbox",
      ]) {
        const x = m(`${component}.x`, pkg, component, "RelativeLocation.X"),
          y = m(`${component}.y`, pkg, component, "RelativeLocation.Y");
        const hx = m(`${component}.hx`, pkg, component, "BoxExtent.X"),
          hy = m(`${component}.hy`, pkg, component, "BoxExtent.Y");
        const yaw =
          component === "FrontWallHitbox"
            ? 0
            : m(
                `${component}.yaw`,
                pkg,
                component,
                "RelativeRotation.Yaw",
                1,
                "deg",
              );
        const radians = (yaw * Math.PI) / 180;
        polygons.push(
          [
            [-hx, -hy],
            [hx, -hy],
            [hx, hy],
            [-hx, hy],
          ].map(([px, py]) => ({
            x: x + px * Math.cos(radians) - py * Math.sin(radians),
            y: y + px * Math.sin(radians) + py * Math.cos(radians),
          })),
        );
      }
      return one({
        kind: "compound-wall",
        polygons,
        travel: m("travel", pkg, "self", "SplineTotalLength"),
      });
    },
    vipersPit() {
      return one({
        kind: "ground-volume",
        cellSize: m(
          "cellSize",
          "Patch_Pandemic_X_Circular",
          "self",
          "CellSize",
        ),
        cellCount: m(
          "cellCount",
          "Patch_Pandemic_X_Circular",
          "self",
          "MaxNumberOfCells",
          1,
          "count",
        ),
        maxVolumeConstraint: raw(
          "maxVolumeConstraint",
          "Patch_Pandemic_X_Circular",
          "GroundVolumeBuilderLineMethod_0",
          "MaximumVolumeConstraint",
        ),
        stepUp: m("stepUp", "Patch_Pandemic_X_Circular", "self", "StepUp"),
        stepDown: m(
          "stepDown",
          "Patch_Pandemic_X_Circular",
          "self",
          "StepDown",
        ),
      });
    },
  };
}

const abilities = [];
for (const profile of profiles) {
  const agent = catalog.agents[profile.slug];
  const ability = agent?.abilities.find(
    (ability) => ability.slot === profile.slot,
  );
  if (!ability) {
    failures.push(
      `${profile.slug}:${profile.slot}: missing active catalog slot`,
    );
    continue;
  }
  const q = resolver();
  try {
    const modes = profile.build(q);
    const definition = {
      id: `${agent.uuid}:${profile.slot}`,
      agentId: agent.uuid,
      agentSlug: profile.slug,
      slot: profile.slot,
      name: ability.displayName,
      icon: ability.displayIcon,
      color: `#${agent.backgroundGradientColors[0].slice(0, 6)}`,
      placement: profile.placement,
      modes,
      ...profile.configure(q),
      evidence: q.evidence,
    };
    if (
      profile.slug === "killjoy" &&
      ["Ability1", "Ability2"].includes(profile.slot)
    )
      definition.ownerActivationRadius = q.m(
        "ownerActivationRadius",
        profile.slot === "Ability1"
          ? "Pawn_Killjoy_Q_StealthAlarmbot"
          : "Pawn_Killjoy_E_Turret",
        "Comp_GameObject_DisableOwnerDistance",
        "MaxDistanceBeforeDisable",
      );
    abilities.push(definition);
  } catch (error) {
    failures.push(
      `${profile.slug}:${profile.slot} (${ability.displayName}): ${error.message}`,
    );
  }
}
const maps = [];
for (const api of mapsSource.filter(
  (map) =>
    map.xMultiplier &&
    map.yMultiplier &&
    map.displayIcon &&
    map.callouts?.length,
)) {
  const match = Object.entries(catalog.maps).find(
    ([, entry]) => entry.uuid === api.uuid,
  );
  if (!match) continue;
  const [mapId] = match;
  const radarSource = radarSources.maps.find((row) => row.mapId === mapId);
  if (!radarSource)
    throw new Error(`Missing native radar texture binding: ${mapId}`);
  const radar = radarSource.radar;
  if (!radar.startsWith("/") || radar.includes(".."))
    throw new Error(`Invalid local radar path: ${mapId}`);
  const radarBytes = await readFile(path.join(root, "public", radar));
  if (
    createHash("sha256").update(radarBytes).digest("hex") !==
    radarSource.radarSha256
  )
    throw new Error(`Radar asset hash changed: ${mapId}`);
  const dimensions = await sharp(radarBytes).metadata();
  if (
    dimensions.width !== radarSource.width ||
    dimensions.height !== radarSource.height
  )
    throw new Error(`Radar frame dimensions changed: ${mapId}`);
  const gameMapPath = api.mapUrl.replace(/^\/Game\//, "ShooterGame/Content/");
  const candidates = [
    `${gameMapPath}.umap.json`,
    `${gameMapPath}_Gameplay.umap.json`,
  ];
  let scene, camera, capture, sceneFile;
  for (const candidate of candidates) {
    try {
      const objects = JSON.parse(
        await readFile(path.join(input, "raw", candidate), "utf8"),
      );
      camera = objects.find((object) => object.Type === "AresMinimapCamera");
      if (!camera) continue;
      const rootName = camera.Properties.RootComponent.ObjectName.match(
        /'([^']+)'$/,
      )[1]
        .split(".")
        .at(-1);
      scene = objects.find(
        (object) =>
          object.Name === rootName &&
          object.Outer?.ObjectName?.includes(camera.Name),
      );
      capture = objects.find(
        (object) =>
          object.Type === "SceneCaptureComponent2D" &&
          object.Outer?.ObjectName?.includes(camera.Name),
      );
      if (scene && capture) {
        sceneFile = candidate;
        break;
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  if (!scene || !capture)
    throw new Error(`Missing authored radar camera for ${mapId}`);
  const location = scene.Properties.RelativeLocation;
  const { Pitch, Yaw, Roll } = scene.Properties.RelativeRotation;
  const p = (Pitch * Math.PI) / 180,
    y = (Yaw * Math.PI) / 180,
    r = (Roll * Math.PI) / 180;
  const width = capture.Properties.OrthoWidth;
  const right = [
    Math.sin(r) * Math.sin(p) * Math.cos(y) - Math.cos(r) * Math.sin(y),
    Math.sin(r) * Math.sin(p) * Math.sin(y) + Math.cos(r) * Math.cos(y),
  ];
  const up = [
    -(Math.cos(r) * Math.sin(p) * Math.cos(y) + Math.sin(r) * Math.sin(y)),
    Math.cos(y) * Math.sin(r) - Math.cos(r) * Math.sin(p) * Math.sin(y),
  ];
  const a = right[0] / width,
    b = right[1] / width,
    c = -up[0] / width,
    d = -up[1] / width;
  const tx = 0.5 - a * location.X - b * location.Y,
    ty = 0.5 - c * location.X - d * location.Y;
  maps.push({
    mapId,
    mapUuid: api.uuid,
    gameBuild,
    manifestId: report.manifest,
    radar,
    radarSha256: radarSource.radarSha256,
    radarWidth: dimensions.width,
    radarHeight: dimensions.height,
    metersWide: width / 100,
    metersHigh: width / 100,
    worldToRadar: [a, b, c, d, tx, ty],
    source: {
      package: sceneFile,
      camera: camera.Name,
      orthoWidth: width,
      location,
      rotation: { Pitch, Yaw, Roll },
      radarTexture: radarSource,
    },
    callouts: api.callouts
      .filter((callout) => callout.location)
      .map((callout) => ({
        regionName: callout.regionName,
        superRegion: callout.superRegionName ?? callout.superRegion ?? null,
        x: callout.location.x * a + callout.location.y * b + tx,
        y: callout.location.x * c + callout.location.y * d + ty,
      })),
  });
}
await mkdir(path.join(input, "normalization"), { recursive: true });
await writeFile(
  path.join(input, "normalization", "failures.json"),
  JSON.stringify(failures, null, 2),
);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  if (abilities.length !== 116 || maps.length !== 13)
    throw new Error(
      `Incomplete board coverage (${abilities.length} abilities, ${maps.length} maps).`,
    );
  const content = { gameBuild, manifestId: report.manifest, maps, abilities };
  const dataVersion = createHash("sha256")
    .update(JSON.stringify(content))
    .digest("hex")
    .slice(0, 16);
  const output = { schemaVersion: 1, dataVersion, ...content };
  const candidatePath = path.join(input, "normalization", "board-data.json");
  await writeFile(candidatePath, JSON.stringify(output, null, 2) + "\n");
  let previous;
  try {
    previous = JSON.parse(
      await readFile("lib/generated/board-data.json", "utf8"),
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const changes = [];
  for (const group of ["abilities", "maps"]) {
    const key = group === "maps" ? "mapId" : "id";
    const old = new Map(
      (previous?.[group] ?? []).map((row) => [row[key], row]),
    );
    for (const row of output[group]) {
      if (JSON.stringify(old.get(row[key])) !== JSON.stringify(row))
        changes.push({
          group,
          id: row[key],
          before: old.get(row[key]) ?? null,
          after: row,
        });
      old.delete(row[key]);
    }
    for (const [id, row] of old)
      changes.push({ group, id, before: row, after: null });
  }
  await writeFile(
    path.join(input, "normalization", "changes.json"),
    JSON.stringify(
      { from: previous?.dataVersion, to: output.dataVersion, changes },
      null,
      2,
    ),
  );
  if (process.argv.includes("--write")) {
    const verificationPath = process.argv
      .find((arg) => arg.startsWith("--verification="))
      ?.slice(15);
    const evidence = verificationPath
      ? JSON.parse(await readFile(verificationPath, "utf8"))
      : null;
    const verificationFailures = verifyRelease(output, evidence);
    await writeFile(
      path.join(input, "normalization", "verification-failures.json"),
      JSON.stringify(verificationFailures, null, 2),
    );
    if (verificationFailures.length)
      throw new Error(
        `Candidate was retained; bundled data was not replaced. ${verificationFailures.join("\n")}`,
      );
    const temporary = "lib/generated/board-data.json.pending";
    await writeFile(temporary, JSON.stringify(output, null, 2) + "\n");
    await rename(temporary, "lib/generated/board-data.json");
  }
  console.log(
    `Resolved ${abilities.length} active profiles and ${maps.length} map calibrations from ${gameBuild}; candidate: ${candidatePath}. ${changes.length} changed records.`,
  );
}
