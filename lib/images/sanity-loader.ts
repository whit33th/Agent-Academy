export const LINEUP_IMAGE_QUALITY = 95;

/** Sanity CDN URLs are rewritten here so the browser asks for a sharp, already-sized frame. */
export function isSanityImage(src: string): boolean {
  try {
    return new URL(src).hostname === "cdn.sanity.io";
  } catch {
    return false;
  }
}

export function sanityImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  const url = new URL(src);
  url.searchParams.set("w", String(width));
  url.searchParams.set("fit", "max");
  url.searchParams.set("auto", "format");
  url.searchParams.set("q", String(quality ?? LINEUP_IMAGE_QUALITY));
  return url.href;
}
