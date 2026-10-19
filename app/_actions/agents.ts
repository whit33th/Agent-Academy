import { api } from '@/convex/_generated/api';
import { authenticatedClient } from '@/lib/convex/authenticated-client';
import { normalizeName } from '@/lib/utils/normalize';
import type { ActionResult } from '@/lib/types';
export async function addAgent(agentName: string, mapSlug: string | null | undefined, token: string | null): Promise<ActionResult<{agentId: string}>> {
  try { if (!mapSlug) throw new Error('Choose a map.'); const slug = normalizeName(agentName); await authenticatedClient(token).mutation(api.mapRoster.upsert,{mapSlug,agentSlug:slug,notes:''}); return {ok:true,data:{agentId:slug}}; }
  catch(error){return {ok:false,error:error instanceof Error?error.message:'Update failed'};}
}
export async function deleteAgent(agentId: string, mapId: string | null | undefined, token: string | null): Promise<ActionResult> {
  try {if(!mapId) throw new Error('Choose a map.'); await authenticatedClient(token).mutation(api.mapRoster.upsert,{mapSlug:mapId,agentSlug:agentId,notes:'hidden'});return {ok:true,data:undefined};}
  catch(error){return {ok:false,error:error instanceof Error?error.message:'Update failed'};}
}
export async function updateAgentViability(agentId: string,mapId:string,viability:string|null,token:string|null): Promise<ActionResult> {
  try {await authenticatedClient(token).mutation(api.mapRoster.upsert,{mapSlug:mapId,agentSlug:agentId,viability:viability??''});return {ok:true,data:undefined};}
  catch(error){return {ok:false,error:error instanceof Error?error.message:'Update failed'};}
}
