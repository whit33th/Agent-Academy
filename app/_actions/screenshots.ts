import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { authenticatedClient } from '@/lib/convex/authenticated-client';
import type { ActionResult } from '@/lib/types';
async function upload(file: File, token: string | null): Promise<Id<'_storage'>> {
  authenticatedClient(token);
  const site = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (!site) throw new Error('Cloud storage is unavailable.');
  const response = await fetch(`${site}/images`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type }, body: file });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Upload failed');
  return result.storageId;
}
function fields(data: FormData) {
  return { title: String(data.get('title') ?? ''), description: String(data.get('description') ?? ''), abilityType: String(data.get('abilityType') ?? ''), isPublic: data.get('isPublic') === 'true' };
}
export async function uploadScreenshot(data: FormData, token: string | null): Promise<ActionResult<{ screenshotId: string }>> {
  try {
    const client = authenticatedClient(token);
    const file = data.get('image');
    if (!(file instanceof File)) throw new Error('Choose an image.');
    const storageId = await upload(file, token);
    const result = await client.mutation(api.lineups.create, { ...fields(data), mapSlug: String(data.get('mapSlug')), agentSlug: String(data.get('agentSlug')), storageId });
    return { ok: true, data: { screenshotId: result.id } };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'Upload failed' }; }
}
export async function editScreenshot(data: FormData, token: string | null): Promise<ActionResult> {
  try {
    const client = authenticatedClient(token);
    const file = data.get('image');
    const storageId = file instanceof File && file.size ? await upload(file, token) : undefined;
    await client.mutation(api.lineups.update, { id: String(data.get('screenshotId')) as Id<'lineups'>, ...fields(data), ...(storageId ? { storageId } : {}) });
    return { ok: true, data: undefined };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'Update failed' }; }
}
export async function deleteScreenshot(id: string, token: string | null): Promise<ActionResult> {
  try { await authenticatedClient(token).mutation(api.lineups.remove, { id: id as Id<'lineups'> }); return { ok: true, data: undefined }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'Delete failed' }; }
}
