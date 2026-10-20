import { build } from "esbuild";
import { expect } from "@playwright/test";
import { PNG } from "pngjs";
import { readFile } from "node:fs/promises";

const catalog = JSON.parse(
  await readFile("lib/generated/valorant-catalog.json", "utf8"),
);

// Render the production components with an explicit SDK substitute. This tests
// profile UI states without granting a Clerk session or changing a real account.
const fixtureBundle = build({
  stdin: {
    resolveDir: process.cwd(),
    loader: "jsx",
    contents: `
      import React, { useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import AccountButton from './components/auth/AccountButton';
      import { FixtureContext } from './components/auth/SessionProvider';
      function Fixture() {
        const [profile, setProfile] = useState({firstName: 'Alex', lastName: 'Player', imageUrl: ${JSON.stringify(catalog.agents.sova.displayIcon)}, hasImage: true});
        const [signedIn, setSignedIn] = useState(true);
        const session = {
          ...profile, signedIn, ready: true, subject: 'qa-profile-fixture',
          name: [profile.firstName, profile.lastName].join(' '), email: 'alex@example.test',
          async updateProfile(next) {
            if (next.firstName === 'Reject') throw new Error('Profile update rejected. Try again.');
            setProfile(current => ({...current, ...next}));
          },
          async setProfileImage(file) {
            setProfile(current => ({...current, imageUrl: file ? URL.createObjectURL(file) : '', hasImage: !!file}));
          },
          async signOut() { setSignedIn(false); },
        };
        return <FixtureContext.Provider value={session}><AccountButton /></FixtureContext.Provider>;
      }
      createRoot(document.getElementById('profile-fixture')).render(<Fixture />);
    `,
  },
  bundle: true,
  write: false,
  platform: "browser",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  plugins: [
    {
      name: "fixture-session",
      setup(builder) {
        builder.onResolve({ filter: /(^|\/)SessionProvider$/ }, () => ({
          path: "session",
          namespace: "fixture",
        }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: `import { createContext, useContext } from 'react'; export const FixtureContext = createContext(null); export const useAppSession = () => useContext(FixtureContext);`,
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});

export async function checkAccountProfile(page, capture, scale) {
  const classes = await page.evaluate(() => ({
    html: document.documentElement.className,
    body: document.body.className,
  }));
  const css = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((links) => links.map((link) => link.href));
  const { outputFiles } = await fixtureBundle;
  const route = new URL("/__account-profile-fixture", page.url()).href;
  const html = `<!doctype html><html class="${classes.html}"><head><title>Account profile fixture</title>${css.map((href) => `<link rel="stylesheet" href="${href}">`).join("")}</head><body class="${classes.body}"><div id="profile-fixture"></div><script>${outputFiles[0].text.replaceAll("</script", "<\\/script")}</script></body></html>`;
  await page.route(route, (request) =>
    request.fulfill({ contentType: "text/html", body: html }),
  );
  await page.goto(route);
  await page.getByTitle("Account", { exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Your account",
    exact: true,
  });
  await expect(dialog.getByText("alex@example.test")).toBeVisible();
  await expect(dialog.getByAltText("Alex Player's avatar")).toBeVisible();
  await capture(page, `account-profile-${scale}`);
  await dialog.getByLabel("First name", { exact: true }).fill("Reject");
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Profile update rejected",
  );
  await expect(dialog.getByLabel("First name", { exact: true })).toHaveValue(
    "Reject",
  );
  await dialog.getByLabel("First name", { exact: true }).fill("Sam");
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toContainText("Saved");
  await expect(dialog.getByText("Sam Player", { exact: true })).toBeVisible();
  const file = dialog.getByLabel("Profile photo", { exact: true });
  await file.setInputFiles({
    name: "invalid.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("invalid"),
  });
  await expect(dialog.getByRole("alert")).toContainText("PNG, JPEG or WebP");
  const image = new PNG({ width: 80, height: 80 });
  image.data.fill(255);
  await file.setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: PNG.sync.write(image),
  });
  await expect(dialog.getByRole("status")).toContainText("Saved");
  await expect(dialog.getByAltText("Sam Player's avatar")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await dialog
    .getByRole("button", { name: "Remove photo", exact: true })
    .click();
  await expect(dialog.getByRole("img")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await page.unroute(route);
}
