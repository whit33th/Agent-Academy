import type { MapSlug, AgentSlug } from "../catalog/lineup-options";
import type { LineupMetadata } from "./metadata";

export interface LineupDraft {
  mapSlug: MapSlug;
  agentSlug: AgentSlug;
  title: string;
  description: string;
  isPublic: boolean;
  metadata: LineupMetadata;
}
