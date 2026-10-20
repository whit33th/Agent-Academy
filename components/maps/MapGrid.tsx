"use client";
import { useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { useAppSession } from "@/components/auth/SessionProvider";
import { usePersistedValue } from "@/lib/collection/usePersistedValue";
import type { GameMap } from "@/lib/types";
import CollectionBoundary from "@/components/collection/CollectionBoundary";
import CollectionStatus from "@/components/collection/CollectionStatus";
import AddMapCard from "./AddMapCard";
import RestoreMapDialog from "./RestoreMapDialog";
import MapSettingsDialog from "./MapSettingsDialog";
import MapCard from "./MapCard";
import { selectedMapSlugs } from "@/lib/collection/selection";
import { useGuestSelection } from "@/lib/collection/guest-selection";
type Preferences = FunctionReturnType<typeof api.maps.preferences>;
const emptyPreferences: Preferences = [];
function isPreferences(value: unknown): value is Preferences {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        row &&
        typeof row.mapSlug === "string" &&
        typeof row.hidden === "boolean",
    )
  );
}
export default function MapGrid({ maps }: { maps: GameMap[] }) {
  return (
    <CollectionBoundary
      fallback={<MapSelection maps={maps} selected={new Set()} />}
    >
      <PersonalMapSelection maps={maps} />
    </CollectionBoundary>
  );
}
function PersonalMapSelection({ maps }: { maps: GameMap[] }) {
  const { signedIn } = useAppSession();
  const guest = useGuestSelection();
  const { isAuthenticated } = useConvexAuth();
  const result = useQuery(
    api.maps.preferences,
    signedIn && isAuthenticated ? {} : "skip",
  );
  const preferences = usePersistedValue(
    "map-preferences",
    signedIn ? result : emptyPreferences,
    signedIn,
    isPreferences,
  );
  return (
    <>
      <MapSelection
        maps={maps}
        selected={selectedMapSlugs(signedIn ? (preferences ?? []) : guest.maps)}
      />
      {signedIn && <CollectionStatus />}
    </>
  );
}
function MapSelection({
  maps,
  selected,
}: {
  maps: GameMap[];
  selected: Set<string>;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [target, setTarget] = useState<GameMap | null>(null);
  const visible = maps.filter((map) => selected.has(map._id));
  const available = maps.filter((map) => !selected.has(map._id));
  return (
    <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {visible.map((map, index) => (
          <MapCard
            key={map._id}
            map={map}
            onLongPress={setTarget}
            priority={index < 4}
          />
        ))}
        {available.length > 0 && (
          <AddMapCard onClick={() => setAddOpen(true)} />
        )}
      </section>
      <RestoreMapDialog
        open={addOpen}
        unaddedMaps={available}
        onClose={() => setAddOpen(false)}
      />
      <MapSettingsDialog
        key={target?._id ?? "closed"}
        map={target}
        onClose={() => setTarget(null)}
      />
    </>
  );
}
