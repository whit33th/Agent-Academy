"use client";

import { useEffect, useSyncExternalStore } from "react";

const PADDING = 8;

export interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const cache = new Map<string, SpotlightRect | null>();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  window.addEventListener("resize", onStoreChange);
  window.addEventListener("scroll", onStoreChange, true);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("resize", onStoreChange);
    window.removeEventListener("scroll", onStoreChange, true);
  };
}

function sameRect(a: SpotlightRect | null, b: SpotlightRect | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height
  );
}

function readRect(targetId: string): SpotlightRect | null {
  const nodes = document.querySelectorAll(`[data-onboarding="${targetId}"]`);
  let el: Element | null = null;
  for (const node of nodes) {
    const box = node.getBoundingClientRect();
    if (box.width > 0 && box.height > 0) {
      el = node;
      break;
    }
  }
  const next = el
    ? (() => {
        const box = el.getBoundingClientRect();
        return {
          top: box.top - PADDING,
          left: box.left - PADDING,
          width: box.width + PADDING * 2,
          height: box.height + PADDING * 2,
        };
      })()
    : null;
  const prev = cache.get(targetId) ?? null;
  if (sameRect(prev, next)) return prev;
  cache.set(targetId, next);
  return next;
}

export function useSpotlightRect(
  targetId: string | null,
  active: boolean,
): SpotlightRect | null {
  const rect = useSyncExternalStore(
    subscribe,
    () => (active && targetId ? readRect(targetId) : null),
    () => null,
  );

  useEffect(() => {
    if (!active || !targetId) return;
    const kick = () => emit();
    kick();
    const soon = window.setTimeout(kick, 50);
    const later = window.setTimeout(kick, 300);
    return () => {
      window.clearTimeout(soon);
      window.clearTimeout(later);
    };
  }, [active, targetId]);

  return rect;
}
