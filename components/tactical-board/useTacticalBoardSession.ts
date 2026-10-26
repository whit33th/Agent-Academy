"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useBodyScrollLock } from "@/lib/utils/body-scroll-lock";
import { BoardController } from "@/lib/board/controller";
import { emptyBoard, getMapCalibration } from "@/lib/board/data";
import { BoardStore } from "@/lib/board/store";
import {
  encodeBoardDocument,
  loadBoardDocument,
} from "@/lib/board/serialization";
import { createBoardLink } from "@/lib/desktop/board-links";
import { audio } from "@/lib/audio";
import type { Agent, GameMap } from "@/lib/types";
export interface TacticalBoardProps {
  map: GameMap;
  allAgents: Agent[];
  initialStateStr?: string;
  onClose: () => void;
}
export function useTacticalBoardSession(props: TacticalBoardProps) {
  useBodyScrollLock(true);
  const [session] = useState(() => {
    const map = getMapCalibration(props.map._id);
    if (!map) throw new Error("Board is available on standard maps only.");
    let document = emptyBoard(map.mapId),
      error: unknown;
    try {
      document = loadBoardDocument(props.initialStateStr, map.mapId);
    } catch (caught) {
      error = caught;
    }
    const store = new BoardStore(document),
      controller = new BoardController(store, map);
    if (error) controller.reportError(error);
    return { store, controller, map };
  });
  const ui = useSyncExternalStore(
    session.controller.subscribeUi,
    session.controller.getUi,
    session.controller.getUi,
  );
  const overlayRef = useRef<HTMLDivElement>(null),
    agentStripRef = useRef<HTMLDivElement>(null),
    closeRef = useRef(props.onClose);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  useEffect(() => {
    closeRef.current = props.onClose;
  }, [props.onClose]);
  useEffect(() => {
    const surface = overlayRef.current;
    if (!surface) return;
    const disconnect = session.controller.connect(surface);
    const onKey = (event: KeyboardEvent) =>
      session.controller.keyDown(event, () => closeRef.current());
    window.addEventListener("keydown", onKey);
    return () => {
      disconnect();
      window.removeEventListener("keydown", onKey);
    };
  }, [session]);
  useEffect(() => {
    const strip = agentStripRef.current;
    if (!strip) return;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        event.preventDefault();
        strip.scrollLeft += event.deltaY;
      }
    };
    strip.addEventListener("wheel", onWheel, { passive: false });
    return () => strip.removeEventListener("wheel", onWheel);
  }, []);
  const handleShare = async () => {
    try {
      session.controller.cancel();
      const payload = encodeBoardDocument(session.store.getSnapshot());
      if (window.agentAcademy)
        await window.agentAcademy.copyBoardLink(props.map._id, payload);
      else
        await navigator.clipboard.writeText(
          createBoardLink(props.map._id, payload),
        );
      audio.playClick();
    } catch (error) {
      session.controller.reportError(error);
    }
  };
  return {
    ...session,
    ui,
    overlayRef,
    agentStripRef,
    selectedAgent,
    setSelectedAgent,
    handleShare,
  };
}
