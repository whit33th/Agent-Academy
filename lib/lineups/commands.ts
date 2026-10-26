import type { MapSlug, AgentSlug } from "../catalog/lineup-options";
import type { LineupMetadata } from "./metadata";

import type { Id } from "@/convex/_generated/dataModel";

export interface LineupDraftImage {
  file?: File;
  storageId?: Id<"_storage">;
  imageUrl?: string;
  imageAssetId?: string;
  caption: string;
}

export interface LineupDraft {
  images?: LineupDraftImage[];
  coverIndex?: number;
  videoUrl?: string;
  mapSlug: MapSlug;
  agentSlug: AgentSlug;
  title: string;
  description: string;
  isPublic: boolean;
  metadata: LineupMetadata;
}
