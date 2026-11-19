import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, RefreshCw, Search, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useCommunityBrowse, useCommunityScroll } from '../../lib/communityBrowse';
import { loadPublicTeamPage, type PublicTeam } from '../../lib/publicTeams';

export const CommunityTeams: React.FC<{ active?: boolean }> = ({ active = true }) => {
  const { tr, currentUser, teamRevision, setActiveRoute, setLoginModalOpen } = useApp();
  const [teams, setTeams] = useState<PublicTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useCommunityBrowse('teamSearch', '', currentUser?.id);
  const [page, setPage] = useCommunityBrowse('teamPage', 1, currentUser?.id);
  const [track, setTrack] = useCommunityBrowse('teamTrack', 'all', currentUser?.id);
  const [total, setTotal] = useState(0);
  const [loadedPage, setLoadedPage] = useState(page);
  const [legacy, setLegacy] = useState(false);
  const [query, setQuery] = useState(search);
  useEffect(() => { const timer = window.setTimeout(() => setQuery(search), 250); return () => window.clearTimeout(timer); }, [search]);
  const reload = useRef<() => void>(() => {});

  useEffect(() => {
    if (!active) return;
    let live = true, reading = false;
    const sync = async () => {
      if (reading) return;
      reading = true;
      setLoading(true);
      try {
        const result = await loadPublicTeamPage(page, query, track);
        if (live) { setTeams(result.teams); setTotal(result.total); setLoadedPage(result.page); setLegacy(result.legacy); setFailed(false); }
      } catch { if (live) setFailed(true); }
      finally { reading = false; if (live) setLoading(false); }
    };
    reload.current = () => { void sync(); };
    const visibleSync = () => { if (!document.hidden) void sync(); };
    void sync();
    const timer = window.setInterval(visibleSync, 10000);
    window.addEventListener('focus', visibleSync);
    document.addEventListener('visibilitychange', visibleSync);
    return () => {
      live = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', visibleSync);
      document.removeEventListener('visibilitychange', visibleSync);
    };
  }, [page, query, track, currentUser?.id, active]);
  useEffect(() => { if (teamRevision) reload.current(); }, [teamRevision]);

  const pageCount = Math.max(1, Math.ceil(total / 6));
  const currentPage = Math.min(loadedPage, pageCount);
  // Restore after the asynchronous grid has rendered, rather than against a loading shell.
  useCommunityScroll(`${currentUser?.id || 'anonymous'}:teams`, !loading, active);
  const manage = () => { if (currentUser) setActiveRoute('dashboard/team'); else setLoginModalOpen(true); };

  return (
    <section aria-labelledby="community-teams-title" className="mt-8 mb-10 rounded-3xl border border-[#D5E1F1] bg-[#F7FAFF] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="community-teams-title" className="flex items-center gap-2 text-xl font-bold text-[#0B1B3A]"><Users className="h-5 w-5 text-[#165DFF]" />{tr('社区战队', 'Community Teams')} <span className="text-sm font-medium text-[#6B7C9B]">{total}</span></h2>
          <p className="mt-2 text-xs leading-relaxed text-[#6B7C9B]">{tr('已创建的战队自动同步到这里，每 10 秒更新。', 'Created teams appear here automatically and refresh every 10 seconds.')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={loading} onClick={() => reload.current()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#165DFF] disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />{tr('刷新战队', 'Refresh teams')}</button>
          <button type="button" onClick={manage} className="inline-flex items-center gap-1.5 rounded-full bg-[#165DFF] px-4 py-2.5 text-xs font-semibold text-white">{tr(currentUser ? '我的战队' : '创建或加入战队', currentUser ? 'My team' : 'Create or join a team')}<ArrowRight className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative min-w-0 flex-1"><span className="sr-only">{tr('搜索战队', 'Search teams')}</span><Search className="absolute left-3 top-3 h-4 w-4 text-[#98A6BE]" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={tr('搜索队名、成员或简介', 'Search team, member or description')} className="w-full rounded-xl border border-[#D5E1F1] bg-white py-2.5 pl-9 pr-3 text-sm" /></label>
        <label><span className="sr-only">{tr('战队赛道', 'Team track')}</span><select aria-label={tr('战队赛道', 'Team track')} value={track} onChange={e => { setTrack(e.target.value); setPage(1); }} className="w-full rounded-xl border border-[#D5E1F1] bg-white px-3 py-2.5 text-sm sm:w-44"><option value="all">{tr('全部赛道', 'All tracks')}</option><option value="creator">{tr('自由创意赛道', 'Free Creation')}</option><option value="industry">{tr('FDE 赛道', 'FDE')}</option></select></label>
      </div>
      {legacy && total >= 500 && <p role="status" className="mt-4 text-xs text-[#9A5B00]">{tr('当前服务仍限制返回 500 支战队，需要更新服务才能浏览完整列表。', 'The current service returns at most 500 teams. A service update is required for the complete directory.')}</p>}
      {failed && <div role="status" className="mt-4 text-xs text-[#9A5B00]">{tr(teams.length ? '战队同步失败，当前保留上次成功读取的列表，请刷新重试。' : '战队暂时无法加载，请刷新重试。', teams.length ? 'Sync failed. Showing the last confirmed list; refresh to retry.' : 'Teams could not load. Refresh to retry.')}</div>}
      {loading && !teams.length && <p role="status" className="py-8 text-center text-sm text-[#6B7C9B]">{tr('正在加载战队…', 'Loading teams…')}</p>}
      {!loading && !failed && !teams.length && <p className="py-8 text-center text-sm text-[#6B7C9B]">{tr((query || track !== 'all') ? '没有符合条件的战队' : '还没有战队，创建第一支战队吧', (query || track !== 'all') ? 'No matching teams' : 'No teams yet. Create the first one.')}</p>}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map(team => {
          const mine = team.members.some(m => m.id === currentUser?.id);
          return <article key={team.id} data-team-id={team.id} className="relative min-w-0 rounded-2xl border border-[#E3ECFA] bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold"><span className="rounded-full bg-[#EFF5FF] px-2.5 py-1 text-[#165DFF]">{team.track === 'industry' ? tr('FDE 赛道', 'FDE') : tr('自由创意赛道', 'Free Creation')}</span>{mine && <span className="text-[#008C64]">{tr('我的战队', 'My team')}</span>}<span className="ml-auto text-[#6B7C9B]">{team.members.length}/5 · {team.members.length === 5 ? tr('已满员', 'Full') : tr('招募中', 'Open')}</span></div>
            <h3 className="break-words text-base font-bold text-[#0B1B3A]"><a href={`${import.meta.env.BASE_URL}detail/team/${encodeURIComponent(team.id)}`} onClick={e => { e.preventDefault(); setActiveRoute(`detail/team/${team.id}`); }} className="hover:text-[#165DFF] after:absolute after:inset-0">{team.name}</a></h3>
            {team.description && <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-[#6B7C9B]">{team.description}</p>}
            <ul className="mt-4 flex flex-wrap gap-2" aria-label={tr('战队成员', 'Team members')}>{team.members.map(member => <li key={member.id} className="max-w-full break-words rounded-lg bg-[#F7F8FA] px-2.5 py-1.5 text-xs text-[#48597A]">{member.name}{member.isLeader && <span className="ml-1.5 text-[#165DFF]">{tr('队长', 'Captain')}</span>}</li>)}</ul>
            {!mine && <p className="mt-4 text-xs font-semibold text-[#165DFF]">{tr('查看详情与入队申请 →', 'Details & application →')}</p>}
            {mine && <button type="button" onClick={manage} className="relative z-10 mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#165DFF]">{tr('管理战队', 'Manage team')}<ArrowRight className="h-3 w-3" /></button>}
          </article>;
        })}
      </div>
      {total > 0 && <nav aria-label={tr('战队翻页', 'Team pages')} className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs"><button disabled={loading || currentPage === 1} onClick={() => setPage(currentPage - 1)} className="doa-btn doa-btn-ghost disabled:opacity-40">{tr('上一页', 'Previous')}</button><span aria-live="polite">{tr(`第 ${currentPage} / ${pageCount} 页 · 共 ${total} 支战队`, `Page ${currentPage} / ${pageCount} · ${total} teams`)}</span><button disabled={loading || currentPage === pageCount} onClick={() => setPage(currentPage + 1)} className="doa-btn doa-btn-ghost disabled:opacity-40">{tr('下一页', 'Next')}</button></nav>}
    </section>
  );
};
