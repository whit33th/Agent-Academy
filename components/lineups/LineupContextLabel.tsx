import CatalogImage from "@/components/ui/CatalogImage";
import { findMap } from "@/lib/catalog/catalog";

interface LineupContextLabelProps {
  map?: {
    name: string;
    displayIcon?: string | null;
    imageUrl?: string | null;
  } | null;
  agent?: { name: string; displayIcon?: string | null } | null;
  compact?: boolean;
}

export default function LineupContextLabel({
  map,
  agent,
  compact = false,
}: LineupContextLabelProps) {
  if (!map && !agent) return null;

  const dimension = compact ? 22 : 40;
  const mapImage =
    map?.imageUrl || (map ? findMap(map.name)?.imageUrl : undefined);
  const mapWidth = compact ? 36 : 64;

  return (
    <div
      className={`flex shrink-0 items-center gap-2 text-white/65 ${compact ? "" : "gap-2.5"}`}
      aria-label={[map?.name, agent?.name].filter(Boolean).join(" / ")}
      role="img"
    >
      {map ? (
        <span
          className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden clip-angular-sm border border-white/15 bg-white/5 ${compact ? "h-[22px] w-9" : "h-10 w-16"}`}
          title={map.name}
        >
          {mapImage ? (
            <CatalogImage
              src={mapImage}
              alt=""
              width={mapWidth}
              height={dimension}
              className="size-full object-cover"
            />
          ) : (
            <span className="sr-only">{map.name}</span>
          )}
        </span>
      ) : null}
      {agent ? (
        <span
          className={`inline-flex shrink-0 items-center justify-center overflow-hidden clip-angular-sm border border-white/15 bg-white/5 ${compact ? "size-[22px]" : "size-10"}`}
          title={agent.name}
        >
          {agent.displayIcon ? (
            <CatalogImage
              src={agent.displayIcon}
              alt=""
              width={dimension}
              height={dimension}
              className="size-full object-cover"
            />
          ) : (
            <span className="sr-only">{agent.name}</span>
          )}
        </span>
      ) : null}
    </div>
  );
}
