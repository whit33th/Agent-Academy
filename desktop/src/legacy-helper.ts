import { readFile, copyFile, mkdir, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
const execute = promisify(execFile);
const knownHash = "25baa3ac1f774c7350b6f0ba3995919318b736faa0e677d3e1deeb746ba22942";
const normalize = (value: string) => value.replace(/^\uFEFF/, "").replaceAll("\r\n", "\n").trim();
export async function retireLegacyHelper(userData: string) {
  if (process.platform !== "win32" || !process.env.USERPROFILE || !process.env.APPDATA) return;
  const script = path.join(process.env.USERPROFILE, "VALORANT-Sync/companion.ps1");
  const startup = path.join(process.env.APPDATA, "Microsoft/Windows/Start Menu/Programs/Startup/valorant-sync.vbs");
  try {
    const contents = normalize(await readFile(script, "utf8"));
    if (createHash("sha256").update(contents).digest("hex") !== knownHash) return;
    const launcher = normalize(await readFile(startup, "utf8"));
    const expected = `Set WshShell = CreateObject("WScript.Shell")\nWshShell.Run "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File ""${script}""", 0, false`;
    if (launcher !== expected) return;
    const backup = path.join(userData, "legacy-helper-backup");
    await mkdir(backup, { recursive: true });
    await copyFile(script, path.join(backup, "companion.ps1"));
    await copyFile(startup, path.join(backup, "valorant-sync.vbs"));
    // Stop only the verified script at the exact legacy path. Never use its port
    // to choose a process, and leave customized/unrecognized installations alone.
    const escapedPath = script.replaceAll("'", "''");
    const command = `$target='${escapedPath}'; Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" | Where-Object { $_.CommandLine -and ($_.CommandLine -match ('-File\\s+\"' + [regex]::Escape($target) + '\"(?:\\s|$)')) } | ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction Stop }`;
    await execute(path.join(process.env.SystemRoot ?? "C:\\Windows", "System32/WindowsPowerShell/v1.0/powershell.exe"), ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(command, "utf16le").toString("base64")], { windowsHide: true, timeout: 10000 });
    await rename(startup, startup + ".disabled");
    await rename(script, script + ".disabled");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.warn("Legacy helper was left in place; automatic ownership verification or retirement did not complete.");
  }
}
