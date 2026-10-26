import { ExternalLink, Play } from "lucide-react";
import { isYouTubeVideoUrl, trackerClipKey } from "@/lib/lineups/media";
import CatalogImage from "@/components/ui/CatalogImage";
import { findMap } from "@/lib/catalog/catalog";
/** Map artwork identifies the location; it is not a screenshot from the guide. */
export default function LineupVideoCover({
  map,
  videoUrl,
  priority = false,
}: {
  map: string;
  videoUrl?: string;
  priority?: boolean;
}) {
  const location = findMap(map);
  const playable = Boolean(
    videoUrl && (isYouTubeVideoUrl(videoUrl) || trackerClipKey(videoUrl)),
  );
  return (
    <span className="absolute inset-0 overflow-hidden">
      {location ? (
        <CatalogImage
          src={location.imageUrl}
          alt={`${location.name} map artwork`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={priority}
          className="object-cover opacity-45 transition-opacity group-hover:opacity-60"
        />
      ) : null}
      <span className="absolute inset-0 bg-gradient-to-t from-val-bg/90 via-val-bg/25 to-val-bg/20" />
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/90">
        <span className="grid size-11 place-items-center rounded-full border border-white/30 bg-black/35">
          {playable ? (
            <Play size={18} fill="currentColor" />
          ) : (
            <ExternalLink size={18} />
          )}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider">
          {playable ? "Video guide" : "External guide"}
        </span>
      </span>
      <span className="absolute bottom-2 left-3 text-[9px] uppercase tracking-wider text-white/50">
        {location?.name ?? map} map artwork
      </span>
    </span>
  );
}
