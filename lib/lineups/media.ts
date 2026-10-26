export const MAX_LINEUP_IMAGES = 10;

export function isSafeSourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      host.includes(".") &&
      host !== "localhost" &&
      !host.endsWith(".local") &&
      !host.endsWith(".internal") &&
      !/^\d+\.\d+\.\d+\.\d+$/.test(host) &&
      !host.includes(":")
    );
  } catch {
    return false;
  }
}

function youtubeVideo(value: string): { id: string; start: number } | null {
  if (!isSafeSourceUrl(value)) return null;
  const url = new URL(value);
  const host = url.hostname.replace(/^www\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1);
  if (["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)) {
    id =
      url.pathname === "/watch"
        ? url.searchParams.get("v")
        : (/^\/(?:embed|shorts)\/([^/]+)\/?$/.exec(url.pathname)?.[1] ?? null);
  }
  if (!id || !/^[\w-]{11}$/.test(id)) return null;
  const time =
    url.searchParams.get("t") ?? url.searchParams.get("start") ?? "0";
  let start = 0;
  if (/^\d+$/.test(time)) start = Number(time);
  else {
    const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(time);
    if (match)
      start =
        Number(match[1] ?? 0) * 3600 +
        Number(match[2] ?? 0) * 60 +
        Number(match[3] ?? 0);
  }
  return {
    id,
    start: Number.isSafeInteger(start) ? Math.min(start, 86400) : 0,
  };
}

export function isYouTubeVideoUrl(value: string): boolean {
  return youtubeVideo(value) !== null;
}

export function normalizeVideoUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length > 2048 || !isSafeSourceUrl(trimmed))
    throw new Error("Use a public HTTPS video URL.");
  const video = youtubeVideo(trimmed);
  const host = new URL(trimmed).hostname.replace(/^www\./, "");
  if (
    [
      "youtube.com",
      "m.youtube.com",
      "youtu.be",
      "youtube-nocookie.com",
    ].includes(host) &&
    !video
  )
    throw new Error("Use a YouTube video link, not a channel or playlist.");
  return video
    ? `https://www.youtube.com/watch?v=${video.id}${video.start ? `&t=${video.start}` : ""}`
    : trimmed;
}

export const validateVideoUrl = normalizeVideoUrl;

export function getYouTubeEmbedUrl(value: string): string | null {
  const video = youtubeVideo(value);
  if (!video) return null;
  return `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&mute=1&playsinline=1&rel=0${video.start ? `&start=${video.start}` : ""}`;
}

export function trackerClipKey(value: string): string | null {
  if (!isSafeSourceUrl(value)) return null;
  const url = new URL(value);
  if (!["tracker.gg", "www.tracker.gg"].includes(url.hostname)) return null;
  return /^\/valorant\/guides\/clips\/[a-z0-9-]+-[a-f0-9]{8}\/?$/.test(
    url.pathname,
  )
    ? url.pathname.replace(/\/$/, "")
    : null;
}

/** Only a player URL observed on the original Tracker clip may be persisted. */
export function getTrackerEmbedUrl(
  sourceUrl: string,
  embedUrl?: string,
): string | null {
  if (!trackerClipKey(sourceUrl) || !embedUrl || !isSafeSourceUrl(embedUrl))
    return null;
  const url = new URL(embedUrl);
  if (
    url.hostname !== "iframe.videodelivery.net" ||
    !/^\/[a-f0-9]{32}\/?$/.test(url.pathname)
  )
    return null;
  // Rebuild options rather than forwarding arbitrary player parameters.
  return `https://iframe.videodelivery.net/${url.pathname.split("/")[1]}?autoplay=true&muted=true&controls=true&preload=auto`;
}

export function getLineupVideoEmbedUrl(
  videoUrl: string,
  source?: { url: string; embedUrl?: string },
): string | null {
  const youtube = getYouTubeEmbedUrl(videoUrl);
  if (youtube) return youtube;
  const clip = trackerClipKey(videoUrl);
  if (!clip || !source || clip !== trackerClipKey(source.url)) return null;
  return getTrackerEmbedUrl(source.url, source.embedUrl);
}
