import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { authenticatedClient } from '@/lib/convex/authenticated-client';
import type { ActionResult } from '@/lib/types';
export async function forkPublicLineup(sourceId: string, mapSlug: string, agentSlug: string, token: string | null): Promise<ActionResult<{ id: string }>> {
  try { const result = await authenticatedClient(token).mutation(api.lineups.forkPublic, { sourceId: sourceId as Id<'lineups'>, mapSlug, agentSlug }); return { ok: true, data: result }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'Copy failed' }; }
}
