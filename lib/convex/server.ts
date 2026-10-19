import "server-only";

import { ConvexHttpClient } from "convex/browser";

function getConvexUrl(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  }
  return url;
}

let client: ConvexHttpClient | null = null;

export function getConvexHttpClient(): ConvexHttpClient {
  if (!client) {
    client = new ConvexHttpClient(getConvexUrl());
  }
  return client;
}

