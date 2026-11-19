import { ApiError, apiRequest } from './api.ts';
export interface ForumBookmark { id: string; createdAt: string; }
const valid = (row: ForumBookmark): boolean => Boolean(row && typeof row.id === 'string' && /^(?:forum-(?:[1-9]|1[0-8])|session-[a-f0-9-]{36})$/.test(row.id) && typeof row.createdAt === 'string' && Number.isFinite(Date.parse(row.createdAt)));
export const newestBookmarkFirst = (left: ForumBookmark, right: ForumBookmark) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
export async function loadForumBookmarks(userId: string): Promise<ForumBookmark[]> {
  const result = await apiRequest<{ ok: boolean; userId: string; bookmarks: ForumBookmark[] }>('/api/forum-bookmarks');
  if (typeof result.userId === 'string' && result.userId !== userId) throw new ApiError('登录账号已变化，请重新登录后读取收藏', 409, 'SESSION_CHANGED');
  if (result.ok !== true || result.userId !== userId || !Array.isArray(result.bookmarks) || !result.bookmarks.every(valid) || new Set(result.bookmarks.map(row => row.id)).size !== result.bookmarks.length) throw new Error('收藏读取结果未确认，请重新读取账号后重试');
  return result.bookmarks;
}
export async function saveForumBookmark(userId: string, id: string, saved: boolean): Promise<ForumBookmark | null> {
  const result = await apiRequest<{ ok: boolean; userId: string; bookmark: { id: string; saved: boolean; createdAt?: string } }>('/api/forum-bookmarks', { expectedUserId: userId, id, saved });
  const bookmark = result.bookmark;
  if (result.ok !== true || result.userId !== userId || bookmark?.id !== id || bookmark.saved !== saved || (saved && !valid(bookmark as ForumBookmark))) throw new Error('收藏保存结果未确认，请重新加载后重试');
  return saved ? { id, createdAt: bookmark.createdAt! } : null;
}
