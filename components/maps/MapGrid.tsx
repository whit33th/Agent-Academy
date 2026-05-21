"use client";

import type { GameMap } from "@/lib/types";
import { toSlug } from "@/lib/utils/normalize";
import type { ValorantMap } from "@/lib/valorant-api";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { useOptimistic, useState } from "react";
import AddMapCard from "./AddMapCard";
import AddMapModal from "./AddMapModal";
import MapActionsModal from "./MapActionsModal";
import MapCard from "./MapCard";

type Action = { type: "add"; map: GameMap } | { type: "remove"; mapId: string };

function reducer(state: GameMap[], action: Action): GameMap[] {
  switch (action.type) {
    case "add":
      return [...state, action.map];
    case "remove":
      return state.filter((m) => m._id !== action.mapId);
  }
}

function makeOptimisticMap(apiMap: ValorantMap): GameMap {
  return {
    _id: `optimistic-${Date.now()}`,
    slug: { current: toSlug(apiMap.displayName) },
    name: apiMap.displayName,
    imageUrl: apiMap.splash || apiMap.listViewIcon || null,
    listViewIcon: apiMap.listViewIcon ?? null,
    displayIcon: apiMap.displayIcon ?? null,
    stylizedBackgroundImage: apiMap.stylizedBackgroundImage ?? null,
  };
}

interface MapGridProps {
  maps: GameMap[];
  unaddedMaps: ValorantMap[];
}

export default function MapGrid({ maps, unaddedMaps }: MapGridProps) {
  const [optimisticMaps, applyOptimistic] = useOptimistic(maps, reducer);
  const [isAddOpen, setAddOpen] = useState(false);
  const [actionsTarget, setActionsTarget] = useState<GameMap | null>(null);

  return (
    <LazyMotion features={domAnimation}>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {optimisticMaps.map((map, i) => (
          <m.div
            key={map.name}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.02, duration: 0.3 }}
          >
            <MapCard
              map={map}
              onLongPress={setActionsTarget}
              priority={i < 3}
            />
          </m.div>
        ))}
        <m.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: optimisticMaps.length * 0.02, duration: 0.4 }}
        >
          <AddMapCard onClick={() => setAddOpen(true)} />
        </m.div>
      </section>

      <AddMapModal
        open={isAddOpen}
        unaddedMaps={unaddedMaps}
        onClose={() => setAddOpen(false)}
        applyOptimistic={(apiMap) =>
          applyOptimistic({ type: "add", map: makeOptimisticMap(apiMap) })
        }
      />
      <MapActionsModal
        map={actionsTarget}
        onClose={() => setActionsTarget(null)}
        applyOptimistic={(mapId) => applyOptimistic({ type: "remove", mapId })}
      />
    </LazyMotion>
  );
}
