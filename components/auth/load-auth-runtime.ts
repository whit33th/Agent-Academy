"use client";

import type { ComponentType, ReactNode } from "react";
import type { ConvexReactClient } from "convex/react";

export type AuthRuntime = ComponentType<{
  children: ReactNode;
  client: ConvexReactClient;
}>;

export function loadAuthRuntime(
  native: boolean,
): Promise<{ default: AuthRuntime }> {
  return native
    ? import("./NativeAuthProvider")
    : import("./WebAuthProvider");
}
