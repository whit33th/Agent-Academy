"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAppSession } from "@/components/auth/SessionProvider";
import {
  readMemoryCache,
  subscribeCollectionCache,
  writeMemoryCache,
} from "./cache-client";

export function usePersistedValue<T>(
  key: string,
  live: T | undefined,
  privateData: boolean,
  validate: (value: unknown) => value is T,
): T | undefined {
  const { subject, cacheReady } = useAppSession();
  const memoryKey = `${privateData ? subject : "public"}:${key}`;
  const saved = useSyncExternalStore(
    subscribeCollectionCache,
    () => readMemoryCache(memoryKey),
    () => undefined,
  );
  const serialized = live === undefined ? undefined : JSON.stringify(live);
  const available = !privateData || cacheReady;

  useEffect(() => {
    if (!available) return;
    let active = true;
    const cache = window.agentAcademy?.cache;
    if (serialized !== undefined) {
      const data: unknown = JSON.parse(serialized);
      if (JSON.stringify(readMemoryCache(memoryKey)) !== serialized)
        writeMemoryCache(memoryKey, data);
      void cache
        ?.write(key, { version: 1, data }, privateData)
        .catch(() => undefined);
    } else {
      void cache
        ?.read(key, privateData)
        .then((result) => {
          if (
            !active ||
            !result ||
            typeof result !== "object" ||
            !("version" in result) ||
            result.version !== 1 ||
            !("data" in result) ||
            !validate(result.data)
          )
            return;
          writeMemoryCache(memoryKey, result.data);
        })
        .catch(() => undefined);
    }
    return () => {
      active = false;
    };
  }, [available, key, memoryKey, privateData, serialized, validate]);

  return (
    live ??
    (available && saved !== undefined && validate(saved) ? saved : undefined)
  );
}
