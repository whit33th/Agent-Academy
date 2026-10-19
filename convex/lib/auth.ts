import type { QueryCtx, MutationCtx } from "./types";

export type AuthTokenIdentifier = string;

export async function getViewerTokenIdentifier(
  ctx: QueryCtx | MutationCtx,
): Promise<AuthTokenIdentifier | null> {
  // This requires an auth provider in Convex deployment.
  // Until then, unauthenticated viewers are treated as guests.
  const id = await ctx.auth.getUserIdentity();
  return id?.tokenIdentifier ?? null;
}

export async function requireViewerTokenIdentifier(
  ctx: MutationCtx,
): Promise<AuthTokenIdentifier> {
  const tokenIdentifier = await getViewerTokenIdentifier(ctx);
  if (!tokenIdentifier) {
    throw new Error("Unauthorized");
  }
  return tokenIdentifier;
}

