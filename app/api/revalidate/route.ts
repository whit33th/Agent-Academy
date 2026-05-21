import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import crypto from "node:crypto";
import { TAGS } from "@/lib/cache-tags";

interface SanityWebhookBody {
  _type?: string;
  map?: { _ref?: string };
  agent?: { _ref?: string };
}

/**
 * Verifies HMAC SHA-256 signature in the format Sanity sends.
 * Header: `sanity-webhook-signature: t=<ts>,v1=<sig>`
 */
function isValidSignature(
  rawBody: string,
  header: string | null,
  secret: string,
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k.trim(), v?.trim() ?? ""];
    }),
  );
  const ts = parts.t;
  const sig = parts.v1;
  if (!ts || !sig) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${ts}.${rawBody}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(sig, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  const rawBody = await request.text();

  if (secret) {
    const sigHeader = request.headers.get("sanity-webhook-signature");
    if (!isValidSignature(rawBody, sigHeader, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let body: SanityWebhookBody;
  try {
    body = JSON.parse(rawBody) as SanityWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tags: string[] = [];
  switch (body._type) {
    case "map":
      tags.push(TAGS.maps);
      break;
    case "agent":
      tags.push(TAGS.agents);
      break;
    case "mapAgentMeta": {
      const mapId = body.map?._ref;
      if (mapId) {
        tags.push(TAGS.agentsByMap(mapId), TAGS.agentRefsByMap(mapId));
      } else {
        tags.push(TAGS.agents, TAGS.maps);
      }
      break;
    }
    case "screenshot": {
      const mapId = body.map?._ref;
      const agentId = body.agent?._ref;
      tags.push(TAGS.screenshotsAll);
      if (mapId) tags.push(TAGS.agentRefsByMap(mapId), TAGS.agentsByMap(mapId));
      if (mapId && agentId) tags.push(TAGS.screenshots(mapId, agentId));
      break;
    }
    default:
      return NextResponse.json({ revalidated: false, reason: "Unknown _type" });
  }

  for (const tag of tags) {
    revalidateTag(tag, { expire: 0 });
  }
  return NextResponse.json({ revalidated: true, tags });
}
