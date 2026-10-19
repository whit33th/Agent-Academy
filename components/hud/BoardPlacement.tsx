"use client";

import { createPortal } from "react-dom";
import TacticalBoardButton from "@/components/hud/TacticalBoardButton";
import { useTitlebarSlot } from "@/lib/desktop/use-titlebar-slot";
import type { GameMap } from "@/lib/types";

export default function BoardPlacement({ map, portal = false }: { map: GameMap; portal?: boolean }) {
  const target = useTitlebarSlot("titlebar-board");
  if (target) return createPortal(<TacticalBoardButton map={map} compact />, target);
  if (portal) return null;
  return <TacticalBoardButton map={map} />;
}
