"use client";

import { useCallback, useEffect, useState } from "react";

const PADDING = 8;

export interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function useSpotlightRect(
  targetId: string | null,
  active: boolean,
): SpotlightRect | null {
  const [rect, setRect] = useState<SpotlightRect | null>(null);

  const measure = useCallback(() => {
    if (!active || !targetId) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-onboarding="${targetId}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const box = el.getBoundingClientRect();
    setRect({
      top: box.top - PADDING,
      left: box.left - PADDING,
      width: box.width + PADDING * 2,
      height: box.height + PADDING * 2,
    });
  }, [active, targetId]);

  useEffect(() => {
    measure();
    if (!active || !targetId) return;

    const onUpdate = () => measure();
    window.addEventListener("resize", onUpdate);
    window.addEventListener("scroll", onUpdate, true);
    const t = window.setTimeout(measure, 50);
    const t2 = window.setTimeout(measure, 300);

    return () => {
      window.removeEventListener("resize", onUpdate);
      window.removeEventListener("scroll", onUpdate, true);
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [active, targetId, measure]);

  return rect;
}
