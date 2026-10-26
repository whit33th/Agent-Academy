import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const hardware = process.argv.includes("--hardware");
const root = process.cwd(),
  output = path.resolve(
    hardware
      ? "outputs/board-performance-hardware"
      : "outputs/board-performance",
  );
await mkdir(path.join(output, "baseline"), { recursive: true });
const baselineRef = process.env.BOARD_BASELINE_REF ?? "HEAD";
for (const name of [
  "TacticalBoard.tsx",
  "useTacticalBoardSession.ts",
  "model.ts",
  "geometry.ts",
  "serialization.ts",
]) {
  await writeFile(
    path.join(output, "baseline", name),
    execFileSync("git", [
      "show",
      `${baselineRef}:components/tactical-board/${name}`,
    ]),
  );
}
for (const name of [
  "lib/data/ability-stats.ts",
  "lib/generated/valorant-wiki-abilities.ts",
  "lib/generated/valorant-wiki-abilities.json",
]) {
  await writeFile(
    path.join(output, "baseline", path.basename(name)),
    execFileSync("git", ["show", `${baselineRef}:${name}`]),
  );
}
const data = JSON.parse(
  await readFile("lib/generated/board-data.json", "utf8"),
);
const catalog = JSON.parse(
  await readFile("lib/generated/valorant-catalog.json", "utf8"),
);
const calibration = data.maps.find((map) => map.mapId === "ascent");
const spec = data.abilities.find(
  (ability) => ability.agentSlug === "killjoy" && ability.slot === "Grenade",
);
const agent = catalog.agents.killjoy;
const points = Array.from({ length: 50000 }, (_, index) => ({
  x: 0.1 + (index % 500) / 625,
  y: 0.1 + Math.floor(index / 500) / 125,
}));
const positions = Array.from({ length: 200 }, (_, index) => ({
  x: 0.08 + (index % 20) * 0.044,
  y: 0.1 + Math.floor(index / 20) * 0.04,
}));
const legacy = {
  strokes: [{ id: "ink", type: "pen", width: 2, color: "#ffffff", points }],
  placedAbilities: positions.map((point, index) => ({
    id: `ability-${index}`,
    agentName: agent.displayName,
    abilityName: spec.name,
    abilityIcon: spec.icon,
    color: spec.color,
    shape: "circle",
    radius: spec.modes[0].geometry.radius / calibration.metersWide,
    rotation: 0,
    ...point,
  })),
  placedAgents: positions.map((point, index) => ({
    id: `agent-${index}`,
    agentName: agent.displayName,
    iconUrl: agent.displayIcon,
    x: point.x,
    y: point.y + 0.45,
  })),
};
const metres = (point) => ({
  x: point.x * calibration.metersWide,
  y: point.y * calibration.metersHigh,
});
const current = {
  version: 2,
  mapId: "ascent",
  gameBuild: data.gameBuild,
  dataVersion: data.dataVersion,
  objects: [
    { ...legacy.strokes[0], kind: "stroke", points: points.map(metres) },
    ...positions.map((point, index) => ({
      id: `ability-${index}`,
      kind: "ability",
      definitionId: spec.id,
      position: metres(point),
      mode: spec.modes[0].id,
      rotation: 0,
      points: [],
    })),
    ...legacy.placedAgents.map((point, index) => ({
      id: `agent-${index}`,
      kind: "agent",
      agentId: agent.uuid,
      position: metres(point),
    })),
  ],
};
const report = {
  baselineRef,
  scene: { abilities: 200, agents: 200, inkPoints: 50000 },
  gameBuild: data.gameBuild,
  dataVersion: data.dataVersion,
  notes: [
    "Both renderers run in the same isolated browser fixture with development React and no React compiler.",
    "Only document decoding is bypassed to load the identical large scene; renderer and pointer handlers are unmodified.",
    "This measures renderer regression, not packaged production throughput.",
  ],
  runs: [],
};
const browser = await chromium.launch({
  headless: !hardware,
  ...(hardware ? { args: ["--window-position=40,40"] } : {}),
});
const gpu = await (
  await browser.newBrowserCDPSession()
).send("SystemInfo.getInfo");
report.runtime = {
  hardwareRequested: hardware,
  renderer: gpu.gpu.auxAttributes.glRenderer,
  gpuCompositing: gpu.gpu.featureStatus.gpu_compositing,
  devices: gpu.gpu.devices.map(({ deviceString, driverVersion }) => ({
    deviceString,
    driverVersion,
  })),
};
try {
  for (const implementation of process.argv.includes("--current")
    ? ["current"]
    : ["baseline", "current"]) {
    const component =
      implementation === "baseline"
        ? path.join(output, "baseline/TacticalBoard.tsx")
        : path.join(root, "components/tactical-board/TacticalBoard.tsx");
    const bundle = await build({
      stdin: {
        contents: `import React, { Profiler } from 'react'; import {createRoot} from 'react-dom/client'; import Board from ${JSON.stringify(component)}; import { getAgents, findMap } from '@/lib/catalog/catalog'; window.__boardRenderCount=0; window.__mountBoard=()=>{const node=document.createElement('div');document.body.append(node);createRoot(node).render(<Profiler id="board" onRender={()=>window.__boardRenderCount++}><Board map={findMap('ascent')} allAgents={getAgents()} initialStateStr="fixture" onClose={()=>{}} /></Profiler>);};`,
        loader: "tsx",
        resolveDir: root,
      },
      bundle: true,
      write: false,
      platform: "browser",
      format: "iife",
      banner: {
        js: 'var process={env:{NODE_ENV:"development"},browser:true};',
      },
      define: { "process.env.NODE_ENV": '"development"' },
      plugins: [
        {
          name: "perf-fixture-document",
          setup(builder) {
            builder.onResolve(
              {
                filter:
                  /^@\/lib\/(data\/ability-stats|generated\/valorant-wiki-abilities)$/,
              },
              (args) => ({
                path: path.join(
                  output,
                  "baseline",
                  path.basename(args.path) + ".ts",
                ),
              }),
            );
            builder.onLoad({ filter: /[\\/]serialization\.ts$/ }, () => ({
              contents:
                "export const loadSharedBoard=()=>window.__boardPerfFixture;export const loadBoardDocument=()=>window.__boardPerfFixture;export const encodeBoardDocument=()=>'';",
              loader: "js",
            }));
          },
        },
      ],
    });
    for (const dpr of process.argv.includes("--dpr1") ? [1] : [1, 2]) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: dpr,
        bypassCSP: true,
      });
      const page = await context.newPage();
      page.on("pageerror", (error) =>
        console.log("fixture error", error.message),
      );
      await page.goto(
        process.env.BOARD_QA_ORIGIN ?? "http://127.0.0.1:3000/ascent",
        { waitUntil: "domcontentloaded" },
      );
      const styles = await page
        .locator('link[rel="stylesheet"]')
        .evaluateAll((links) => links.map((link) => link.href));
      const htmlClass =
        (await page.locator("html").getAttribute("class")) ?? "";
      const bodyClass =
        (await page.locator("body").getAttribute("class")) ?? "";
      await page.route("**/__board-performance-fixture", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: `<!doctype html><html class="${htmlClass}"><head>${styles.map((href) => `<link rel="stylesheet" href="${href}">`).join("")}</head><body class="${bodyClass}"></body></html>`,
        }),
      );
      await page.goto(new URL("/__board-performance-fixture", page.url()).href);
      await page.evaluate(
        (scene) => {
          window.__boardPerfFixture = scene;
        },
        implementation === "baseline" ? legacy : current,
      );
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      await page.evaluate(() => window.__mountBoard());
      await page.locator("[data-tactical-board]").waitFor();
      await expect(page.locator("canvas")).toHaveCount(2);
      const selector =
        implementation === "baseline"
          ? `[title^="Killjoy — ${spec.name}"]`
          : '[data-board-token][data-board-object="ability-0"]';
      await page.locator(selector).first().waitFor();
      await page.evaluate(async () => {
        await Promise.all(
          [...document.images].map((image) => {
            image.loading = "eager";
            return image.decode().catch(() => undefined);
          }),
        );
        await document.fonts.ready;
      });
      const timing = await page.evaluate(async (selector) => {
        const frame = () =>
          new Promise((resolve, reject) => {
            const timeout = setTimeout(
              () =>
                reject(
                  new Error(
                    "Animation frames stopped; the hardware fixture requires a visible window.",
                  ),
                ),
              2000,
            );
            requestAnimationFrame(() => {
              clearTimeout(timeout);
              resolve();
            });
          });
        await frame();
        await frame();
        const idleFrames = [];
        let idlePrevious = performance.now();
        for (let i = 0; i < 30; i++) {
          await frame();
          const now = performance.now();
          idleFrames.push(now - idlePrevious);
          idlePrevious = now;
        }
        const target = document.querySelector(selector),
          surface = document.querySelector("canvas").parentElement;
        const rect = target.getBoundingClientRect(),
          x = rect.x + rect.width / 2,
          y = rect.y + rect.height / 2;
        const event = (type, px, py) =>
          new PointerEvent(type, {
            bubbles: true,
            pointerId: 1,
            button: 0,
            buttons: type === "pointerup" ? 0 : 1,
            isPrimary: true,
            clientX: px,
            clientY: py,
          });
        target.dispatchEvent(event("pointerdown", x, y));
        await frame();
        await frame();
        const before = window.__boardRenderCount;
        const handlers = [],
          frames = [],
          nextFrames = [],
          observer = new MutationObserver((records) => {
            mutations += records.length;
          });
        observer.observe(document.querySelector("[data-tactical-board]"), {
          subtree: true,
          attributes: true,
          childList: true,
        });
        let mutations = 0,
          previous = performance.now();
        for (let index = 0; index < 120; index++) {
          await frame();
          const start = performance.now();
          surface.dispatchEvent(
            event(
              "pointermove",
              x + 24 + Math.sin(index / 10) * 20,
              y + 24 + Math.cos(index / 10) * 20,
            ),
          );
          handlers.push(performance.now() - start);
          await frame();
          const end = performance.now();
          nextFrames.push(end - start);
          frames.push(end - previous);
          previous = end;
          mutations += observer.takeRecords().length;
        }
        const committedRendersDuringMove = window.__boardRenderCount - before;
        surface.dispatchEvent(event("pointerup", x + 30, y + 30));
        observer.disconnect();
        const percentile = (values, fraction) =>
          [...values].sort((a, b) => a - b)[
            Math.floor((values.length - 1) * fraction)
          ];
        return {
          handlerMedianMs: percentile(handlers, 0.5),
          handlerP95Ms: percentile(handlers, 0.95),
          idleFrameMedianMs: percentile(idleFrames, 0.5),
          idleFrameP95Ms: percentile(idleFrames, 0.95),
          nextFrameMedianMs: percentile(nextFrames, 0.5),
          nextFrameP95Ms: percentile(nextFrames, 0.95),
          twoFramesMedianMs: percentile(frames, 0.5),
          twoFramesP95Ms: percentile(frames, 0.95),
          committedRendersDuringMove,
          domMutationsDuringMove: mutations,
          samples: handlers.length,
        };
      }, selector);
      report.runs.push({ implementation, dpr, ...timing });
      console.log(JSON.stringify(report.runs.at(-1)));
      await page.screenshot({
        path: path.join(output, `${implementation}-${dpr}.png`),
      });
      await context.close();
    }
  }
} finally {
  await writeFile(
    path.join(output, "report.json"),
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
