import { ConvexHttpClient } from "convex/browser";
export function authenticatedClient(token: string | null) {
  if (!token) throw new Error("Sign in with Google first.");
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("Cloud connection is unavailable.");
  const client = new ConvexHttpClient(url);
  client.setAuth(token);
  return client;
}
