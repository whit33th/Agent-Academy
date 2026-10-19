import { api } from '@/convex/_generated/api';
import { authenticatedClient } from '@/lib/convex/authenticated-client';
import { normalizeName } from '@/lib/utils/normalize';
import type { ActionResult } from '@/lib/types';
export async function addMap(mapName:string,token:string|null):Promise<ActionResult<{_id:string}>>{
 try {const slug=normalizeName(mapName);await authenticatedClient(token).mutation(api.maps.setPreference,{mapSlug:slug,hidden:false});return {ok:true,data:{_id:slug}};}
 catch(error){return {ok:false,error:error instanceof Error?error.message:'Update failed'};}
}
export async function deleteMap(mapId:string,token:string|null):Promise<ActionResult>{
 try {await authenticatedClient(token).mutation(api.maps.setPreference,{mapSlug:mapId,hidden:true});return {ok:true,data:undefined};}
 catch(error){return {ok:false,error:error instanceof Error?error.message:'Update failed'};}
}
