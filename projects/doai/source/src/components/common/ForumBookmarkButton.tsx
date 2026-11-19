import React, { useEffect, useRef, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { useApp } from '../../context/AppContext';
export const ForumBookmarkButton: React.FC<{ forumId: string }> = ({ forumId }) => {
  const { currentUser, authLoading, forumBookmarks, forumBookmarksLoading, forumBookmarksError, forumBookmarkPending, reloadForumBookmarks, setForumBookmark, setLoginModalOpen, tr } = useApp();
  const [message, setMessage] = useState('');
  const scope = useRef(0), mounted = useRef(true), owner = useRef(currentUser?.id), target = useRef(forumId);
  owner.current = currentUser?.id; target.current = forumId;
  useEffect(() => { mounted.current = true; setMessage(''); return () => { mounted.current = false; ++scope.current; }; }, [currentUser?.id, forumId]);
  const saved = forumBookmarks.some(row => row.id === forumId), pending = forumBookmarkPending.includes(forumId);
  const toggle = async () => {
    if (!currentUser) { setLoginModalOpen(true); return; }
    const uid = currentUser.id, id = forumId, version = scope.current; setMessage('');
    const result = await setForumBookmark(id, !saved);
    if (mounted.current && owner.current === uid && target.current === id && scope.current === version) setMessage(result.ok ? saved ? tr('已取消收藏', 'Bookmark removed.') : tr('已收藏，可在「我的 DOAI · 收藏的论坛」查看。', 'Saved in My DOAI · Saved forums.') : result.message || tr('收藏未保存，请重试', 'Bookmark was not saved. Please retry.'));
  };
  return <div className="space-y-2 max-w-full">
    <button type="button" disabled={authLoading || pending || Boolean(currentUser && (forumBookmarksLoading || forumBookmarksError))} onClick={() => void toggle()} aria-pressed={Boolean(currentUser && saved)} className="doa-btn doa-btn-ghost disabled:opacity-50">
      <Bookmark className={`w-4 h-4 ${saved ? 'fill-[#165DFF] text-[#165DFF]' : ''}`} />{pending ? tr('正在保存收藏…', 'Saving bookmark…') : currentUser && forumBookmarksLoading ? tr('正在读取收藏…', 'Loading bookmarks…') : saved ? tr('已收藏', 'Saved') : tr('收藏', 'Save')}
    </button>
    {currentUser && forumBookmarksError && <div className="text-xs text-[#6B7C9B] space-y-1"><p>{tr('收藏暂时无法读取，请重试。', 'Bookmarks could not be loaded. Please retry.')}</p><button type="button" onClick={() => void reloadForumBookmarks()} className="text-[#165DFF] underline">{tr('重新加载收藏', 'Reload bookmarks')}</button></div>}
    {message && <p role="status" className="text-xs text-[#48597A] break-words">{message}</p>}
  </div>;
};
