import Image from "@/components/ui/CatalogImage";
import type { GameMap } from "@/lib/types";

export function MapCardFrame() {
  return (
    <>
      <div className="map-select-frame" aria-hidden />
      <div className="map-select-bottom" aria-hidden>
        <i className="l" />
        <i className="m" />
        <i className="r" />
      </div>
    </>
  );
}

export default function MapCardVisual({
  map,
  priority = false,
}: {
  map: GameMap;
  priority?: boolean;
}) {
  return (
    <>
      <figure className="absolute inset-[var(--stroke)] overflow-hidden">
        {map.imageUrl && (
          <Image
            src={map.imageUrl}
            alt={map.name}
            fill
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            className="object-cover pointer-events-none"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            quality={95}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent pointer-events-none" />
        <div className="map-select-wash pointer-events-none" />
        <figcaption className="map-select-name pointer-events-none">
          <p>{map.name}</p>
        </figcaption>
      </figure>
      <MapCardFrame />
    </>
  );
}
