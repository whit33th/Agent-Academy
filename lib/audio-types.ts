export interface SoundDef {
  url: string;
  volume?: number; // Per-sound volume multiplier (0-1+), defaults to 1
}

// Helpful utility: ensure a user-provided URL resolves to the Next.js `public/` root.
export function resolvePublicUrl(url?: string) {
  if (!url) return url;
  if (/^https?:\/\//.test(url)) return url;
  return url.startsWith("/") ? url : `/${url}`;
}
