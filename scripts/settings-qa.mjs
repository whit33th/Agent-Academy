import { expect } from "@playwright/test";

async function setSwitch(control, checked) {
  if ((await control.isChecked()) !== checked)
    await control.locator("..").click();
  await expect(control).toBeChecked({ checked });
}

export async function checkSettings(page, app, capture, scale) {
  const before = await page.evaluate(() =>
    window.agentAcademy.preferences.get(),
  );
  const open = () =>
    page.getByRole("button", { name: "Settings", exact: true }).click();
  await open();
  const dialog = page.getByRole("dialog", { name: "Settings", exact: true });
  const music = dialog.getByRole("switch", {
    name: "Background music",
    exact: true,
  });
  const video = dialog.getByRole("switch", { name: /^Background video/ });
  await expect(music).toBeChecked();
  await expect(video).toBeChecked();
  await capture(page, `settings-900-${scale}`);
  const range = dialog.getByRole("slider", {
    name: "Music volume",
    exact: true,
  });
  await range.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await expect(range).toHaveValue("1");
  await setSwitch(music, false);
  await setSwitch(video, false);
  await dialog
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(
    dialog.getByText("Settings saved.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("video")).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Close settings", exact: true })
    .click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await open();
  await expect(music).not.toBeChecked();
  await expect(video).not.toBeChecked();
  await expect(range).toHaveValue("1");
  await setSwitch(video, true);
  await page.keyboard.press("Escape");
  const discard = dialog.getByRole("group", {
    name: "Discard changes?",
    exact: true,
  });
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Cancel", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Close settings", exact: true })
    .click();
  await discard
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await open();
  await expect(video).not.toBeChecked();
  await dialog
    .getByRole("button", { name: "Restore defaults", exact: true })
    .click();
  await setSwitch(
    dialog.getByRole("switch", { name: "Start with Windows", exact: true }),
    before.autoStart,
  );
  await dialog
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(
    dialog.getByText("Settings saved.", { exact: true }),
  ).toBeVisible();
  await expect(music).toBeChecked();
  await expect(video).toBeChecked();
  if (scale === 1) {
    await dialog
      .getByRole("button", { name: "Check for updates", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await page.evaluate(() => window.agentAcademy.updates.get())).status,
        { timeout: 45000 },
      )
      .not.toBe("checking");
    const update = await page.evaluate(() => window.agentAcademy.updates.get());
    expect(["unpublished", "current", "available"]).toContain(update.status);
    await capture(page, "settings-update-check");
  }
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(800, 640),
  );
  await dialog.evaluate((node) => {
    node.scrollTop = 0;
  });
  await expect(
    dialog.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeInViewport();
  await capture(page, `settings-800-${scale}`);
  await dialog
    .getByRole("button", { name: "Close settings", exact: true })
    .click();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(900, 900),
  );
  expect(
    await page.evaluate(() => window.agentAcademy.preferences.get()),
  ).toEqual(before);
}

async function longPress(page, locator, dialog) {
  await locator.hover();
  await page.mouse.down();
  try {
    await expect(dialog).toBeVisible();
  } finally {
    await page.mouse.up();
  }
  await expect(dialog).toBeVisible();
}
export async function checkMapConfirmation(page, capture, scale) {
  const card = page.locator('a[href="/ascent"]:visible');
  const dialog = page.getByRole("dialog", {
    name: "Map Actions: Ascent",
    exact: true,
  });
  await longPress(page, card, dialog);
  await dialog.getByRole("button", { name: "Hide Map", exact: true }).click();
  const confirm = dialog.getByRole("group", {
    name: "Hide Ascent?",
    exact: true,
  });
  await expect(confirm).toBeVisible();
  await capture(page, `hide-map-confirmation-${scale}`);
  await confirm.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(card).toHaveCount(1);
  await dialog.getByRole("button", { name: "Hide Map", exact: true }).click();
  await confirm.getByRole("button", { name: "Hide map", exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.getByRole("button", { name: "Add Map", exact: true }).click();
  await page.getByRole("button", { name: "Add Ascent", exact: true }).click();
  await expect(card).toHaveCount(1);
}
export async function checkAgentConfirmation(page) {
  const card = page.locator('a[href="/ascent/sova"]:visible');
  const dialog = page.getByRole("dialog", {
    name: "Agent Actions: Sova",
    exact: true,
  });
  await longPress(page, card, dialog);
  await dialog
    .getByRole("button", { name: "Remove Agent from Map", exact: true })
    .click();
  const confirm = dialog.getByRole("group", {
    name: "Hide Sova?",
    exact: true,
  });
  await confirm
    .getByRole("button", { name: "Hide agent", exact: true })
    .click();
  await expect(card).toHaveCount(0);
  await page.getByRole("button", { name: "Add agent", exact: true }).click();
  await page.getByRole("button", { name: "Add Sova", exact: true }).click();
  await expect(card).toHaveCount(1);
}
