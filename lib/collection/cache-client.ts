"use client";

const values = new Map<string, unknown>();
const listeners = new Set<() => void>();
let authorizedSubject = "";
let activeSubject: string | undefined;
let revision = 0;

export function subscribeCollectionCache(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function notify() {
  for (const listener of listeners) listener();
}
export function cacheSubjectSnapshot() {
  return authorizedSubject;
}
export function readMemoryCache(key: string) {
  return values.get(key);
}
export function writeMemoryCache(key: string, value: unknown) {
  values.set(key, value);
  notify();
}

export async function synchronizeCache(
  subject: string,
  getToken: () => Promise<string | null>,
) {
  const currentRevision = ++revision;
  const cache = window.agentAcademy?.cache;
  if (activeSubject !== subject) {
    const previousSubject = activeSubject;
    authorizedSubject = "";
    activeSubject = subject;
    values.clear();
    notify();
    if (previousSubject !== undefined || !subject)
      await cache?.authorize(null).catch(() => false);
  }
  if (!subject || !cache) return;
  try {
    const token = await getToken();
    if (currentRevision !== revision) return;
    if (!token) throw new Error("Session unavailable");
    const authorized = await cache.authorize(token);
    if (currentRevision !== revision) return;
    authorizedSubject = authorized ? subject : "";
    notify();
  } catch {
    if (currentRevision !== revision) return;
    authorizedSubject = "";
    // Lock without deleting saved data; only logout purges the private cache.
    await cache.authorize("").catch(() => false);
    notify();
  }
}

export async function clearCollectionCache() {
  revision++;
  activeSubject = "";
  authorizedSubject = "";
  values.clear();
  notify();
  await window.agentAcademy?.cache.authorize(null);
}
