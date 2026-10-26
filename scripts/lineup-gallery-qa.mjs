import { build } from "esbuild";
import { _electron, chromium, expect } from "@playwright/test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import nextEnv from "@next/env";
import { PNG } from "pngjs";
const require = createRequire(import.meta.url);
const origin = process.env.QA_ORIGIN ?? "http://127.0.0.1:3000";
const output = path.resolve("outputs/lineup-gallery-qa");
await mkdir(output, { recursive: true });
const report = {
  checks: [],
  errors: [],
  screenshots: [],
  boundaries: [
    "Live public feed uses deployed development backend, guest access only.",
    "Authenticated UI flows use explicit SDK/action fixtures; real authenticated backend integration is not claimed.",
    "Partial-save fixture checks draft retention; upload cleanup is covered separately by implementation/backend tests.",
    "Offline fixture validates gallery rendering from locally supplied media; actual downloaded desktop binary-cache replay is not claimed.",
  ],
};
const png = new PNG({ width: 320, height: 180 });
png.data.fill(145);
for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;
const image = `data:image/png;base64,${PNG.sync.write(png).toString("base64")}`;
const row = {
  _id: "fixture-lineup",
  _creationTime: 1,
  title: "QA Bind Killjoy setup",
  description:
    "Stand at the fixture marker. Aim at the fixture roof. Release the ability.",
  imageUrl: image,
  images: [
    { imageUrl: image, caption: "Stand at marker" },
    { imageUrl: image, caption: "Aim at roof" },
    { imageUrl: image, caption: "Release ability" },
  ],
  coverIndex: 0,
  metadata: { abilitySlot: "Grenade", side: "def", site: "A" },
  isPublic: true,
  mapSlug: "bind",
  agentSlug: "killjoy",
  createdAt: 1,
  updatedAt: 1,
  ownerTokenIdentifier: "qa-fixture",
  videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42",
  source: {
    url: "https://example.com/qa",
    author: "Explicit QA fixture",
    checkedAt: 1792800000000,
    patch: "13.08",
    evidence: "Synthetic UI fixture only.",
    rightsBasis: "QA generated media",
    testedInGame: false,
  },
};
const fixtureBundle = await build({
  stdin: {
    resolveDir: process.cwd(),
    loader: "jsx",
    contents: `
import React,{useState} from 'react'; import {createRoot} from 'react-dom/client';
import Feed from './components/lineups/PublicLineupFeed'; import Editor from './components/lineups/LineupEditorDialog'; import Actions from './components/lineups/LineupActionsDialog';
window.qaRows=[${JSON.stringify(row)}, {...${JSON.stringify(row)},_id:"fixture-lineup-2",title:"QA second lineup"}];window.qaEvents=[];window.qaReject=false;
const agent={_id:'killjoy',name:'Killjoy',slug:{current:'killjoy'},abilities:[{slot:'Grenade',displayName:'Nanoswarm',displayIcon:null}]};const map={_id:'bind',name:'Bind'};
function Fixture(){const [mode,setMode]=useState(''); const screenshot={...window.qaRows[0],image:window.qaRows[0].imageUrl,canEdit:true,map:{name:'Bind'},agent:{name:'Killjoy'}};return <main className="p-4 text-white"><p>EXPLICIT AUTHENTICATED UI FIXTURE - SDK AND ACTIONS MOCKED</p><div className="flex gap-4 my-4"><button onClick={()=>setMode('new')}>QA Create</button><button onClick={()=>setMode('edit')}>QA Edit</button><button onClick={()=>setMode('actions')}>QA Actions</button></div><Feed/>{(mode==='edit'||mode==='new')&&<Editor agent={agent} map={map} screenshot={mode==='edit'?screenshot:undefined} onClose={()=>setMode('')}/ >}{mode==='actions'&&<Actions screenshot={screenshot} onClose={()=>setMode('')} onEdit={()=>setMode('edit')}/>}</main>};createRoot(document.getElementById('gallery-fixture')).render(<Fixture/>);
`,
  },
  bundle: true,
  write: false,
  platform: "browser",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  plugins: [
    {
      name: "gallery-fixtures",
      setup(builder) {
        const mocks = {
          session: `export const useAppSession=()=>({signedIn:true,ready:true,subject:'qa-fixture',cacheReady:true});`,
          actions: `export const useCollectionActions=()=>({forkPublicLineup:async(...args)=>{window.qaEvents.push({kind:'copy',args});return {ok:true}},uploadScreenshot:async(draft)=>{window.qaEvents.push({kind:'create',draft});return {ok:true,data:{screenshotId:'qa'}}},editScreenshot:async(id,draft)=>{window.qaEvents.push({kind:'edit',draft});return window.qaReject?{ok:false,error:'QA simulated partial upload failure'}:{ok:true}},deleteScreenshot:async(id)=>{window.qaEvents.push({kind:'delete',id});return {ok:true}}});`,
          convex: `export const useConvexAuth=()=>({isAuthenticated:true});export const usePaginatedQuery=()=>({status:'Exhausted',results:window.qaRows,loadMore(){}});`,
          persist: `export const usePersistedValue=(_key,live)=>live;`,
          connection: `export const useCollectionConnection=()=>({online:true,isWebSocketConnected:true,unavailable:false});`,
          image: `import React,{forwardRef} from 'react'; export default forwardRef(function Image({fill,priority,fetchPriority,loader,quality,unoptimized,...props},ref){return <img ref={ref} {...props} style={fill?{position:'absolute',inset:0,width:'100%',height:'100%'}:undefined}/>});`,
        };
        builder.onResolve(
          {
            filter:
              /(SessionProvider|useCollectionActions|usePersistedValue|useCollectionConnection)$|^convex\/react$|^next\/image$/,
          },
          (args) => ({
            path: args.path.includes("SessionProvider")
              ? "session"
              : args.path.includes("useCollectionActions")
                ? "actions"
                : args.path.includes("usePersistedValue")
                  ? "persist"
                  : args.path.includes("useCollectionConnection")
                    ? "connection"
                    : args.path === "convex/react"
                      ? "convex"
                      : "image",
            namespace: "fixture",
          }),
        );
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
          contents: mocks[args.path],
          loader: "jsx",
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});
async function shot(page, name) {
  await page.screenshot({
    path: path.join(output, name + ".png"),
    animations: "disabled",
  });
  report.screenshots.push(name);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}
async function live(page, runtime) {
  page.setDefaultTimeout(20000);
  const response = await page.goto(origin + "/feed", {
    waitUntil: "domcontentloaded",
  });
  report.cspPolicies ??= [];
  report.cspPolicies.push({
    runtime,
    policy: response?.headers()["content-security-policy"] ?? null,
  });
  const first = page.locator('article button[aria-label^="View "]').first();
  await expect(first).toBeVisible({ timeout: 60000 });
  report.checks.push(runtime + ": live guest feed loaded");
  const cover = page.locator("article img").first();
  await expect(cover).toBeVisible();
  await expect
    .poll(() =>
      cover.evaluate((image) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
  report.checks.push(runtime + ": bundled video cover map artwork loaded");
  await shot(page, runtime + "-real-feed");
  await page.getByRole("button", { name: "Add", exact: true }).first().click();
  await expect(page.getByRole("alert").first()).toContainText("Sign in");
  report.checks.push(runtime + ": guest copy refused");
  await first.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("Compatibility details", { exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog.getByText(/Source checked|Not tested in game|Published:/),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Play YouTube guide" }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Close lineup details" }),
  ).toHaveText("");
  await expect(dialog.getByRole("button", { name: "Next lineup" })).toHaveText(
    "",
  );
  await expect(
    dialog.getByRole("button", { name: "Previous lineup" }),
  ).toHaveText("");
  {
    await expect(dialog.locator("iframe")).toHaveAttribute(
      "src",
      /^https:\/\/www\.youtube-nocookie\.com\/embed\//,
    );
    await expect.poll(() => dialog.locator("iframe").count()).toBe(1);
    report.checks.push(runtime + ": real video uses youtube-nocookie iframe");
    report.videoPlayback ??= [];
    try {
      const player = dialog
        .frameLocator("iframe")
        .locator(".html5-video-player");
      await expect(player).toBeVisible({ timeout: 10000 });
      const error = dialog
        .frameLocator("iframe")
        .locator(".ytp-error-content-wrap");
      const unavailable = await error.isVisible().catch(() => false);
      report.videoPlayback.push({
        runtime,
        status: unavailable
          ? "playback unavailable"
          : "player rendered; playback not asserted",
        message: unavailable
          ? await error.innerText()
          : "Embedded player rendered; no gameplay or video playback claim.",
      });
    } catch {
      report.videoPlayback.push({
        runtime,
        status: "playback unavailable in QA environment",
        message:
          "YouTube iframe URL configured and allowed by Electron CSP, but embedded player did not render within 10 seconds. Original-video link remains available.",
      });
    }
  }
  await shot(page, runtime + "-real-detail");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  report.checks.push(runtime + ": Escape closes actual detail");
  const select = async (label, option) => {
    await page.getByRole("combobox", { name: label, exact: true }).click();
    await page
      .getByRole("option", { name: option, exact: typeof option === "string" })
      .click();
  };
  await select("Map filter", "Summit");
  await select("Agent filter", "Vyse");
  await select("Ability filter", /Shear/);
  await expect(page.locator("article")).toHaveCount(2);
  await expect(page.locator("article").first()).toContainText("summit");
  await expect(page.locator("article").first()).toContainText("vyse");
  await page
    .getByRole("button", { name: /View A Main choke isolation/ })
    .click();
  const summitDetails = page.getByRole("dialog");
  await expect(summitDetails).toContainText("moving wall tracks");
  await expect(summitDetails.locator("iframe")).toHaveAttribute(
    "src",
    /1bZaw2Pj4I4/,
  );
  await page.keyboard.press("Escape");
  await expect(summitDetails).toHaveCount(0);
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Ability filter" }),
  ).toHaveCount(0);
  await select("Map filter", "Corrode");
  await select("Agent filter", "Killjoy");
  await select("Ability filter", /Nanoswarm/);
  await expect(page.locator("article")).toHaveCount(3);
  await expect(page.locator("article").first()).toContainText("killjoy");
  await select("Agent filter", "Fade");
  await expect(
    page.getByRole("combobox", { name: "Ability filter" }),
  ).toContainText("All abilities");
  await select("Ability filter", /Haunt/);
  await expect(page.locator("article").first()).toContainText("Haunt");
  await expect.poll(() => page.locator("article").count()).toBeGreaterThan(0);
  expect(
    await page
      .locator("article")
      .evaluateAll((cards) =>
        cards.every((card) => card.textContent.includes("Haunt")),
      ),
  ).toBe(true);
  await shot(page, runtime + "-filtered-feed");
  await select("Agent filter", "Neon");
  await expect(page.getByText("No setups match these filters.")).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Ability filter" }),
  ).toHaveCount(0);
  await expect(page.locator("article").first()).toBeVisible();
  report.checks.push(
    runtime +
      ": live Summit Vyse additions, map/agent/ability filters, video detail, reset on agent change, empty result, clear filters",
  );
}
async function fixture(page, runtime) {
  const css = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((links) => links.map((link) => link.href));
  const route = origin + "/__lineup-gallery-fixture";
  await page.route(route, (request) =>
    request.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><head>${css.map((href) => `<link rel="stylesheet" href="${href}">`).join("")}</head><body style="background:#0f1923"><div id="gallery-fixture"></div><script>${fixtureBundle.outputFiles[0].text.replaceAll("</script", "<\\/script")}</script></body></html>`,
    }),
  );
  await page.goto(route);
  await page.getByRole("button", { name: "Add", exact: true }).first().click();
  await expect(
    page.getByRole("button", { name: "Added", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.qaEvents.at(-1).kind)).toBe("copy");
  await page
    .getByRole("button", { name: "View QA Bind Killjoy setup", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("Stand at marker", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByText("Aim at roof", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(
    dialog.getByText("Stand at marker", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "QA Bind Killjoy setup", exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Next lineup", exact: true })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "QA second lineup", exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Previous lineup", exact: true })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "QA Bind Killjoy setup", exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "View image 3", exact: true })
    .click();
  await expect(
    dialog.getByText("Release ability", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      dialog
        .locator("img")
        .evaluateAll((images) =>
          images.every((image) => image.complete && image.naturalWidth > 0),
        ),
    )
    .toBe(true);
  await page.context().setOffline(true);
  await page.keyboard.press("ArrowRight");
  await expect(
    dialog.getByText("Stand at marker", { exact: true }),
  ).toBeVisible();
  await page.context().setOffline(false);
  await shot(page, runtime + "-fixture-gallery");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "QA Edit", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Add screenshots", { exact: true }).setInputFiles({
    name: "invalid.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("invalid"),
  });
  await expect(dialog.getByRole("alert")).toContainText("PNG, JPEG or WebP");
  await dialog
    .getByLabel("Caption for image 1", { exact: true })
    .fill("Updated stand instruction");
  await dialog
    .getByRole("button", { name: "Move image 1 down", exact: true })
    .click();
  await expect(
    dialog.getByLabel("Caption for image 2", { exact: true }),
  ).toHaveValue("Updated stand instruction");
  await dialog
    .getByRole("button", { name: "Set as cover", exact: true })
    .last()
    .click();
  await page.evaluate(() => (window.qaReject = true));
  await dialog
    .getByRole("button", { name: "Save Changes", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "partial upload failure",
  );
  await expect(
    dialog.getByLabel("Caption for image 2", { exact: true }),
  ).toHaveValue("Updated stand instruction");
  await shot(page, runtime + "-fixture-editor-retained");
  await page.evaluate(() => (window.qaReject = false));
  await dialog
    .getByRole("button", { name: "Save Changes", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  const draft = await page.evaluate(() => window.qaEvents.at(-1).draft);
  expect(draft.coverIndex).toBe(2);
  expect(draft.images[1].caption).toBe("Updated stand instruction");
  await page.getByRole("button", { name: "QA Actions", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Delete Setup", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Delete setup", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => window.qaEvents.at(-1).kind)).toBe("delete");
  await page.getByRole("button", { name: "QA Create", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Title", { exact: true })
    .fill("Video-only created fixture");
  await dialog.getByRole("button", { name: /Nanoswarm/ }).click();
  await dialog.getByRole("combobox", { name: "Setup side" }).click();
  await page.getByRole("option", { name: "Defense", exact: true }).click();
  await dialog.getByRole("combobox", { name: "Setup site" }).click();
  await page.getByRole("option", { name: "A Site", exact: true }).click();
  await dialog
    .getByLabel("External video URL (optional)", { exact: true })
    .fill(row.videoUrl);
  await dialog.getByRole("button", { name: "Add Setup", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => window.qaEvents.at(-1).kind)).toBe("create");
  report.checks.push(
    runtime +
      ": fixture copy, gallery keyboard separate from lineup navigation, local media offline rendering, images loaded, invalid upload refused, captions, reorder, cover, failed-save draft retention, edit, delete confirmation, video-only create",
  );
  await page
    .getByRole("button", { name: "View QA Bind Killjoy setup", exact: true })
    .click();
  await shot(page, runtime + "-fixture-final");
  await page.keyboard.press("Escape");
}
let browser, app;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (error) =>
    report.errors.push("browser: " + error.message),
  );
  await live(page, "browser-wide");
  await fixture(page, "browser-wide");
  await page.setViewportSize({ width: 390, height: 844 });
  await live(page, "browser-narrow");
  await fixture(page, "browser-narrow");
  await browser.close();
  browser = null;
  nextEnv.loadEnvConfig(process.cwd(), true);
  const profile = await mkdtemp(path.join(os.tmpdir(), "lineup-gallery-qa-"));
  const env = {
    ...process.env,
    AGENT_ACADEMY_QA_USER_DATA: profile,
    AGENT_ACADEMY_DEV_URL: origin,
  };
  delete env.ELECTRON_RUN_AS_NODE;
  app = await _electron.launch({
    executablePath: require("electron"),
    args: [path.resolve("desktop")],
    env,
    timeout: 45000,
  });
  const desktop = await app.firstWindow();
  desktop.on("pageerror", (error) =>
    report.errors.push("electron: " + error.message),
  );
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    win.setSize(1440, 1000);
    win.show();
  });
  await live(desktop, "electron");
  await fixture(desktop, "electron");
  await app.close();
  app = null;
  report.success = true;
} catch (error) {
  report.success = false;
  report.errors.push(error.stack ?? String(error));
  console.error(error);
} finally {
  await browser?.close().catch(() => {});
  await app?.close().catch(() => {});
  await writeFile(
    path.join(output, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  if (!report.success) process.exitCode = 1;
}
