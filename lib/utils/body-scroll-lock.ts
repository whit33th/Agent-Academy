"use client";

import { useEffect } from "react";
let locks = 0;
let originalOverflow = "";

/** Locks `document.body` scroll while `locked` is true. */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    if (locks++ === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    return () => {
      if (--locks === 0) document.body.style.overflow = originalOverflow;
    };
  }, [locked]);
}
