/**
 * 战队管理面板（会议 2026-10-13 组队协作优化）：
 * - 队长可创建战队、移出队员（队长离开即解散）
 * - 组队申请需双方互相关注后才能发送（后端强校验）
 * - 成员上限 5 人
 * 数据来自主站 DOAI NestJS 模块与 MySQL。
 */
import { apiUrl, apiFetch } from '../../lib/api';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Plus,
  UserMinus,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  UserPlus,
  HeartHandshake,
  Inbox,
  Send,
  Settings2,
} from 'lucide-react';
import { TrackType } from '../../types';

interface TeamMember {
  id: string;
  name: string;
  roleTitle: string;
  isLeader: boolean;
}

interface Team {
  id: string;
  name: string;
  track: TrackType;
  inviteCode: string;
  leaderId: string;
  createdAt: string;
  members: TeamMember[];
  desc?: string;
}

interface DirectoryUser {
  id: string;
  name: string;
  roleTitle: string;
}

interface TeamApplication {
  kind?: 'application' | 'invitation';
  id: string;
  teamId: string;
  teamName: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

const api = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const res = await apiFetch(apiUrl(url), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const d = await res.json();
  if (!res.ok || !d.ok) throw new Error(d.error?.message || d.message || `请求失败 (${res.status})`);
  return d as T;
};

export const TeamPanel: React.FC = () => {
  const { currentUser, teamRevision, notifyTeamChanged, handleTeamApplicationAction, setNotificationDrawerOpen, setActiveRoute, tr } = useApp();
  const me = currentUser!;
  const isLeader = (t: Team | null) => !!t && t.leaderId === me.id;

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadOwner, setLoadOwner] = useState(me?.id);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [syncFailed, setSyncFailed] = useState(false);
  const reading = useRef(false);

  // 创建战队表单
  const [creating, setCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamTrack, setNewTeamTrack] = useState<TrackType>('creator');

  // 目录 / 关注 / 申请
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [mutual, setMutual] = useState<string[]>([]);
  const [received, setReceived] = useState<TeamApplication[]>([]);
  const [sent, setSent] = useState<TeamApplication[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [noticeFailed, setNoticeFailed] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  const scope = useRef(0);
  const account = useRef(me?.id);
  if (account.current !== me?.id) { account.current = me?.id; ++scope.current; }
  const loadRequest = useRef(0);

  const refresh = useCallback(async (background = false) => {
    if (!me) return false;
    const uid = me.id, version = scope.current, request = ++loadRequest.current;
    setLoadOwner(uid);
    const isCurrent = () => mounted.current && account.current === uid && scope.current === version && loadRequest.current === request;
    reading.current = true;
    if (!background) setLoading(true);
    try {
      const [teamRes, followsRes, appsRes, usersRes] = await Promise.all([
        api<{ team: Team | null }>('/api/my-team'),
        api<{ following: string[]; mutual: string[] }>('/api/follows'),
        api<{ received: TeamApplication[]; sent: TeamApplication[] }>('/api/team-applications'),
        api<{ users: DirectoryUser[] }>('/api/users'),
      ]);
      if (!('team' in teamRes) || !Array.isArray(followsRes.following) || !Array.isArray(followsRes.mutual) || !Array.isArray(appsRes.received) || !Array.isArray(appsRes.sent) || !Array.isArray(usersRes.users)) throw new Error('战队数据暂不可用');
      if (!isCurrent()) return false;
      setTeam(teamRes.team);
      setFollowing(followsRes.following); setMutual(followsRes.mutual);
      setReceived(appsRes.received); setSent(appsRes.sent);
      setDirectory(usersRes.users.filter(user => user.id !== uid));
      setError(''); setSyncFailed(false);
      return true;
    } catch { if (isCurrent()) { if (background) setSyncFailed(true); else setError('战队服务暂不可用，请重试。'); } return false; }
    finally { if (isCurrent()) { reading.current = false; setLoading(false); } }
  }, [me?.id]);

  useEffect(() => {
    mounted.current = true;
    pending.current = false;
    setTeam(null); setReceived([]); setSent([]); setDirectory([]); setBusyId(null); setNotice(''); setCreating(false); setEditing(false); setJoinCode(''); setSyncFailed(false);
    void refresh();
    return () => { mounted.current = false; ++scope.current; ++loadRequest.current; };
  }, [refresh]);
  useEffect(() => {
    if (teamRevision) void refresh(true);
  }, [refresh, teamRevision]);
  useEffect(() => {
    const sync = () => { if (!document.hidden && !pending.current && !reading.current) void refresh(true); };
    const timer = window.setInterval(sync, 10000);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', sync); document.removeEventListener('visibilitychange', sync); };
  }, [refresh]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const runAction = async (id: string, work: () => Promise<string>, refreshAfter = true) => {
    if (!me || pending.current) return;
    const uid = me.id, version = scope.current;
    const isCurrent = () => mounted.current && account.current === uid && scope.current === version;
    pending.current = true;
    setBusyId(id); setNotice('');
    try {
      const message = await work();
      if (!isCurrent()) return;
      if (id === 'create') { setCreating(false); setNewTeamName(''); }
      if (id === 'join') setJoinCode('');
      if (id === 'save-edit') setEditing(false);
      setNoticeFailed(false); setNotice(message);
      if (['create', 'join', 'save-edit', 'leave'].includes(id) || team?.members.some(m => m.id === id)) notifyTeamChanged();
      if (refreshAfter) await refresh(true);
    } catch (error) {
      if (isCurrent()) { setNoticeFailed(true); setNotice(error instanceof Error ? error.message : '操作失败，请重试'); }
    } finally { if (isCurrent()) { pending.current = false; setBusyId(null); } }
  };

  const handleCreateTeam = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTeamName.trim()) return;
    void runAction('create', async () => {
      await api('/api/teams', { method: 'POST', body: JSON.stringify({ name: newTeamName.trim(), track: newTeamTrack }) });
      return '战队创建成功，可以邀请互相关注的创客加入了';
    });
  };
  const handleJoinTeam = (event: React.FormEvent) => {
    event.preventDefault();
    if (!joinCode.trim()) return;
    void runAction('join', async () => {
      const result = await api<{ team: Team }>('/api/team-join', { method: 'POST', body: JSON.stringify({ inviteCode: joinCode.trim() }) });
      if (!result.team?.members?.some(member => member.id === me.id)) throw new Error('入队结果未确认，请重新加载战队');
      return `已加入战队「${result.team.name}」`;
    });
  };
  const handleRemoveMember = (id: string, name: string) => {
    if (!team) return;
    void runAction(id, async () => { await api('/api/team-remove-member', { method: 'POST', body: JSON.stringify({ teamId: team.id, memberId: id }) }); return `已将 ${name} 移出战队`; });
  };
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const startEdit = () => { if (team && !pending.current) { setEditName(team.name); setEditDesc(team.desc || ''); setEditing(true); } };
  const handleSaveEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!team || !editName.trim()) return;
    void runAction('save-edit', async () => { await api('/api/team-update', { method: 'POST', body: JSON.stringify({ teamId: team.id, name: editName.trim(), desc: editDesc }) }); return '战队信息已更新'; });
  };
  const handleLeave = () => {
    if (!team || pending.current) return;
    const leader = isLeader(team);
    if (!confirm(leader ? '队长离开将解散战队并撤回待处理申请，确认解散？' : '确认退出战队？')) return;
    void runAction('leave', async () => { await api('/api/team-leave', { method: 'POST', body: JSON.stringify({ teamId: team.id }) }); return leader ? '战队已解散' : '已退出战队'; });
  };
  const handleToggleFollow = (target: DirectoryUser) => {
    const isFollowing = following.includes(target.id);
    void runAction(target.id, async () => {
      const result = await api<{ mutual: boolean }>('/api/follows', { method: isFollowing ? 'DELETE' : 'POST', body: JSON.stringify({ to: target.id }) });
      return isFollowing ? `已取消关注 ${target.name}` : result.mutual ? `与 ${target.name} 互相关注，可以发送战队邀请了` : `已关注 ${target.name}，对方回关后即可发送战队邀请`;
    });
  };
  const handleSendApplication = (target: DirectoryUser) => {
    if (!team) return;
    void runAction(target.id, async () => {
      await api('/api/team-invitations', { method: 'POST', body: JSON.stringify({ teamId: team.id, toUserId: target.id, message: `${me.name} 邀请你加入战队「${team.name}」` }) });
      return `已向 ${target.name} 发送战队邀请`;
    });
  };
  const handleApplication = (application: TeamApplication, action: 'accept' | 'decline') => {
    void runAction(application.id, async () => {
      const result = await handleTeamApplicationAction(application.id, action, application.kind);
      if (!result.ok) throw new Error(result.message || '操作失败，请重试');
      return action === 'accept' ? '已接受，战队成员已更新' : '已拒绝';
    }, false);
  };

  if (loading || loadOwner !== me?.id) {
    return (
      <div className="pt-8 flex items-center justify-center gap-2 text-sm text-[#888888]">
        <Loader2 className="w-4 h-4 animate-spin" />
        正在同步战队数据…
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-8 doa-panel p-8 text-center text-sm text-[#6B7C9B]">
        <p>{tr('战队服务暂不可用，请重试。', 'Team data could not be loaded. Please retry.')}</p>
        <button type="button" onClick={() => void refresh()} className="doa-btn doa-btn-secondary mt-4">{tr('重新加载战队', 'Reload team')}</button>
      </div>
    );
  }

  return (
    <div className="pt-8 space-y-6">
      <div className="flex items-center justify-between gap-3 text-xs text-[#6B7C9B]">
        <span role="status">{syncFailed ? tr('同步失败，当前显示上次成功读取的资料', 'Sync failed. Showing the last loaded data.') : tr('每 10 秒自动同步队伍', 'Team syncs every 10 seconds')}</span>
        <button type="button" disabled={busyId !== null} onClick={() => void refresh(true)} className="doa-btn doa-btn-secondary text-xs">{tr('刷新队伍', 'Refresh team')}</button>
      </div>
      {notice && (
        <div role="status" className={`p-3 rounded-xl text-xs font-medium ${noticeFailed ? 'bg-red-50 text-red-600' : 'bg-[#00C48C]/10 text-[#00876A]'}`}>{notice}</div>
      )}

          {/* ---- 收到的组队申请（我是被邀请人，或队长代审） ---- */}
          {received.length > 0 && (
            <div className="doa-card p-8 space-y-4">
              <div className="flex items-center gap-2">
                <Inbox className="w-5 h-5 text-[#FF8A1F]" />
                <h3 className="text-base font-bold text-[#0B1B3A]">{tr('收到的邀请与申请', 'Invitations & Applications')}（{received.length}）</h3>
              </div>
              {received.map(app_ => (
                <div key={app_.id} className="p-4 doa-panel text-xs space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 break-words leading-relaxed">
                      <span className="font-bold text-[#0B1B3A]">{app_.fromName}</span>
                      <span className="text-[#888888]">{app_.kind === 'invitation' ? tr(' 邀请你加入 ', ' invites you to ') : tr(' 申请加入 ', ' applied to join ')}</span>
                      <span className="font-bold text-[#165DFF]">{app_.teamName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApplication(app_, 'accept')}
                        disabled={busyId !== null}
                        className="px-3 py-1.5 font-semibold text-white bg-[#00C48C] hover:bg-[#009B71] rounded-full disabled:opacity-40 flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> {app_.kind === 'invitation' ? tr('接受邀请', 'Accept invitation') : tr('同意入队', 'Accept applicant')}
                      </button>
                      <button
                        onClick={() => handleApplication(app_, 'decline')}
                        disabled={busyId !== null}
                        className="px-3 py-1.5 font-semibold text-[#666666] hover:text-red-500 border border-[#E8EAED] rounded-full disabled:opacity-40 flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> 拒绝
                      </button>
                    </div>
                  </div>
                  {app_.message && <div className="text-[#666666]">“{app_.message}”</div>}
                </div>
              ))}
            </div>
          )}


      {/* ---- 没有战队：创建 ---- */}
      {!team ? (
        <>
        <form onSubmit={handleJoinTeam} className="doa-card p-8 space-y-4">
          <h3 className="text-lg font-bold text-[#0B1B3A]">{tr('使用邀请码加入战队', 'Join with an invite code')}</h3>
          <p className="text-xs text-[#666666]">{tr('输入队长分享的邀请码，即可加入同一支战队。每队最多 5 人。', 'Enter the code shared by your captain. Teams can have up to 5 members.')}</p>
          <label htmlFor="team-invite-code" className="block text-xs font-semibold">{tr('战队邀请码', 'Team invite code')}</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input id="team-invite-code" required maxLength={64} value={joinCode} onChange={event => setJoinCode(event.target.value)} disabled={busyId !== null} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder={tr('粘贴队长分享的 32 位邀请码', 'Paste the 32-character code')} className="min-w-0 flex-1 px-4 py-2.5 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-sm" />
            <button type="submit" disabled={busyId !== null || !joinCode.trim()} className="doa-btn doa-btn-primary disabled:opacity-50">{tr('加入战队', 'Join team')}</button>
          </div>
        </form>
        <div className="doa-card p-8 space-y-5">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#165DFF]" />
            <h3 className="text-lg font-bold text-[#0B1B3A]">{tr('创建我的战队', 'Create My Team')}</h3>
          </div>
          <p className="text-xs text-[#666666] leading-relaxed">
            {tr('还没有战队。创建后你将成为队长：可以邀请成员、移出队员；队员上限 5 人。', 'No team yet. As captain you can invite and remove members; up to 5 people.')}
          </p>
          {creating ? (
            <form onSubmit={handleCreateTeam} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0B1B3A] mb-1.5">
                    {tr('战队名称', 'Team Name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    disabled={busyId !== null} maxLength={64} value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                    placeholder="例如: Synapse Core"
                    className="w-full px-4 py-2.5 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-sm focus:outline-none focus:border-[#165DFF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0B1B3A] mb-1.5">{tr('参赛赛道', 'Track')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['creator', 'industry'] as TrackType[]).map(trackOpt => (
                      <button
                        key={trackOpt}
                        type="button"
                        disabled={busyId !== null} onClick={() => setNewTeamTrack(trackOpt)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                          newTeamTrack === trackOpt
                            ? 'border-[#165DFF] bg-[#165DFF]/5 text-[#165DFF]'
                            : 'border-[#E8EAED] bg-[#F7F8FA] text-[#666666]'
                        }`}
                      >
                        {trackOpt === 'creator' ? tr('自由创意赛道', 'Creator Track') : tr('FDE 赛道', 'Industry Track')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busyId !== null}
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-[#165DFF] hover:bg-[#1453E6] rounded-full disabled:opacity-50"
                >
                  创建战队
                </button>
                <button
                  type="button"
                  disabled={busyId !== null} onClick={() => setCreating(false)}
                  className="px-6 py-2.5 text-xs font-semibold text-[#666666]"
                >
                  取消
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="px-6 py-3 text-xs font-semibold text-white bg-[#165DFF] hover:bg-[#1453E6] rounded-full flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              创建战队
            </button>
          )}
        </div>
        </>
      ) : (
        <>
          {/* ---- 战队信息 ---- */}
          <div className="doa-card p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8EAED]">
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-[#0B1B3A] flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-[#165DFF] text-white flex items-center justify-center text-sm font-extrabold shrink-0">
                    {team.name.slice(0, 1)}
                  </span>
                  <span className="truncate">{tr('战队管理', 'Team')}: {team.name}</span>
                </h3>
                <p className="text-xs text-[#666666] mt-0.5">
                  {team.track === 'creator' ? '自由创意赛道' : 'FDE 赛道'} · 成员 {team.members.length}/5 ·
                  {tr('可分享邀请码入队，站内邀请需互关', 'Join by code, or invite mutual followers')}
                </p>
                {team.desc && (
                  <p className="text-xs text-[#98A6BE] mt-1">{team.desc}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                {isLeader(team) && <button type="button" onClick={() => setActiveRoute(`register/${team.track}`)} className="doa-btn doa-btn-primary text-xs">{tr('使用本战队报名', 'Enter with this team')} <ArrowRight className="w-3.5 h-3.5" /></button>}
                {isLeader(team) && !editing && (
                  <button
                    onClick={startEdit}
                    className="px-3 py-1.5 text-xs font-semibold text-[#165DFF] hover:bg-[#165DFF]/10 border border-[#165DFF]/30 rounded-full transition-colors flex items-center gap-1"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    {tr('编辑战队', 'Edit Team')}
                  </button>
                )}
                <span className="text-xs text-[#888888]">{tr('邀请码', 'Invite code')}:</span>
                <span className="px-3 py-1 bg-[#165DFF]/10 text-[#165DFF] font-mono font-bold text-xs rounded-lg break-all min-w-0">
                  {team.inviteCode}
                </span>
                <button type="button" disabled={busyId !== null} onClick={() => void runAction('copy-code', async () => { await navigator.clipboard.writeText(team.inviteCode); return '邀请码已复制，发送给队友后可在战队页面输入加入'; }, false)} className="doa-btn doa-btn-secondary text-xs">{tr('复制邀请码', 'Copy code')}</button>
              </div>
            </div>

            <p className="text-xs text-[#6B7C9B]">{tr('战队名称、简介与成员会自动同步到创客社区。报名会读取本战队的队名和已确认成员，报名资料独立保留。', 'Your team name, description and members sync to the community automatically. Registration uses the team name and confirmed roster; entry details are saved separately.')}</p>

            {/* 编辑战队表单（队长） */}
            {editing && (
              <form onSubmit={handleSaveEdit} className="p-5 doa-panel space-y-4">
                <div className="text-xs font-bold text-[#0B1B3A]">{tr('编辑战队信息', 'Edit Team Info')}</div>
                <div>
                  <label className="block text-xs font-semibold text-[#0B1B3A] mb-1.5">
                    {tr('战队名称', 'Team Name')} <span className="text-red-500">*</span>
                    <span className="ml-2 font-normal text-[#98A6BE]">标识取名称首字，自动生成</span>
                  </label>
                  <input
                    required
                    maxLength={24}
                    disabled={busyId !== null} value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#E8EAED] rounded-xl text-sm focus:outline-none focus:border-[#165DFF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0B1B3A] mb-1.5">
                    战队简介 <span className="text-[#98A6BE] font-normal">（展示在名片与邀请中，120 字内）</span>
                  </label>
                  <textarea
                    rows={2}
                    maxLength={120}
                    disabled={busyId !== null} value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    placeholder="一句话介绍你们的战队方向与目标…"
                    className="w-full px-4 py-2.5 bg-white border border-[#E8EAED] rounded-xl text-sm focus:outline-none focus:border-[#165DFF]"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={busyId !== null}
                    className="px-6 py-2.5 text-xs font-semibold text-white bg-[#165DFF] hover:bg-[#1453E6] rounded-full disabled:opacity-50"
                  >
                    {tr('保存', 'Save')}
                  </button>
                  <button
                    type="button"
                    disabled={busyId !== null} onClick={() => setEditing(false)}
                    className="px-6 py-2.5 text-xs font-semibold text-[#666666]"
                  >
                    {tr('取消', 'Cancel')}
                  </button>
                </div>
              </form>
            )}

            {/* 成员列表 */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-[#0B1B3A]">{tr('现有成员名单', 'Members')}</div>
              {team.members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-4 doa-panel text-xs">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-[#0B1B3A]">{member.name}</span>
                    <span className="px-2.5 py-0.5 bg-white border border-[#E8EAED] rounded-full text-[11px] text-[#555555]">
                      {member.roleTitle}
                    </span>
                    {member.isLeader ? (
                      <span className="text-[10px] font-bold text-[#165DFF] bg-[#165DFF]/10 px-2 py-0.5 rounded-full">
                        {tr('战队队长', 'Captain')}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#98A6BE]">{tr('队员', 'Member')}</span>
                    )}
                  </div>
                  {isLeader(team) && !member.isLeader && (
                    <button
                      onClick={() => handleRemoveMember(member.id, member.name)}
                      disabled={busyId !== null}
                      className="flex items-center gap-1 text-neutral-400 hover:text-red-500 transition-colors disabled:opacity-40"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      {tr('移出', 'Remove')}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#E8EAED]">
              <span className="text-[11px] text-[#98A6BE]">
                {isLeader(team) ? '队长离开将解散战队' : '退出后可加入其他战队'}
              </span>
              <button
                onClick={handleLeave}
                disabled={busyId !== null}
                className="px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-full transition-colors disabled:opacity-40"
              >
                {isLeader(team) ? tr('解散战队', 'Disband Team') : tr('退出战队', 'Leave Team')}
              </button>
            </div>
          </div>

          {/* ---- 创客目录：关注 + 邀请（互相关注才能发申请） ---- */}
          <div className="doa-card p-8 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-[#165DFF]" />
                <h3 className="text-base font-bold text-[#0B1B3A]">{tr('邀请创客加入战队', 'Invite Makers to Join')}</h3>
              </div>
              <span className="text-[11px] text-[#98A6BE]">
                <HeartHandshake className="w-3 h-3 inline mr-1" />
                {tr('互相关注后才能发送组队申请', 'Mutual follow required to send invites')}
              </span>
            </div>

            <div className="space-y-2">
              {directory.map(user => {
                const iFollow = following.includes(user.id);
                const weAreMutual = mutual.includes(user.id);
                const inMyTeam = team.members.some(m => m.id === user.id);
                const pendingApp = sent.find(a => a.toUserId === user.id && a.kind === 'invitation' && a.status === 'pending');
                const canInvite = isLeader(team) && weAreMutual && !inMyTeam && !pendingApp && team.members.length < 5;
                return (
                  <div key={user.id} className="flex items-center justify-between p-3.5 doa-panel text-xs gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0B1B3A] truncate">{user.name}</span>
                        {inMyTeam && (
                          <span className="text-[10px] font-bold text-[#00C48C] bg-[#00C48C]/10 px-2 py-0.5 rounded-full shrink-0">
                            {tr('队内成员', 'On team')}
                          </span>
                        )}
                        {weAreMutual && !inMyTeam && (
                          <span className="text-[10px] font-bold text-[#165DFF] bg-[#165DFF]/10 px-2 py-0.5 rounded-full shrink-0">
                            互相关注
                          </span>
                        )}
                      </div>
                      <div className="text-[#888888] mt-0.5 truncate">{user.roleTitle}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleFollow(user)}
                        disabled={busyId !== null || inMyTeam}
                        className={`px-3 py-1.5 rounded-full font-semibold border transition-colors disabled:opacity-40 ${
                          iFollow
                            ? 'text-[#666666] border-[#E8EAED] hover:text-red-500 hover:border-red-200'
                            : 'text-[#165DFF] border-[#165DFF]/40 hover:bg-[#165DFF]/5'
                        }`}
                      >
                        {iFollow ? '取消关注' : '关注'}
                      </button>
                      {pendingApp ? (
                        <span className="px-3 py-1.5 rounded-full font-semibold bg-[#FF8A1F]/10 text-[#C06200] flex items-center gap-1">
                          <Send className="w-3 h-3" /> 待对方处理
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendApplication(user)}
                          disabled={!canInvite || busyId !== null}
                          title={
                            !isLeader(team)
                              ? '只有队长可以发送组队申请'
                              : !weAreMutual
                                ? '需要双方互相关注后才能发送'
                                : inMyTeam
                                  ? '已在队内'
                                  : undefined
                          }
                          className="px-3 py-1.5 rounded-full font-semibold text-white bg-[#165DFF] hover:bg-[#1453E6] disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> 邀请入队
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>


        </>
      )}

          {/* ---- 我发出的申请 ---- */}
          {sent.length > 0 && (
            <div className="doa-card p-8 space-y-3">
              <h3 className="text-base font-bold text-[#0B1B3A]">{tr('我发出的组队申请', 'My Invites')}（{sent.length}）</h3>
              {sent.map(app_ => (
                <div key={app_.id} className="flex items-center justify-between p-3.5 doa-panel text-xs">
                  <span>
                    <span className="font-bold text-[#0B1B3A]">{app_.toName}</span>
                    <span className="text-[#888888]"> · {app_.teamName}</span>
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full font-semibold ${
                      app_.status === 'accepted'
                        ? 'bg-[#00C48C]/10 text-[#00876A]'
                        : app_.status === 'declined'
                          ? 'bg-red-50 text-red-500'
                          : 'bg-[#FF8A1F]/10 text-[#C06200]'
                    }`}
                  >
                    {app_.status === 'accepted' ? tr('已同意', 'Accepted') : app_.status === 'declined' ? tr('已拒绝', 'Declined') : tr('待处理', 'Pending')}
                  </span>
                </div>
              ))}
            </div>
          )}
      {/* 收到的申请提醒入口 */}
      {received.length > 0 && (
        <button
          onClick={() => setNotificationDrawerOpen(true)}
          className="text-xs font-semibold text-[#165DFF] hover:underline flex items-center gap-1"
        >
          同步查看站内通知 <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
