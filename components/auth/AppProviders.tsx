"use client";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "@/lib/desktop/protocol";
const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const client = url ? new ConvexReactClient(url) : null;
export default function AppProviders({ children }: { children: ReactNode }) {
  const [Runtime, setRuntime] = useState<ComponentType<{ children: ReactNode; client: ConvexReactClient }> | null>(null);
  useEffect(() => {
    let active = true;
    const runtime = window.agentAcademy ? import("./NativeAuthProvider") : import("./WebAuthProvider");
    void runtime.then((module) => { if (active) setRuntime(() => module.default); });
    return () => { active = false; };
  }, []);
  if (!client) return children;
  if (!Runtime || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <ConvexProvider client={client}>{children}</ConvexProvider>;
  return <Runtime client={client}>{children}</Runtime>;
}
