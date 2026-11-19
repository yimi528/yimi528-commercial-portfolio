import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { apiRequest } from '../../lib/api';
import { useRemoteList } from '../../lib/useRemoteList';
import type { RecruitmentApplication } from '../../lib/communityApi';
import { formatPostDate } from '../../lib/time';

export const RecruitmentApplications: React.FC<{ postId: string; onDecision?: () => void | Promise<unknown> }> = ({ postId, onDecision }) => {
  const { currentUser, tr } = useApp();
  const owner = currentUser ? `${currentUser.id}:${currentUser.role}:${postId}` : null;
  const ownerRef = useRef(owner);
  const scope = useRef(0);
  if (ownerRef.current !== owner) { ownerRef.current = owner; ++scope.current; }
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const fetchRows = useCallback(async () => {
    const data = await apiRequest<{ applications: RecruitmentApplication[] }>(`/api/recruitments/${encodeURIComponent(postId)}/applications`);
    if (!Array.isArray(data.applications)) throw new Error('Invalid applications response');
    return data.applications;
  }, [postId]);
  const list = useRemoteList(owner, fetchRows);
  const [busyId, setBusyId] = useState('');
  const pending = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { pending.current = false; setBusyId(''); setError(''); setNotice(''); }, [owner]);
  const decide = async (id: string, action: 'accept' | 'decline') => {
    if (!owner || pending.current) return;
    const startedFor = owner;
    const version = scope.current;
    pending.current = true;
    setBusyId(id); setError(''); setNotice('');
    const isCurrent = () => mounted.current && ownerRef.current === startedFor && scope.current === version;
    try {
      const result = await apiRequest<{ ok: boolean; application: { id: string; status: RecruitmentApplication['status'] } }>('/api/recruitment-application-action', { id, action });
      const status = action === 'accept' ? 'accepted' : 'declined';
      if (!result.ok || result.application?.id !== id || result.application.status !== status) throw new Error(tr('处理结果未保存，请重试', 'The result was not saved. Please retry.'));
      if (!isCurrent()) return;
      list.setItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
      setNotice(tr('处理结果已保存，申请人将收到通知。', 'Saved. The applicant will receive a notification.'));
      await onDecision?.();
    } catch (error) { if (isCurrent()) setError(error instanceof Error ? error.message : tr('处理失败，请重试', 'Action failed. Please retry.')); }
    finally { if (isCurrent()) { pending.current = false; setBusyId(''); } }
  };
  const statusText: Record<RecruitmentApplication['status'], string> = {
    pending: tr('待处理', 'Pending'), accepted: tr('愿意进一步沟通', 'Open to a conversation'), declined: tr('本次暂不合适', 'Not a fit this time'), handled: tr('已处理', 'Handled'),
  };
  return (
    <section id="recruitment-applications" aria-label={tr('收到的招募申请', 'Recruitment applications')} className="doa-card p-6 sm:p-7 space-y-5 scroll-mt-24">
      <h2 className="text-lg font-bold text-[#0B1B3A]">{tr('收到的招募申请', 'Recruitment applications')}{!list.loading && !list.error && ` (${list.items.length})`}</h2>
      <p className="text-xs leading-relaxed text-[#6B7C9B]">{tr('这里处理的是项目合作意向。正式入队可在互相关注后通过「我的战队」邀请。', 'These are project collaboration requests. For formal team membership, follow each other and invite through My Team.')}</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {notice && <p role="status" className="text-sm text-[#00A57A]">{notice}</p>}
      {list.loading ? <p role="status" className="text-sm text-[#6B7C9B]">{tr('正在读取申请…', 'Loading applications…')}</p>
        : list.error ? <div role="status" className="space-y-3"><p className="text-sm text-[#6B7C9B]">{tr('申请暂时无法加载，请重试。', 'Applications could not be loaded. Please retry.')}</p><button type="button" onClick={() => void list.reload()} className="doa-btn doa-btn-secondary">{tr('重新加载申请', 'Reload applications')}</button></div>
        : list.items.length === 0 ? <p className="text-sm text-[#6B7C9B]">{tr('尚未收到申请', 'No applications yet')}</p>
        : list.items.map(item => <article key={item.id} className="rounded-xl border border-[#E3ECFA] p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0"><h3 className="text-sm font-semibold break-words text-[#0B1B3A]">{item.applicant.name || tr('创客', 'Maker')}</h3><p className="mt-1 text-xs text-[#98A6BE]">{item.applicant.city} · {formatPostDate(item.createdAt)}</p></div>
            <span className="text-xs font-semibold text-[#165DFF]">{statusText[item.status] || tr('状态待确认', 'Status unavailable')}</span>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[#48597A]">{item.message}</p>
          {item.status === 'pending' && <div className="flex flex-wrap gap-2">
            <button type="button" disabled={Boolean(busyId)} onClick={() => void decide(item.id, 'accept')} className="doa-btn doa-btn-primary disabled:opacity-50">{busyId === item.id ? tr('正在保存…', 'Saving…') : tr('愿意沟通', 'Discuss collaboration')}</button>
            <button type="button" disabled={Boolean(busyId)} onClick={() => void decide(item.id, 'decline')} className="doa-btn doa-btn-secondary disabled:opacity-50">{tr('暂不合适', 'Not a fit')}</button>
          </div>}
        </article>)}
    </section>
  );
};
