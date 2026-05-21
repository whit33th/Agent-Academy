const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { execFileSync, spawn } = require("child_process");

const PORT = 23115;

/**
 * Self-install: when the standalone .exe is run for the first time (from Downloads,
 * Desktop, etc.), it copies itself to %USERPROFILE%\VALORANT-Sync\valorant-sync.exe
 * and registers a hidden auto-start via a small .vbs shim in the Startup folder.
 *
 * Returns true if installation was just performed (caller should exit).
 * Returns false if already installed or running in non-compiled / non-Windows mode.
 */
function selfInstallIfNeeded() {
  if (process.platform !== "win32") return false;

  // Bun's --compile output: process.execPath ends with our exe name (case-insensitive).
  const exeName = path.basename(process.execPath).toLowerCase();
  const isCompiled =
    exeName === "valorant-sync.exe" || exeName === "valorant-sync";
  if (!isCompiled) return false;

  const userProfile = process.env.USERPROFILE;
  const appData = process.env.APPDATA;
  if (!userProfile || !appData) return false;

  const targetDir = path.join(userProfile, "VALORANT-Sync");
  const targetExe = path.join(targetDir, "valorant-sync.exe");
  const startupVbs = path.join(
    appData,
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs",
    "Startup",
    "valorant-sync.vbs",
  );

  const currentPath = process.execPath.toLowerCase();
  const installedPath = targetExe.toLowerCase();

  // Already running from the installed location → just ensure startup shim exists.
  if (currentPath === installedPath) {
    if (!fs.existsSync(startupVbs)) {
      try {
        const vbsBody = `CreateObject("WScript.Shell").Run """${targetExe.replace(/"/g, '""')}""", 0, false`;
        fs.writeFileSync(startupVbs, vbsBody, "utf8");
      } catch {
        /* ignore */
      }
    }
    return false;
  }

  // First run from external location: install + auto-start hidden.
  try {
    console.log("====================================================");
    console.log("  VALORANT Live Sync — First-time setup");
    console.log("====================================================");
    console.log("Installing to: " + targetExe);

    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(process.execPath, targetExe);

    const vbsBody = `CreateObject("WScript.Shell").Run """${targetExe.replace(/"/g, '""')}""", 0, false`;
    fs.writeFileSync(startupVbs, vbsBody, "utf8");
    console.log("Auto-start registered.");

    // Kill any older instance hogging the port (e.g. legacy node companion.js).
    try {
      execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          "Get-NetTCPConnection -LocalPort 23115 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }",
        ],
        { stdio: "ignore" },
      );
    } catch {
      /* ignore */
    }

    // Launch the installed copy hidden via the .vbs shim.
    execFileSync("wscript.exe", [startupVbs], { stdio: "ignore" });
    console.log("Sync service started in the background.");
    console.log("");
    console.log(
      "You can close this window. The service will auto-start with Windows.",
    );

    // Hold the console briefly so the user can read the message, then exit.
    const end = Date.now() + 4000;
    while (Date.now() < end) {
      // busy-wait so we don't depend on async IO behavior in the compiled binary
    }
    return true;
  } catch (err) {
    console.error(
      "Self-install failed:",
      err && err.message ? err.message : err,
    );
    return false;
  }
}

if (selfInstallIfNeeded()) {
  process.exit(0);
}

const CODENAME_TO_SLUG = {
  mainmenuv2: "menu",
  characterselectpersistentlevel: "agent-select",
  ascent: "ascent",
  bonsai: "split",
  duality: "bind",
  triad: "haven",
  port: "icebox",
  foxtrot: "breeze",
  canyon: "fracture",
  pitt: "pearl",
  pitti: "pearl",
  jam: "lotus",
  juliett: "sunset",
  infinity: "abyss",
  sargasso: "abyss",
};

const AGENT_UUID_TO_SLUG = {
  "e370fa57-4757-3604-3648-499e1f642d3f": "gekko",
  "dade69b4-4f5a-8528-247b-219e5a1facd6": "fade",
  "5f8d3a7f-467b-97f3-062c-13acf203c006": "breach",
  "cc8b64c8-4b25-4ff9-6e7f-37b4da43d235": "deadlock",
  "b444168c-4e35-8076-db47-ef9bf368f384": "tejo",
  "f94c3b30-42be-e959-889c-5aa313dba261": "raze",
  "22697a3d-45bf-8dd7-4fec-84a9e28c69d7": "chamber",
  "601dbbe7-43ce-be57-2a40-4abd24953621": "kay-o",
  "6f2a04ca-43e0-be17-7f36-b3908627744d": "skye",
  "117ed9e3-49f3-6512-3ccf-0cada7e3823b": "cypher",
  "320b2a48-4d9b-a075-30f1-1f93a9b638fa": "sova",
  "7c8a4701-4de6-9355-b254-e09bc2a34b72": "miks",
  "1e58de9c-4950-5125-93e9-a0aee9f98746": "killjoy",
  "95b78ed7-4637-86d9-7e41-71ba8c293152": "harbor",
  "efba5359-4016-a1e5-7626-b1ae76895940": "vyse",
  "707eab51-4836-f488-046a-cda6bf494859": "viper",
  "eb93336a-449b-9c1b-0a54-a891f7921d69": "phoenix",
  "92eeef5d-43b5-1d4a-8d03-b3927a09034b": "veto",
  "41fb69c1-4189-7b37-f117-bcaf1e96f1bf": "astra",
  "9f0d8ba9-4140-b941-57d3-a7ad57c6b417": "brimstone",
  "0e38b510-41a8-5780-5e8f-568b2a4f2d6c": "iso",
  "1dbf2edd-4729-0984-3115-daa5eed44993": "clove",
  "bb2a4828-46eb-8cd1-e765-15848195d751": "neon",
  "7f94d92c-4234-0a36-9646-3a87eb8b5c89": "yoru",
  "df1cb487-4902-002e-5c17-d28e83e78588": "waylay",
  "569fdd95-4d10-43ab-ca70-79becc718b46": "sage",
  "a3bfb853-43b2-7238-a4f1-ad90e9e46bcc": "reyna",
  "8e253930-4c05-31dd-1b6c-968525494517": "omen",
  "add6443a-41bd-e414-f6ad-e58d267f4e95": "jett",
};

// Log parsing helpers
function findLastMapLoad(filePath) {
  const CHUNK_SIZE = 64 * 1024;
  const MAX_SEARCH_SIZE = 5 * 1024 * 1024;

  let fileDescriptor;
  try {
    fileDescriptor = fs.openSync(filePath, "r");
    const stat = fs.fstatSync(fileDescriptor);
    const size = stat.size;
    if (size === 0) return null;

    let position = size;
    const buffer = Buffer.alloc(CHUNK_SIZE);
    let overflow = "";

    while (position > 0 && size - position < MAX_SEARCH_SIZE) {
      const bytesToRead = Math.min(CHUNK_SIZE, position);
      position -= bytesToRead;

      fs.readSync(fileDescriptor, buffer, 0, bytesToRead, position);
      const chunkStr = buffer.toString("utf8", 0, bytesToRead) + overflow;

      const lines = chunkStr.split(/\r?\n/);
      overflow = lines[0];

      for (let i = lines.length - 1; i >= 1; i--) {
        const line = lines[i];
        const match = line.match(
          /LogMapLoadModel: Update: \[Map Name: ([a-zA-Z0-9_]+)/i,
        );
        if (match) {
          const mapName = match[1];
          let timestamp = null;
          const tsMatch = line.match(/^\[([0-9.:-]+)\]/);
          if (tsMatch) {
            timestamp = tsMatch[1];
          }
          return { mapName, timestamp };
        }
      }
    }

    if (overflow) {
      const match = overflow.match(
        /LogMapLoadModel: Update: \[Map Name: ([a-zA-Z0-9_]+)/i,
      );
      if (match) {
        const mapName = match[1];
        let timestamp = null;
        const tsMatch = overflow.match(/^\[([0-9.:-]+)\]/);
        if (tsMatch) {
          timestamp = tsMatch[1];
        }
        return { mapName, timestamp };
      }
    }

    return null;
  } catch (err) {
    return null;
  } finally {
    if (fileDescriptor !== undefined) {
      try {
        fs.closeSync(fileDescriptor);
      } catch (e) {}
    }
  }
}

function findLastAgentLock(filePath) {
  const CHUNK_SIZE = 64 * 1024;
  const MAX_SEARCH_SIZE = 5 * 1024 * 1024;

  let fileDescriptor;
  try {
    fileDescriptor = fs.openSync(filePath, "r");
    const stat = fs.fstatSync(fileDescriptor);
    const size = stat.size;
    if (size === 0) return null;

    let position = size;
    const buffer = Buffer.alloc(CHUNK_SIZE);
    let overflow = "";

    while (position > 0 && size - position < MAX_SEARCH_SIZE) {
      const bytesToRead = Math.min(CHUNK_SIZE, position);
      position -= bytesToRead;

      fs.readSync(fileDescriptor, buffer, 0, bytesToRead, position);
      const chunkStr = buffer.toString("utf8", 0, bytesToRead) + overflow;

      const lines = chunkStr.split(/\r?\n/);
      overflow = lines[0];

      for (let i = lines.length - 1; i >= 1; i--) {
        const line = lines[i];
        const match = line.match(
          /Pregame_LockCharacter.*?\/lock\/([a-f0-9-]+)/i,
        );
        if (match) {
          return match[1];
        }
      }
    }

    if (overflow) {
      const match = overflow.match(
        /Pregame_LockCharacter.*?\/lock\/([a-f0-9-]+)/i,
      );
      if (match) {
        return match[1];
      }
    }

    return null;
  } catch (err) {
    return null;
  } finally {
    if (fileDescriptor !== undefined) {
      try {
        fs.closeSync(fileDescriptor);
      } catch (e) {}
    }
  }
}

// HTTPS helper inside companion
function httpsRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body });
      });
    });
    req.on("error", reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function getSlugFromMapId(mapId) {
  if (!mapId) return null;
  const parts = mapId.split("/");
  const baseName = parts[parts.length - 1].toLowerCase();
  return CODENAME_TO_SLUG[baseName] || baseName;
}

// Secure local Riot / GLZ endpoint query
async function getGameStatusFromApi(localAppData) {
  const lockfilePath = path.join(
    localAppData,
    "Riot Games",
    "Riot Client",
    "Config",
    "lockfile",
  );
  if (!fs.existsSync(lockfilePath)) {
    throw new Error("Lockfile does not exist");
  }

  const lockfileContent = fs.readFileSync(lockfilePath, "utf8");
  const [, , port, password] = lockfileContent.split(":");
  const auth = Buffer.from(`riot:${password}`).toString("base64");

  // Query local Riot Client for credentials/tokens
  const localRes = await httpsRequest({
    hostname: "127.0.0.1",
    port: parseInt(port),
    path: "/entitlements/v1/token",
    method: "GET",
    headers: { Authorization: `Basic ${auth}` },
    agent: new https.Agent({ rejectUnauthorized: false }),
  });

  if (localRes.statusCode !== 200) {
    throw new Error("Failed to get local entitlements");
  }

  const { accessToken, token, subject } = JSON.parse(localRes.body);

  // Parse region, cluster, and version from ShooterGame.log
  const logPath = path.join(
    localAppData,
    "VALORANT",
    "Saved",
    "Logs",
    "ShooterGame.log",
  );
  let cluster = "eu-1";
  let region = "eu";
  let clientVersion = "release-12.09-shipping-26-4704114"; // modern default fallback

  if (fs.existsSync(logPath)) {
    const logContent = fs.readFileSync(logPath, "utf8");
    const lines = logContent.split(/\r?\n/);

    // Scan backwards for GLZ region/cluster endpoint
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      const match = line.match(
        /https:\/\/glz-([a-z0-9-]+)\.([a-z0-9]+)\.a\.pvp\.net/i,
      );
      if (match) {
        cluster = match[1];
        region = match[2];
        break;
      }
    }

    // Scan top 500 lines for version
    for (let i = 0; i < Math.min(500, lines.length); i++) {
      const line = lines[i];
      const match = line.match(/CI server version:\s*([a-zA-Z0-9.-]+)/i);
      if (match) {
        clientVersion = match[1];
        break;
      }
    }
  }

  // Base platform info Base64 needed by Riot's secure API
  const clientPlatform = Buffer.from(
    JSON.stringify({
      platformType: "PC",
      platformOS: "Windows",
      platformOSVersion: "10.0.19042.1.256.64bit",
      platformChipset: "Unknown",
    }),
  ).toString("base64");

  const secureHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "X-Riot-Entitlements-JWT": token,
    "X-Riot-ClientPlatform": clientPlatform,
    "X-Riot-ClientVersion": clientVersion,
    "User-Agent":
      "ShooterGame/10.08.00.3129486 rriot-rso-winstore-retail Windows/10.0.19045.1.256.64bit",
  };

  // 1. Query pregame
  const pregameRes = await httpsRequest({
    hostname: `glz-${cluster}.${region}.a.pvp.net`,
    path: `/pregame/v1/players/${subject}`,
    method: "GET",
    headers: secureHeaders,
  });

  if (pregameRes.statusCode === 200) {
    const pregamePlayerData = JSON.parse(pregameRes.body);
    const matchId = pregamePlayerData.MatchID;

    // Fetch pregame match details to resolve the map before the round starts.
    const pregameMatchRes = await httpsRequest({
      hostname: `glz-${cluster}.${region}.a.pvp.net`,
      path: `/pregame/v1/matches/${matchId}`,
      method: "GET",
      headers: secureHeaders,
    });

    if (pregameMatchRes.statusCode === 200) {
      const matchDetails = JSON.parse(pregameMatchRes.body);
      const activeMapSlug = getSlugFromMapId(matchDetails.MapID);

      return {
        activeMapName: activeMapSlug
          ? activeMapSlug.charAt(0).toUpperCase() + activeMapSlug.slice(1)
          : null,
        activeMapSlug,
        activeAgentSlug: null,
        status: "pregame",
        timestamp: matchId, // stable timestamp prevents infinite loop
      };
    }
  }

  // 2. Core game fallback
  const coreGameRes = await httpsRequest({
    hostname: `glz-${cluster}.${region}.a.pvp.net`,
    path: `/core-game/v1/players/${subject}`,
    method: "GET",
    headers: secureHeaders,
  });

  if (coreGameRes.statusCode === 200) {
    const corePlayerData = JSON.parse(coreGameRes.body);
    const matchId = corePlayerData.MatchID;

    // Fetch core game match details
    const coreMatchRes = await httpsRequest({
      hostname: `glz-${cluster}.${region}.a.pvp.net`,
      path: `/core-game/v1/matches/${matchId}`,
      method: "GET",
      headers: secureHeaders,
    });

    if (coreMatchRes.statusCode === 200) {
      const matchDetails = JSON.parse(coreMatchRes.body);
      const activeMapSlug = getSlugFromMapId(matchDetails.MapID);

      const playerInfo = matchDetails.Players?.find(
        (p) => p.Subject === subject,
      );
      const characterId = playerInfo ? playerInfo.CharacterID : null;
      const activeAgentSlug = characterId
        ? AGENT_UUID_TO_SLUG[characterId.toLowerCase()] || null
        : null;

      return {
        activeMapName: activeMapSlug
          ? activeMapSlug.charAt(0).toUpperCase() + activeMapSlug.slice(1)
          : null,
        activeMapSlug,
        activeAgentSlug,
        status: "match",
        timestamp: matchId, // stable timestamp prevents infinite loop
      };
    }
  }

  // 3. Fallback to lobby state
  return {
    activeMapName: null,
    activeMapSlug: null,
    activeAgentSlug: null,
    status: "lobby",
    timestamp: "lobby",
  };
}

const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  res.setHeader("Vary", "Origin, Access-Control-Request-Private-Network");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === "/detect-map") {
    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          activeMapSlug: null,
          status: "offline",
          error: "LOCALAPPDATA env is missing",
        }),
      );
      return;
    }

    const logPath = path.join(
      localAppData,
      "VALORANT",
      "Saved",
      "Logs",
      "ShooterGame.log",
    );

    try {
      // Step A: Attempt direct secure API querying
      try {
        const apiStatus = await getGameStatusFromApi(localAppData);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(apiStatus));
        return;
      } catch (apiError) {
        // Fallback silently to classic log parsing
      }

      // Step B: Classic log parsing fallback
      if (!fs.existsSync(logPath)) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            activeMapSlug: null,
            status: "offline",
            message: "Log file not found.",
          }),
        );
        return;
      }

      const stat = fs.statSync(logPath);
      const now = Date.now();
      const secondsSinceLastWrite = (now - stat.mtimeMs) / 1000;

      if (secondsSinceLastWrite > 45) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            activeMapSlug: null,
            status: "offline",
            message: "VALORANT is not running.",
          }),
        );
        return;
      }

      const lastMapLoad = findLastMapLoad(logPath);
      if (!lastMapLoad) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            activeMapSlug: null,
            status: "offline",
            message: "No map load events.",
          }),
        );
        return;
      }

      const { mapName, timestamp } = lastMapLoad;
      const normalizedName = mapName.toLowerCase();
      const activeMapSlug = CODENAME_TO_SLUG[normalizedName] || normalizedName;

      let status = "offline";
      if (activeMapSlug === "menu") {
        status = "lobby";
      } else if (activeMapSlug === "agent-select") {
        status = "pregame";
      } else {
        status = "match";
      }

      let activeAgentSlug = null;
      if (status === "match") {
        const lastAgentUuid = findLastAgentLock(logPath);
        if (lastAgentUuid) {
          activeAgentSlug =
            AGENT_UUID_TO_SLUG[lastAgentUuid.toLowerCase()] || null;
        }
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          activeMapName: mapName,
          activeMapSlug: status === "match" ? activeMapSlug : null,
          activeAgentSlug,
          status,
          timestamp: timestamp || "fallback",
          secondsSinceLastWrite,
        }),
      );
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          activeMapSlug: null,
          status: "offline",
          error: err.message,
        }),
      );
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("====================================================");
  console.log(`VALORANT Sync Companion is running on http://127.0.0.1:${PORT}`);
  console.log(
    `This helper allows the deployed website to sync with your game.`,
  );
  console.log("====================================================");
  console.log(`Press Ctrl+C to stop.`);
});
