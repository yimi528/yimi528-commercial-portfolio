import { apiRequest } from './api.ts';
export interface ForumStatistics { id: string; bookedCount: number; checkedInCount: number; }
export async function loadForumStatistics(): Promise<ForumStatistics[]> {
  const result = await apiRequest<{ ok: boolean; forums: ForumStatistics[] }>('/api/forum-stats');
  if (result.ok !== true || !Array.isArray(result.forums)
    || new Set(result.forums.map(row => row?.id)).size !== result.forums.length
    || result.forums.some(row => !row || typeof row.id !== 'string' || !Number.isSafeInteger(row.bookedCount) || row.bookedCount < 0
      || !Number.isSafeInteger(row.checkedInCount) || row.checkedInCount < 0 || row.checkedInCount > row.bookedCount)) throw new Error('预约统计未读取成功');
  return result.forums;
}
