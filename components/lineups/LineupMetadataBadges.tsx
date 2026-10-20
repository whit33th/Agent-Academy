import {
  EMPTY_METADATA,
  SIDE_LABELS,
  SITE_LABELS,
  type LineupMetadata,
} from "@/lib/lineups/metadata";
import { getSlotKey } from "@/lib/utils/ability";

export default function LineupMetadataBadges({
  metadata = EMPTY_METADATA,
}: {
  metadata?: LineupMetadata;
}) {
  const unclassified = Object.values(metadata).every(
    (value) => value === "unspecified",
  );
  const labels = unclassified
    ? ["Needs classification"]
    : [
        metadata.side === "unspecified"
          ? "Side not specified"
          : SIDE_LABELS[metadata.side],
        metadata.site === "unspecified"
          ? "Site not specified"
          : SITE_LABELS[metadata.site],
        metadata.abilitySlot === "unspecified"
          ? "Ability not specified"
          : getSlotKey(metadata.abilitySlot),
      ];
  return (
    <div className="pointer-events-none absolute left-2 top-2 z-10 flex max-w-[calc(100%-3.5rem)] flex-wrap gap-1 text-[9px] font-bold uppercase tracking-wider">
      {labels.map((label, index) => (
        <span
          key={index}
          className="rounded-sm border border-white/10 bg-black/80 px-1.5 py-1 text-white/80"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
