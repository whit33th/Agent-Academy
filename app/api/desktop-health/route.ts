import { connection } from "next/server";
import { catalogVersion } from "@/lib/catalog/catalog";
export async function GET() {
  await connection();
  return Response.json(
    {
      app: "agent-academy",
      catalogVersion,
      nonce: process.env.AGENT_ACADEMY_SERVER_NONCE ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
