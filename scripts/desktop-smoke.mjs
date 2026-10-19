import { _electron } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const executablePath = path.resolve(process.argv[2] ?? 'release/win-unpacked/Agent Academy.exe');
const app = await _electron.launch({ executablePath, args: ['--force-device-scale-factor=1'], timeout: 60000 });
try {
  const page = await app.firstWindow();
  await page.waitForFunction(() => window.agentAcademy?.version === 1);
  const result = await app.evaluate(({ app, BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    const preferences = window.webContents.getLastWebPreferences();
    return { packaged: app.isPackaged, autostart: app.getLoginItemSettings().openAtLogin, contextIsolation: preferences.contextIsolation, sandbox: preferences.sandbox, nodeIntegration: preferences.nodeIntegration };
  });
  result.snapshot = await page.evaluate(() => window.agentAcademy.getSnapshot());
  result.rendererNodeAccess = await page.evaluate(() => typeof window.require !== 'undefined');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  result.closeHidesWindow = await app.evaluate(({ BrowserWindow }) => !BrowserWindow.getAllWindows()[0].isVisible());
  if (!result.packaged || !result.contextIsolation || !result.sandbox || result.nodeIntegration || result.rendererNodeAccess || !result.closeHidesWindow) throw new Error('Native smoke check failed');
  await mkdir('outputs', { recursive: true });
  await writeFile('outputs/desktop-smoke.json', JSON.stringify(result, null, 2));
  console.log('Packaged app, isolated renderer and close-to-tray verified.');
} finally { await app.close(); }
