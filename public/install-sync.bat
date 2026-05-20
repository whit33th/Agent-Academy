@echo off
title VALORANT Sync Installer
echo ====================================================
echo VALORANT Live Sync - Automatic Setup
echo ====================================================
echo.
echo Creating local helper directories...
set "TARGET_DIR=%USERPROFILE%\VALORANT-Sync"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo.
echo Writing companion script...
(
echo const http = require('http'^);
echo const fs = require('fs'^);
echo const path = require('path'^);
echo const PORT = 23115;
echo const CODENAME_TO_SLUG = {
echo   mainmenuv2: "menu",
echo   characterselectpersistentlevel: "agent-select",
echo   ascent: "ascent",
echo   bonsai: "split",
echo   duality: "bind",
echo   triad: "haven",
echo   port: "icebox",
echo   foxtrot: "breeze",
echo   canyon: "fracture",
echo   pitt: "pearl",
echo   pitti: "pearl",
echo   jam: "lotus",
echo   juliett: "sunset",
echo   infinity: "abyss",
echo   sargasso: "abyss",
echo };
echo function findLastMapLoad(filePath^) {
echo   const CHUNK_SIZE = 64 * 1024;
echo   const MAX_SEARCH_SIZE = 5 * 1024 * 1024;
echo   let fileDescriptor;
echo   try {
echo     fileDescriptor = fs.openSync(filePath, "r"^);
echo     const stat = fs.fstatSync(fileDescriptor^);
echo     const size = stat.size;
echo     if (size === 0^) return null;
echo     let position = size;
echo     const buffer = Buffer.alloc(CHUNK_SIZE^);
echo     let overflow = "";
echo     while (position ^> 0 ^&^& (size - position^) ^< MAX_SEARCH_SIZE^) {
echo       const bytesToRead = Math.min(CHUNK_SIZE, position^);
echo       position -= bytesToRead;
echo       fs.readSync(fileDescriptor, buffer, 0, bytesToRead, position^);
echo       const chunkStr = buffer.toString("utf8", 0, bytesToRead^) + overflow;
echo       const lines = chunkStr.split(/\r?\n/^);
echo       overflow = lines[0];
echo       for (let i = lines.length - 1; i ^>= 1; i--^) {
echo         const line = lines[i];
echo         const match = line.match(/LogMapLoadModel: Update: \[Map Name: ([a-zA-Z0-9_]+)/i^);
echo         if (match^) {
echo           const mapName = match[1];
echo           let timestamp = null;
echo           const tsMatch = line.match(/^^\[([0-9.:-]+)\]/^);
echo           if (tsMatch^) {
echo             timestamp = tsMatch[1];
echo           }
echo           return { mapName, timestamp };
echo         }
echo       }
echo     }
echo     if (overflow^) {
echo       const match = overflow.match(/LogMapLoadModel: Update: \[Map Name: ([a-zA-Z0-9_]+)/i^);
echo       if (match^) {
echo         const mapName = match[1];
echo         let timestamp = null;
echo         const tsMatch = overflow.match(/^^\[([0-9.:-]+)\]/^);
echo         if (tsMatch^) {
echo           timestamp = tsMatch[1];
echo         }
echo         return { mapName, timestamp };
echo       }
echo     }
echo     return null;
echo   } catch (err^) {
echo     return null;
echo   } finally {
echo     if (fileDescriptor !== undefined^) {
echo       try { fs.closeSync(fileDescriptor^); } catch (e^) {}
echo     }
echo   }
echo }
echo const server = http.createServer((req, res^) =^> {
echo   res.setHeader("Access-Control-Allow-Origin", "*"^);
echo   res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS"^);
echo   res.setHeader("Access-Control-Allow-Headers", "Content-Type"^);
echo   if (req.method === "OPTIONS"^) {
echo     res.writeHead(200^);
echo     res.end(^);
echo     return;
echo   }
echo   if (req.url === "/detect-map"^) {
echo     const localAppData = process.env.LOCALAPPDATA;
echo     if (!localAppData^) {
echo       res.writeHead(400, { "Content-Type": "application/json" }^);
echo       res.end(JSON.stringify({ activeMapSlug: null, status: "offline", error: "LOCALAPPDATA env is missing" }^)^);
echo       return;
echo     }
echo     const logPath = path.join(localAppData, "VALORANT", "Saved", "Logs", "ShooterGame.log"^);
echo     if (!fs.existsSync(logPath^)^) {
echo       res.writeHead(200, { "Content-Type": "application/json" }^);
echo       res.end(JSON.stringify({ activeMapSlug: null, status: "offline", message: "Log file not found." }^)^);
echo       return;
echo     }
echo     try {
echo       const stat = fs.statSync(logPath^);
echo       const now = Date.now(^);
echo       const secondsSinceLastWrite = (now - stat.mtimeMs^) / 1000;
echo       if (secondsSinceLastWrite ^> 45^) {
echo         res.writeHead(200, { "Content-Type": "application/json" }^);
echo         res.end(JSON.stringify({ activeMapSlug: null, status: "offline", message: "VALORANT is not running." }^)^);
echo         return;
echo       }
echo       const lastMapLoad = findLastMapLoad(logPath^);
echo       if (!lastMapLoad^) {
echo         res.writeHead(200, { "Content-Type": "application/json" }^);
echo         res.end(JSON.stringify({ activeMapSlug: null, status: "offline", message: "No map load events." }^)^);
echo         return;
echo       }
echo       const { mapName, timestamp } = lastMapLoad;
echo       const normalizedName = mapName.toLowerCase(^);
echo       const activeMapSlug = CODENAME_TO_SLUG[normalizedName] ^| ^| normalizedName;
echo       let status = "offline";
echo       if (activeMapSlug === "menu"^) {
echo         status = "lobby";
echo       } else if (activeMapSlug === "agent-select"^) {
echo         status = "pregame";
echo       } else {
echo         status = "match";
echo       }
echo       res.writeHead(200, { "Content-Type": "application/json" }^);
echo       res.end(JSON.stringify({
echo         activeMapName: mapName,
echo         activeMapSlug: status === "match" ? activeMapSlug : null,
echo         status,
echo         timestamp,
echo         secondsSinceLastWrite,
echo       }^)^);
echo     } catch (err^) {
echo       res.writeHead(500, { "Content-Type": "application/json" }^);
echo       res.end(JSON.stringify({ activeMapSlug: null, status: "offline", error: err.message }^)^);
echo     }
echo   } else {
echo     res.writeHead(404^);
echo     res.end(^);
echo   }
echo }^);
echo server.listen(PORT, "127.0.0.1", (^) =^> {
echo   console.log("VALORANT Sync running on port " + PORT^);
echo }^);
) > "%TARGET_DIR%\companion.js"

echo.
echo Registering startup task...
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.Run "node ""%TARGET_DIR%\companion.js""", 0, false
) > "%USERPROFILE%\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\valorant-sync.vbs"

echo.
echo Launching sync service...
wscript.exe "%USERPROFILE%\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\valorant-sync.vbs"

echo.
echo ====================================================
echo Setup complete! VALORANT Live Sync is now active.
echo You can close this window.
echo ====================================================
pause
