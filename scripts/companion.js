const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 23115;

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

    while (position > 0 && (size - position) < MAX_SEARCH_SIZE) {
      const bytesToRead = Math.min(CHUNK_SIZE, position);
      position -= bytesToRead;

      fs.readSync(fileDescriptor, buffer, 0, bytesToRead, position);
      const chunkStr = buffer.toString("utf8", 0, bytesToRead) + overflow;

      const lines = chunkStr.split(/\r?\n/);
      overflow = lines[0];

      for (let i = lines.length - 1; i >= 1; i--) {
        const line = lines[i];
        const match = line.match(/LogMapLoadModel: Update: \[Map Name: ([a-zA-Z0-9_]+)/i);
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
      const match = overflow.match(/LogMapLoadModel: Update: \[Map Name: ([a-zA-Z0-9_]+)/i);
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
    console.error("Error reading file:", err);
    return null;
  } finally {
    if (fileDescriptor !== undefined) {
      try {
        fs.closeSync(fileDescriptor);
      } catch (e) {}
    }
  }
}

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === "/detect-map") {
    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ activeMapSlug: null, status: "offline", error: "LOCALAPPDATA env is missing" }));
      return;
    }

    const logPath = path.join(localAppData, "VALORANT", "Saved", "Logs", "ShooterGame.log");

    if (!fs.existsSync(logPath)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ activeMapSlug: null, status: "offline", message: "Log file not found." }));
      return;
    }

    try {
      const stat = fs.statSync(logPath);
      const now = Date.now();
      const secondsSinceLastWrite = (now - stat.mtimeMs) / 1000;

      if (secondsSinceLastWrite > 45) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ activeMapSlug: null, status: "offline", message: "VALORANT is not running." }));
        return;
      }

      const lastMapLoad = findLastMapLoad(logPath);
      if (!lastMapLoad) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ activeMapSlug: null, status: "offline", message: "No map load events." }));
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

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        activeMapName: mapName,
        activeMapSlug: status === "match" ? activeMapSlug : null,
        status,
        timestamp,
        secondsSinceLastWrite,
      }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ activeMapSlug: null, status: "offline", error: err.message }));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("====================================================");
  console.log(`VALORANT Sync Companion is running on http://127.0.0.1:${PORT}`);
  console.log(`This helper allows the deployed website to sync with your game.`);
  console.log("====================================================");
  console.log(`Press Ctrl+C to stop.`);
});
