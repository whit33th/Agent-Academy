"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { LineupSource } from "@/lib/types";
import { useOnlineStatus } from "@/lib/collection/useOnlineStatus";
import {
  getLineupVideoEmbedUrl,
  isSafeSourceUrl,
  trackerClipKey,
} from "@/lib/lineups/media";

export default function LineupVideoPlayer({
  videoUrl,
  source,
  title,
}: {
  videoUrl: string;
  source?: LineupSource;
  title: string;
}) {
  const online = useOnlineStatus();
  const knownEmbed = getLineupVideoEmbedUrl(videoUrl, source);
  const needsLookup =
    online && !knownEmbed && Boolean(trackerClipKey(videoUrl));
  const resolved = useQuery(
    api.lineups.resolveVideoEmbed,
    needsLookup ? { videoUrl } : "skip",
  );
  const embed = knownEmbed ?? resolved;
  const [failed, setFailed] = useState(false);
  if (!isSafeSourceUrl(videoUrl)) return null;
  if (needsLookup && resolved === undefined)
    return (
      <div
        className="aspect-video w-full animate-pulse bg-white/5"
        role="status"
        aria-label="Loading video guide"
      />
    );
  if (!embed || failed || !online)
    return (
      <p className="rounded-sm border border-white/10 bg-white/5 p-4 text-sm text-white/65">
        {!online
          ? "Connect to the internet to open this guide. "
          : failed
            ? "The video could not load. "
            : "This guide is available on its original site. "}
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white underline underline-offset-4 hover:text-val-red"
        >
          Open original guide
        </a>
      </p>
    );
  return (
    <iframe
      src={embed}
      title={`${title} video guide`}
      className="aspect-video w-full border-0 bg-black"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      onError={() => setFailed(true)}
    />
  );
}
