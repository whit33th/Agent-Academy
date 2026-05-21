import { NextRequest } from "next/server";

/**
 * Dynamically builds a Windows .bat installer for the PowerShell-based
 * VALORANT sync companion. The .bat downloads `companion.ps1` from the same
 * origin that served the .bat, so it always points to the current deployment.
 */
export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const psUrl = `${origin}/companion.ps1`;

  // Windows batch files prefer CRLF line endings.
  const bat = [
    "@echo off",
    "title VALORANT Sync Installer (PowerShell)",
    "echo ====================================================",
    "echo VALORANT Live Sync - PowerShell Setup",
    "echo ====================================================",
    "echo.",
    "",
    "set \"TARGET_DIR=%USERPROFILE%\\VALORANT-Sync\"",
    "if not exist \"%TARGET_DIR%\" mkdir \"%TARGET_DIR%\"",
    "",
    "echo Downloading companion script...",
    `powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -UseBasicParsing -Uri '${psUrl}' -OutFile '%TARGET_DIR%\\companion.ps1'"`,
    "if errorlevel 1 (",
    "    echo [ERROR] Failed to download companion script.",
    "    pause",
    "    exit /b 1",
    ")",
    "echo Companion script saved to: %TARGET_DIR%\\companion.ps1",
    "",
    "echo Writing hidden launcher (VBS)...",
    "set \"STARTUP_VBS=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\valorant-sync.vbs\"",
    "> \"%STARTUP_VBS%\" (",
    "    echo Set WshShell = CreateObject(\"WScript.Shell\"^)",
    "    echo WshShell.Run \"powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \"\"%TARGET_DIR%\\companion.ps1\"\"\", 0, false",
    ")",
    "",
    "echo Stopping any previous sync service...",
    "powershell -NoProfile -ExecutionPolicy Bypass -Command \"Get-NetTCPConnection -LocalPort 23115 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }\"",
    "",
    "echo Launching sync service...",
    "wscript.exe \"%STARTUP_VBS%\"",
    "",
    "echo.",
    "echo Verifying that the sync service is listening on port 23115...",
    "timeout /t 3 /nobreak >nul",
    "powershell -NoProfile -ExecutionPolicy Bypass -Command \"if (Get-NetTCPConnection -LocalPort 23115 -State Listen -ErrorAction SilentlyContinue) { Write-Host '[OK] Sync service is running.' -ForegroundColor Green } else { Write-Host '[FAIL] Sync service is NOT running. Try running the .vbs manually:' -ForegroundColor Red; Write-Host ('  ' + $env:APPDATA + '\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\valorant-sync.vbs') -ForegroundColor Yellow }\"",
    "",
    "echo.",
    "echo ====================================================",
    "echo Setup finished. The helper will auto-start with Windows.",
    "echo ====================================================",
    "pause",
    "",
  ].join("\r\n");

  return new Response(bat, {
    headers: {
      "Content-Type": "application/x-bat; charset=utf-8",
      "Content-Disposition": 'attachment; filename="install-sync-ps.bat"',
      "Cache-Control": "no-store",
    },
  });
}
