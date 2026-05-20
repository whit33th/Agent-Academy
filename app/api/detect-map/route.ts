import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// Mapping internal codenames to map slugs used in database/URL routing
const CODENAME_TO_SLUG: Record<string, string> = {
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

/**
 * Searches the log file backwards in 64KB chunks to find the last map load event.
 * Extremely memory efficient and fast.
 */
async function findLastMapLoad(filePath: string): Promise<{ mapName: string; timestamp: string | null } | null> {
  const CHUNK_SIZE = 64 * 1024; // 64 KB chunks
  const MAX_SEARCH_SIZE = 5 * 1024 * 1024; // Limit search to last 5 MB of logs

  let fileHandle;
  try {
    fileHandle = await fs.open(filePath, "r");
    const { size } = await fileHandle.stat();
    if (size === 0) return null;

    let position = size;
    let buffer = Buffer.alloc(CHUNK_SIZE);
    let overflow = "";

    while (position > 0 && (size - position) < MAX_SEARCH_SIZE) {
      const bytesToRead = Math.min(CHUNK_SIZE, position);
      position -= bytesToRead;

      await fileHandle.read(buffer, 0, bytesToRead, position);
      const chunkStr = buffer.toString("utf8", 0, bytesToRead) + overflow;

      const lines = chunkStr.split(/\r?\n/);
      
      // The first line in the chunk could be split across boundaries. 
      // Save it for the next chunk read (which is chronologically preceding).
      overflow = lines[0];

      // Search bottom-up through the split lines of this chunk
      for (let i = lines.length - 1; i >= 1; i--) {
        const line = lines[i];
        const match = line.match(/LogMapLoadModel: Update: \[Map Name: ([a-zA-Z0-9_]+)/i);
        if (match) {
          const mapName = match[1];
          let timestamp: string | null = null;
          const tsMatch = line.match(/^\[([0-9.:-]+)\]/);
          if (tsMatch) {
            timestamp = tsMatch[1];
          }
          return { mapName, timestamp };
        }
      }
    }

    // Check the final overflow line if we reached the absolute start of the file
    if (overflow) {
      const match = overflow.match(/LogMapLoadModel: Update: \[Map Name: ([a-zA-Z0-9_]+)/i);
      if (match) {
        const mapName = match[1];
        let timestamp: string | null = null;
        const tsMatch = overflow.match(/^\[([0-9.:-]+)\]/);
        if (tsMatch) {
          timestamp = tsMatch[1];
        }
        return { mapName, timestamp };
      }
    }

    return null;
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }
}

export async function GET() {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    return NextResponse.json({
      activeMapSlug: null,
      status: "offline",
      error: "LOCALAPPDATA environment variable is not defined.",
    });
  }

  const logPath = path.join(
    localAppData,
    "VALORANT",
    "Saved",
    "Logs",
    "ShooterGame.log"
  );

  try {
    // 1. Check if the log file exists and is accessible
    try {
      await fs.access(logPath);
    } catch {
      return NextResponse.json({
        activeMapSlug: null,
        status: "offline",
        message: "VALORANT log file not found. Game has never been run or logs deleted.",
      });
    }

    // 2. Check the last modified time of the log file
    const stat = await fs.stat(logPath);
    const now = Date.now();
    const secondsSinceLastWrite = (now - stat.mtimeMs) / 1000;

    // If the log hasn't been written to in the last 45 seconds, VALORANT is likely closed or inactive.
    if (secondsSinceLastWrite > 45) {
      return NextResponse.json({
        activeMapSlug: null,
        status: "offline",
        message: "VALORANT is not currently running (log file inactive).",
      });
    }

    // 3. Scan backwards for the latest travel model load event
    const lastMapLoad = await findLastMapLoad(logPath);
    if (!lastMapLoad) {
      return NextResponse.json({
        activeMapSlug: null,
        status: "offline",
        message: "No map load events found in recent logs.",
      });
    }

    const { mapName, timestamp } = lastMapLoad;
    const normalizedName = mapName.toLowerCase();
    const activeMapSlug = CODENAME_TO_SLUG[normalizedName] || normalizedName;

    // Determine state
    let status: "offline" | "lobby" | "pregame" | "match" = "offline";
    if (activeMapSlug === "menu") {
      status = "lobby";
    } else if (activeMapSlug === "agent-select") {
      status = "pregame";
    } else {
      status = "match";
    }

    return NextResponse.json({
      activeMapName: mapName,
      activeMapSlug: status === "match" ? activeMapSlug : null,
      status,
      timestamp,
      secondsSinceLastWrite,
    });
  } catch (error: any) {
    console.error("Error reading VALORANT log file:", error);
    return NextResponse.json({
      activeMapSlug: null,
      status: "offline",
      error: error.message || "Failed to read log file.",
    });
  }
}
