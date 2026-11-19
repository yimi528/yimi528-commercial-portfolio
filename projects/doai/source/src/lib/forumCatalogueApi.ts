import { apiRequest, ApiError } from './api';
import { PUBLISHED_FORUM_IDS } from './forumSchedule';
import type { ForumSession } from '../types';
export type ManagedForum = ForumSession & { publication: 'draft' | 'published'; bookingEnabled: boolean; capacity: number | null; startsAt: string; endsAt: string };
export type ForumCatalogue = { ok: boolean; forums: ManagedForum[]; version: string | null };
function validate(rows: unknown): ManagedForum[] {
  if (!Array.isArray(rows) || rows.some(row => !row || typeof row.id !== 'string' || typeof row.title !== 'string' || !Number.isFinite(Date.parse(row.startsAt)) || !Number.isFinite(Date.parse(row.endsAt)) || !Array.isArray(row.speakers) || !['draft', 'published'].includes(row.publication) || typeof row.bookingEnabled !== 'boolean' || !(row.capacity === null || Number.isSafeInteger(row.capacity) && row.capacity > 0)) || new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('场次数据未读取成功');
  return rows;
}
export async function loadPublishedForums(): Promise<ManagedForum[]> {
  const result = await apiRequest<{ ok: boolean; forums: ManagedForum[] }>('/api/forums').catch(error => {
    // Older deployments predate the catalogue endpoint. Their provisional
    // sessions must stay unpublished; other errors must remain visible.
    if (PUBLISHED_FORUM_IDS.length === 0 && error instanceof ApiError && error.status === 404
      && /^Cannot GET \/api\/doai\/forums\/?$/.test(error.message)) return { ok: true, forums: [] };
    throw error;
  });
  if (result.ok !== true) throw new Error('场次数据未读取成功');
  const rows = validate(result.forums);
  if (rows.some(row => row.publication !== 'published')) throw new Error('发布数据无效');
  return rows;
}
export async function loadManagedForums(): Promise<ForumCatalogue> {
  const result = await apiRequest<ForumCatalogue>('/api/admin/forums');
  if (result.ok !== true || !(result.version === null || typeof result.version === 'string')) throw new Error('场次数据未读取成功');
  return { ...result, forums: validate(result.forums) };
}
export async function saveManagedForum(forum: Partial<ManagedForum>, expectedVersion: string | null, deleting = false): Promise<ForumCatalogue> {
  const result = await apiRequest<ForumCatalogue>(deleting ? `/api/admin/forums/${encodeURIComponent(forum.id!)}` : '/api/admin/forums', { forum, expectedVersion }, deleting ? 'DELETE' : 'POST');
  if (result.ok !== true || typeof result.version !== 'string') throw new Error('场次保存未完成');
  return { ...result, forums: validate(result.forums) };
}
