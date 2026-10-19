import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
const http = httpRouter();
const origins = new Set(["http://127.0.0.1:37491", "http://127.0.0.1:3000", "http://localhost:3000", "https://tack-tick.vercel.app"]);
const cors = (origin: string) => ({ "Access-Control-Allow-Origin": origin, Vary: "Origin", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" });
http.route({ path: "/images", method: "OPTIONS", handler: httpAction(async (_ctx, request) => {
  const origin = request.headers.get("Origin") ?? "";
  return new Response(null, { status: origins.has(origin) ? 204 : 403, headers: origins.has(origin) ? cors(origin) : {} });
}) });
http.route({ path: "/images", method: "POST", handler: httpAction(async (ctx, request) => {
  const origin = request.headers.get("Origin") ?? "";
  if (!origins.has(origin)) return new Response("Origin denied", { status: 403 });
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return reply({ error: "Sign in first" }, 401);
  const type = request.headers.get("Content-Type") ?? "";
  if (!["image/png", "image/jpeg", "image/webp"].includes(type)) return reply({ error: "Use PNG, JPEG or WebP" }, 415);
  if (Number(request.headers.get("Content-Length")) > 10 * 1024 * 1024) return reply({ error: "Maximum image size is 10 MB" }, 413);
  const blob = await request.blob();
  if (!blob.size || blob.size > 10 * 1024 * 1024) return reply({ error: "Maximum image size is 10 MB" }, 413);
  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const valid = type === "image/png" ? [137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n) : type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : new TextDecoder().decode(bytes.slice(0,4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8,12)) === "WEBP";
  if (!valid) return reply({ error: "Invalid image content" }, 415);
  const storageId = await ctx.storage.store(blob);
  try { await ctx.runMutation(internal.uploads.record, { ownerTokenIdentifier: identity.tokenIdentifier, storageId }); }
  catch (error) { await ctx.storage.delete(storageId); throw error; }
  return reply({ storageId });
}) });
export default http;
