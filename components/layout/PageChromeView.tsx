"use client";

import type { ReactNode } from "react";
import BoardPlacement from "@/components/hud/BoardPlacement";
import BackLink from "@/components/layout/BackLink";
import HomeHeaderNav from "@/components/layout/HomeHeaderNav";
import { useDesktopRuntime } from "@/lib/desktop/use-desktop-runtime";
import type { GameMap } from "@/lib/types";

export default function PageChromeView({
  desktop,
  map,
  children,
}: {
  desktop: boolean;
  map?: GameMap;
  children: ReactNode;
}) {
  const runtime = useDesktopRuntime(desktop);
  if (runtime) return map ? <BoardPlacement map={map} portal /> : null;
  return (
    <header className="mb-4 flex h-9 items-center gap-3">
      {map ? <BackLink /> : null}
      <nav aria-label={map ? "Map controls" : "Site controls"} className="ml-auto flex min-w-0 items-center gap-3">
        {map ? <BoardPlacement map={map} /> : <HomeHeaderNav />}
        {children}
      </nav>
    </header>
  );
}
