"use client";

import { useEffect } from "react";
import { audio } from "@/lib/audio";

export default function GlobalAmbientInit() {
  useEffect(() => {
    audio.init();
    const tryAmbient = () => {
      audio.ensureAmbient();
      window.removeEventListener("pointerdown", tryAmbient);
      window.removeEventListener("click", tryAmbient);
    };

    window.addEventListener("pointerdown", tryAmbient, { once: true });
    window.addEventListener("click", tryAmbient, { once: true });

    return () => {
      window.removeEventListener("pointerdown", tryAmbient);
      window.removeEventListener("click", tryAmbient);
    };
  }, []);

  return null;
}
