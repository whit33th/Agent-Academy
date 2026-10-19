import { connection } from "next/server";
export async function GET() {
  await connection();
  return Response.json({ app: "agent-academy", nonce: process.env.AGENT_ACADEMY_SERVER_NONCE ?? null }, { headers: { "Cache-Control": "no-store" } });
}
