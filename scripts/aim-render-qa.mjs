import { chromium, expect } from "@playwright/test";
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const output = path.resolve("outputs/aim-render-qa");
await mkdir(output, { recursive: true });
const origin =
  process.argv.find((arg) => arg.startsWith("--origin="))?.slice(9) ??
  "http://127.0.0.1:3000";
const bundle = await build({
  stdin: {
    contents: `export { AimScene } from "./components/aim/scene"; export { createRange, shoot } from "./lib/aim/range"; export { DEFAULT_AIM_SETTINGS } from "./lib/aim/settings";`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "iife",
  globalName: "AimRendererQA",
  alias: { "@": process.cwd() },
});
const report = { checks: [], errors: [], assetRequests: 0 };
const styles = await readFile("components/aim/aim.css", "utf8");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1.5,
  });
  page.on("pageerror", (error) => report.errors.push(error.message));
  await page.route("**/aim/targets/**", async (route) => {
    report.assetRequests++;
    await setTimeout(120);
    await route.continue();
  });
  await page.setContent(
    `<base href="${origin}"><style>${styles}body{margin:0;background:#bac8d0}#field{width:1920px;height:1080px}#field .aim-stage{position:relative;width:100%;height:100%}</style><div id="field" class="aim-range" data-phase="running"><div class="aim-stage"><canvas></canvas></div></div>`,
  );
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.evaluate(async () => {
    const { AimScene, createRange, DEFAULT_AIM_SETTINGS } =
      window.AimRendererQA;
    const scene = new AimScene(document.querySelector("canvas"));
    const state = createRange(DEFAULT_AIM_SETTINGS);
    state.balls[0].yaw = state.balls[0].pitch = 0;
    scene.resize(1920, 1080);
    window.fixture = { scene, state };
    await scene.ready;
    scene.render(state, 3);
  });
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".aim-target")]
      .filter((img) => getComputedStyle(img).display !== "none")
      .some((img) => img.complete && img.naturalWidth),
  );
  const swaps = await page.evaluate(() => {
    const { scene, state } = window.fixture,
      { shoot, DEFAULT_AIM_SETTINGS } = window.AimRendererQA;
    const failures = [];
    for (let index = 0; index < 40; index++) {
      const ball = state.balls[0];
      state.yaw = ball.yaw;
      state.pitch = ball.pitch;
      if (!shoot(state, { ...DEFAULT_AIM_SETTINGS, diameter: 3 }))
        throw new Error("Fixture shot missed");
      scene.render(state, 3);
      const visible = [...document.querySelectorAll(".aim-target")].filter(
        (img) => getComputedStyle(img).display !== "none",
      );
      if (
        visible.length !== 1 ||
        visible.some((img) => !img.complete || !img.naturalWidth)
      )
        failures.push(index);
    }
    return { failures };
  });
  report.swaps = swaps;

  const shape = await page.evaluate(() => {
    const { scene, state } = window.fixture;
    state.yaw = state.pitch = 0;
    state.balls[0].yaw = 0;
    state.balls[0].pitch = 0;
    scene.render(state, 3);
    const matrix = () =>
      new DOMMatrix(
        getComputedStyle(
          [...document.querySelectorAll(".aim-target")].find(
            (img) => getComputedStyle(img).display !== "none",
          ),
        ).transform,
      );
    const center = matrix();
    state.balls[0].yaw = 48;
    scene.render(state, 3);
    const edge = matrix();
    const axes = (m) => ({ x: Math.hypot(m.a, m.b), y: Math.hypot(m.c, m.d) });
    return { center: axes(center), edge: axes(edge) };
  });
  report.shape = shape;
  expect(
    swaps.failures,
    "No respawn may expose a pending/undecoded image",
  ).toEqual([]);
  report.checks.push(
    "40 immediate respawns show only fully prepared images despite delayed asset requests",
  );
  expect(
    shape.edge.x / shape.edge.y,
    "Artwork must retain its proportions near the edge",
  ).toBeCloseTo(1, 6);
  report.checks.push(
    "sprite preserves its aspect ratio at 48 degrees from screen center",
  );
  const first = await page.screenshot({ path: path.join(output, "edge.png") });
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 0;
        const frame = () => {
          if (++frames < 5) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      }),
  );
  const settled = await page.screenshot({
    path: path.join(output, "settled.png"),
  });
  const a = PNG.sync.read(first),
    b = PNG.sync.read(settled);
  report.changedPixels = pixelmatch(a.data, b.data, null, a.width, a.height, {
    threshold: 0,
    includeAA: true,
  });
  expect(report.changedPixels).toBe(0);
  report.checks.push(
    "rendered pixels remain unchanged after five further frames; no delayed sharpening in this capture",
  );
  expect(report.assetRequests).toBe(4);
  report.checks.push(
    "only four asset requests; no image requests during respawns",
  );
  expect(report.errors).toEqual([]);
} catch (error) {
  report.failure = error.stack ?? String(error);
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(
    path.join(output, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
}
