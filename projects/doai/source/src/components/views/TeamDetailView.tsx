import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiRequest } from '../../lib/api';
import { loadPublicTeam, type PublicTeam } from '../../lib/publicTeams';

type Application = { teamId: string; status: string; kind?: string };
export const TeamDetailView: React.FC<{ id: string }> = ({ id }) => {
  const { currentUser, teamRevision, lang, tr, setActiveRoute, setLoginModalOpen } = useApp();
  const [team, setTeam] = useState<PublicTeam | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [following, setFollowing] = useState<string[]>([]), [mutual, setMutual] = useState<string[]>([]);
  const [hasTeam, setHasTeam] = useState(false), [applied, setApplied] = useState(false), [ready, setReady] = useState(false);
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const scope = useRef(0), pending = useRef(false), reading = useRef(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState('');
  const load = useCallback(async (background = false) => {
    if (background && (pending.current || reading.current)) return;
    reading.current = true;
    const version = ++scope.current;
    if (!background) { setLoading(true); setReady(false); setError(''); setNotice(''); }
    try {
      const result = await loadPublicTeam(id);
      if (scope.current !== version) return;
      if (!result) { setTeam(null); setReady(false); setSyncFailed(false); return; }
      if (currentUser) {
        const [follows, mine, apps] = await Promise.all([
          apiRequest<{ following: string[]; mutual: string[] }>('/api/follows'),
          apiRequest<{ team: PublicTeam | null }>('/api/my-team'),
          apiRequest<{ sent: Application[] }>('/api/team-applications'),
        ]);
        if (scope.current !== version) return;
        if (!Array.isArray(follows.following) || !Array.isArray(follows.mutual) || !('team' in mine) || !Array.isArray(apps.sent)) throw new Error(tr('申请状态暂不可用', 'Application status unavailable'));
        setFollowing(follows.following); setMutual(follows.mutual); setHasTeam(Boolean(mine.team));
        const application = apps.sent.find(a => a.teamId === id && a.kind !== 'invitation');
        setApplied(application?.status === 'pending'); setApplicationStatus(application?.status || '');
      }
      setTeam(result); setReady(true); setSyncFailed(false);
      if (background) setNotice('');
    } catch (e) { if (scope.current === version) { if (background) setSyncFailed(true); else setError(e instanceof Error ? e.message : tr('加载失败', 'Loading failed')); } }
    finally { if (scope.current === version) { setLoading(false); reading.current = false; } }
  }, [id, currentUser?.id, lang]);
  useEffect(() => { reading.current = false; setApplicationStatus(''); setSyncFailed(false); pending.current = false; setBusy(false); setNotice(''); setMessage(''); void load(); return () => { ++scope.current; }; }, [load]);
  useEffect(() => {
    const sync = () => { if (!document.hidden) void load(true); };
    const timer = window.setInterval(sync, 10000);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', sync); document.removeEventListener('visibilitychange', sync); };
  }, [load]);
  useEffect(() => { if (teamRevision) void load(true); }, [load, teamRevision]);
  const act = async (follow: boolean) => {
    if (!currentUser) { setLoginModalOpen(true); return; }
    if (!team || pending.current || !ready) return;
    const version = ++scope.current;
    reading.current = false;
    pending.current = true; setBusy(true); setNotice(''); setError('');
    try {
      if (follow) {
        const result = await apiRequest<{ ok: boolean; mutual: boolean }>('/api/follows', { to: team.leaderId });
        if (result.ok !== true || typeof result.mutual !== 'boolean') throw new Error(tr('关注结果未确认', 'Follow result unconfirmed'));
        if (scope.current !== version) return;
        setFollowing(prev => [...new Set([...prev, team.leaderId])]);
        if (result.mutual) setMutual(prev => [...new Set([...prev, team.leaderId])]);
        setNotice(result.mutual ? tr('已互相关注，可以申请加入', 'You can now apply') : tr('已关注队长，等待队长回关后即可申请', 'Following captain. Wait for a follow back to apply.'));
      } else {
        const result = await apiRequest<{ ok: boolean; application: { teamId: string; fromUserId: string; status: string } }>('/api/team-applications', { teamId: team.id, message: message.trim() });
        if (result.ok !== true || result.application?.teamId !== team.id || result.application?.fromUserId !== currentUser.id || result.application?.status !== 'pending') throw new Error(tr('申请结果未确认，请刷新查看', 'Application unconfirmed. Refresh to check.'));
        if (scope.current !== version) return;
        setApplied(true); setApplicationStatus('pending'); setNotice(tr('申请已发送，等待队长审核。可在「我的战队」查看进度。', 'Application sent. Track it in My Team.'));
      }
    } catch (e) { if (scope.current === version) setError(e instanceof Error ? e.message : tr('操作失败，请重试', 'Please retry')); }
    finally { if (scope.current === version) { pending.current = false; setBusy(false); } }
  };
  const mine = team?.members.some(m => m.id === currentUser?.id);
  return <div className="mx-auto max-w-[900px] px-6 pt-28 pb-24">
    <button onClick={() => setActiveRoute('square')} className="mb-8 inline-flex items-center gap-2 text-sm text-[#165DFF]"><ArrowLeft size={16} />{tr('返回社区战队', 'Back to teams')}</button>
    {syncFailed && <p role="status" className="mb-4 text-sm text-[#9A5B00]">{tr('状态同步失败，保留上次确认的资料。', 'Sync failed. Showing the last confirmed details.')}</p>}
    <button type="button" disabled={busy || loading} onClick={() => void load()} className="mb-5 ml-4 text-sm text-[#165DFF] disabled:opacity-40">{tr('刷新战队状态', 'Refresh team status')}</button>
    {applicationStatus === 'declined' && <p role="status" className="mb-4 text-sm text-[#6B7C9B]">{tr('上次申请未通过，可以完善介绍后重新申请。', 'Your previous application was declined. Update your introduction to reapply.')}</p>}
    {loading && <p role="status">{tr('正在加载战队…', 'Loading team…')}</p>}
    {error && <div role="alert" className="my-4 text-sm text-red-600">{error} <button disabled={busy} onClick={() => void load()} className="underline">{tr('刷新重试', 'Retry')}</button></div>}
    {!loading && !error && !team && <p>{tr('战队不存在或已解散', 'Team unavailable or dissolved')}</p>}
    {!loading && team && <article className="doa-card space-y-6 p-6 sm:p-8">
      <div><p className="text-xs text-[#165DFF]">{team.track === 'industry' ? tr('FDE 赛道', 'FDE') : tr('自由创意赛道', 'Free Creation')} · {team.members.length}/5 · {team.members.length >= 5 ? tr('已满员', 'Full') : tr('招募中', 'Recruiting')}</p><h1 className="mt-3 break-words text-3xl font-bold text-[#0B1B3A]">{team.name}</h1></div>
      <section><h2 className="font-bold">{tr('战队介绍', 'About the team')}</h2><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#6B7C9B]">{team.description || tr('队长暂未填写战队介绍', 'No description yet')}</p></section>
      <section><h2 className="font-bold">{tr('战队成员', 'Members')}</h2><ul className="mt-3 space-y-2">{team.members.map(m => <li key={m.id} className="break-words rounded-xl bg-[#F7FAFF] p-3 text-sm">{m.name} · {m.isLeader ? tr('队长', 'Captain') : m.roleTitle || tr('队员', 'Member')}</li>)}</ul></section>
      {notice && <p role="status" className="text-sm text-[#008C64]">{notice}</p>}
      {!currentUser ? <button onClick={() => setLoginModalOpen(true)} className="doa-btn doa-btn-primary">{tr('登录后申请加入', 'Sign in to apply')}</button>
        : mine ? <button onClick={() => setActiveRoute('dashboard/team')} className="doa-btn doa-btn-primary">{tr('管理战队', 'Manage team')}</button>
        : ready && <section className="border-t border-[#E8EAED] pt-6"><h2 className="font-bold">{tr('申请加入战队', 'Apply to join')}</h2>
          {applied ? <p className="mt-3 text-sm">{tr('已申请，等待队长审核', 'Application pending')}</p>
          : hasTeam ? <p className="mt-3 text-sm">{tr('你已有战队，如需更换，请先在「我的战队」处理现有战队。', 'You already have a team. Manage it in My Team before switching.')}</p>
          : team.members.length >= 5 ? <p className="mt-3 text-sm">{tr('战队已满员，暂不能申请', 'Team is full')}</p>
          : !mutual.includes(team.leaderId) ? <div className="mt-3 space-y-3"><p className="text-sm text-[#6B7C9B]">{tr('与队长互相关注后可提交入队申请，由队长审核。', 'Follow each other with the captain to apply for approval.')}</p><button disabled={busy || following.includes(team.leaderId)} onClick={() => void act(true)} className="doa-btn doa-btn-primary disabled:opacity-50">{following.includes(team.leaderId) ? tr('已关注队长，等待回关', 'Waiting for follow back') : tr('关注队长', 'Follow captain')}</button><button disabled={busy} onClick={() => void load()} className="doa-btn doa-btn-ghost">{tr('刷新申请状态', 'Refresh status')}</button></div>
          : <form onSubmit={e => { e.preventDefault(); void act(false); }} className="mt-4 space-y-3"><label className="block text-sm">{tr('介绍你的技能和想承担的角色', 'Introduce your skills and preferred role')}<textarea required maxLength={1000} value={message} onChange={e => setMessage(e.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-[#D5E1F1] p-3" /></label><button disabled={busy || !message.trim()} className="doa-btn doa-btn-primary disabled:opacity-50">{busy ? tr('提交中…', 'Sending…') : tr('申请加入战队', 'Apply to join')}</button></form>}
        </section>}
    </article>}
  </div>;
};
