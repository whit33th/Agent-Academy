import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(
  process.argv.find((arg) => arg.startsWith("--input="))?.slice(8) ??
    "outputs/board-data-research",
);
const textures = JSON.parse(
  await readFile(path.join(root, "radar-complete/texture-report.json"), "utf8"),
);
const bindings = JSON.parse(
  await readFile(path.join(root, "radar-texture-bindings.json"), "utf8"),
);
const maps = JSON.parse(
  await readFile("lib/generated/board-data.json", "utf8"),
).maps;
const report = [];
for (const map of maps) {
  const publicFile = await readFile(path.join("public", map.radar));
  const { data: publicBytes, info } = await sharp(publicFile)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const binding = bindings.find((row) => row.mapId === map.mapId);
  if (!binding) throw new Error(`Missing native radar binding: ${map.mapId}`);
  const candidates = [];
  for (const [kind, reference] of Object.entries(binding.fields)) {
    if (!reference?.ObjectName?.startsWith("Texture2D'")) continue;
    const asset =
      reference.ObjectPath.replace(/\.\d+$/, "").replace(
        "/Game/",
        "ShooterGame/Content/",
      ) + ".uasset";
    const texture = textures.find((row) => row.asset === asset);
    if (!texture?.ok) throw new Error(`Missing decoded texture: ${asset}`);
    const bytes = await readFile(texture.destination);
    if (
      createHash("sha256").update(bytes).digest("hex") !==
      texture.rgbaSha256.toLowerCase()
    )
      throw new Error(`Changed decoded texture: ${asset}`);
    if (texture.width !== info.width || texture.height !== info.height)
      throw new Error(`Different radar frame dimensions: ${map.mapId}`);
    let intersection = 0,
      union = 0,
      error = 0;
    for (let i = 0; i < publicBytes.length; i += 4) {
      const a = publicBytes[i + 3] > 127,
        b = bytes[i + 3] > 127;
      intersection += a && b ? 1 : 0;
      union += a || b ? 1 : 0;
      for (let channel = 0; channel < 3; channel++) {
        const delta =
          (publicBytes[i + channel] * publicBytes[i + 3]) / 255 -
          (bytes[i + channel] * bytes[i + 3]) / 255;
        error += delta * delta;
      }
      const alpha = publicBytes[i + 3] - bytes[i + 3];
      error += alpha * alpha;
    }
    candidates.push({
      kind,
      asset,
      width: texture.width,
      height: texture.height,
      alphaIoU: union ? intersection / union : 1,
      premultipliedRgbaRmse: Math.sqrt(error / publicBytes.length),
      cookedSha256: texture.cookedSha256,
      rgbaSha256: texture.rgbaSha256,
    });
  }
  candidates.sort((a, b) => a.premultipliedRgbaRmse - b.premultipliedRgbaRmse);
  report.push({
    mapId: map.mapId,
    radar: map.radar,
    radarSha256: createHash("sha256").update(publicFile).digest("hex"),
    width: info.width,
    height: info.height,
    candidates,
    independentWorldControlsVerified: false,
  });
  console.log(
    `${map.mapId}: RMSE ${candidates[0]?.premultipliedRgbaRmse.toFixed(4)}, alpha overlap ${candidates[0]?.alphaIoU.toFixed(6)}`,
  );
}
await writeFile(
  path.join(root, "radar-comparison.json"),
  JSON.stringify(
    {
      scope:
        "Native/catalog texture-frame comparison; this does not certify independent world-to-radar calibration",
      maps: report,
    },
    null,
    2,
  ),
);
