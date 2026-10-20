"use client";

import { useEffect, useSyncExternalStore } from "react";
import { audio } from "@/lib/audio";
import { useAppPreferences } from "./settings/PreferencesProvider";
const subscribe = () => () => {};

export default function AmbientAudioController() {
  const { settings } = useAppPreferences();
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  useEffect(() => {
    if (hydrated) audio.configure(settings);
  }, [settings, hydrated]);
  useEffect(() => {
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
