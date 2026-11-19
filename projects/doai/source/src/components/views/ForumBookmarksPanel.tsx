import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { apiBase } from '../../lib/api';
import { formatPostDate } from '../../lib/time';
export const ForumBookmarksPanel: React.FC = () => {
  const { currentUser, forums, forumBookmarks, forumBookmarksLoading, forumBookmarksError, forumBookmarkPending, reloadForumBookmarks, setForumBookmark, setActiveRoute, tr } = useApp();
  const [message, setMessage] = useState('');
  const mounted = useRef(true), owner = useRef(currentUser?.id), revision = useRef(0); owner.current = currentUser?.id;
  useEffect(() => { mounted.current = true; setMessage(''); return () => { mounted.current = false; ++revision.current; }; }, [currentUser?.id]);
  const remove = async (id: string) => {
    if (forumBookmarkPending.length) return;
    const uid = currentUser?.id, version = revision.current; setMessage('');
    const result = await setForumBookmark(id, false);
    if (mounted.current && owner.current === uid && revision.current === version) setMessage(result.ok ? tr('已取消收藏', 'Bookmark removed.') : result.message || tr('取消收藏失败，请重试', 'Bookmark was not removed. Please retry.'));
  };
  return <section aria-label={tr('收藏的论坛', 'Saved forums')} className="pt-8 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">{tr('收藏的论坛', 'Saved forums')}{!forumBookmarksLoading && !forumBookmarksError && ` (${forumBookmarks.length})`}</h2><button type="button" disabled={forumBookmarksLoading} onClick={() => void reloadForumBookmarks()} className="doa-btn doa-btn-secondary">{tr('刷新收藏', 'Refresh bookmarks')}</button></div>
    {message && <p role="status" className="text-sm text-[#48597A]">{message}</p>}
    {forumBookmarksLoading && <p role="status">{tr('正在读取收藏…', 'Loading bookmarks…')}</p>}
    {forumBookmarksError && <div role="status" className="doa-card p-6 space-y-3"><p>{tr('收藏暂时无法读取，请重试。', 'Bookmarks could not be loaded. Please retry.')}</p><button type="button" onClick={() => void reloadForumBookmarks()} className="doa-btn doa-btn-secondary">{tr('重新加载收藏', 'Reload bookmarks')}</button></div>}
    {!forumBookmarksLoading && !forumBookmarksError && forumBookmarks.length === 0 && <div className="doa-card p-8 space-y-4"><p>{tr('还没有收藏的分论坛。', 'No saved forums yet.')}</p><button type="button" onClick={() => setActiveRoute('forum')} className="doa-btn doa-btn-primary">{tr('浏览分论坛', 'Browse forums')}</button></div>}
    {forumBookmarks.map(bookmark => {
      const forum = forums.find(row => row.id === bookmark.id); if (!forum) return <article key={bookmark.id} className="doa-card p-6 flex flex-wrap justify-between gap-3"><p className="text-sm text-[#6B7C9B]">{tr('该场次已下架或暂不可用', 'This session is unpublished or unavailable')}</p><button type="button" disabled={forumBookmarkPending.includes(bookmark.id)} onClick={() => void remove(bookmark.id)} className="text-sm text-[#165DFF]">{tr('取消收藏', 'Remove bookmark')}</button></article>;
      return <article key={bookmark.id} className="doa-card p-6 space-y-3">
        <a href={`${apiBase}/detail/forum/${encodeURIComponent(bookmark.id)}`} onClick={event => { if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); setActiveRoute(`detail/forum/${bookmark.id}`); }} className="font-bold text-[#165DFF] break-words">{tr(forum.title, forum.titleEn)}</a>
        <p className="text-sm text-[#6B7C9B]">{forum.date} · {forum.time} · {tr(forum.venue, forum.venueEn)}</p><p className="text-xs text-[#6B7C9B]">{tr('收藏于', 'Saved')} {formatPostDate(bookmark.createdAt)}</p>
        <button type="button" disabled={forumBookmarksLoading || forumBookmarksError || forumBookmarkPending.length > 0} onClick={() => void remove(bookmark.id)} className="doa-btn doa-btn-ghost disabled:opacity-50">{forumBookmarkPending.includes(bookmark.id) ? tr('正在取消收藏…', 'Removing bookmark…') : tr('取消收藏', 'Remove bookmark')}</button>
      </article>;
    })}
  </section>;
};
