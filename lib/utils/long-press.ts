"use client";

import { useRef, useCallback } from "react";

interface LongPressOptions {
  /** ms before long-press fires. Default 600. */
  threshold?: number;
  /** px movement before press is cancelled. Default 10. */
  moveTolerance?: number;
  /** Vibration ms when press fires (mobile). Default 50; 0 disables. */
  vibrateMs?: number;
}

interface LongPressHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
  /**
   * Wrap a click handler so that the press's click is suppressed
   * after a long-press has fired.
   */
  handleClick: (e: React.MouseEvent) => boolean;
}

/**
 * Long-press detector. Returns pointer handlers + a click guard.
 * The click guard returns `true` when the click was caused by a long-press
 * and was therefore preventDefault/stopPropagation'd.
 */
export function useLongPress<T = void>(
  onLongPress: (payload: T) => void,
  options: LongPressOptions = {},
): (payload: T) => LongPressHandlers {
  const { threshold = 600, moveTolerance = 10, vibrateMs = 50 } = options;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    startRef.current = null;
  }, []);

  return useCallback(
    (payload: T): LongPressHandlers => ({
      onPointerDown: (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        firedRef.current = false;
        startRef.current = { x: e.clientX, y: e.clientY };

        timeoutRef.current = setTimeout(() => {
          firedRef.current = true;
          onLongPress(payload);
          if (vibrateMs > 0 && typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(vibrateMs);
          }
        }, threshold);
      },
      onPointerMove: (e) => {
        if (!startRef.current || !timeoutRef.current) return;
        const dx = e.clientX - startRef.current.x;
        const dy = e.clientY - startRef.current.y;
        if (Math.hypot(dx, dy) > moveTolerance) cancel();
      },
      onPointerUp: cancel,
      onPointerCancel: cancel,
      onPointerLeave: cancel,
      handleClick: (e) => {
        if (firedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          firedRef.current = false;
          return true;
        }
        return false;
      },
    }),
    [cancel, moveTolerance, onLongPress, threshold, vibrateMs],
  );
}
