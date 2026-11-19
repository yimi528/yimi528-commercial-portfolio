import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, ChevronRight, FileText, Inbox, Loader2, RefreshCw, Search, Trash2, TriangleAlert, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatPostDate } from '../../lib/time';
import { newestRecruitmentFirst } from '../../lib/communityApi';
import type { RecruitmentPost } from '../../types';

type Status = 'all' | RecruitmentPost['status'];
const control = 'h-10 rounded-lg border border-[#DCE5F2] bg-white px-3 text-[13px] text-[#48597A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#165DFF] disabled:opacity-50';
const action = 'inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#165DFF] disabled:opacity-50';

export const RecruitmentManagementPanel: React.FC = () => {
  const { recruitments, recruitmentsLoading: loading, recruitmentsError: loadError, reloadRecruitments, delistRecruitment, setActiveRoute, tr } = useApp();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('all');
  const [track, setTrack] = useState('all');
  const [sort, setSort] = useState('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useRef(false);
  const mounted = useRef(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const selected = recruitments.find(post => post.id === selectedId);
  const open = Boolean(selected);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = previousOverflow; };
  }, [open]);

  const resetFilters = () => { setQuery(''); setStatus('all'); setTrack('all'); };
  const viewPost = (id: string) => {
    setConfirming(false); setAcknowledged(false); setError(''); setSelectedId(id);
  };
  const close = () => { if (!pending.current) setSelectedId(null); };
  const deletePost = async () => {
    if (!selected || !acknowledged || pending.current || loading || loadError) return;
    pending.current = true; setSaving(true); setError('');
    try {
      const result = await delistRecruitment(selected.id);
      if (!mounted.current) return;
      if (!result.ok) { setError(result.message || tr('删除失败，请重试。', 'Deletion failed. Please retry.')); return; }
      setSelectedId(null);
      setNotice(tr(`已删除「${selected.title}」，广场不再展示该帖子。`, `“${selected.title}” was deleted and removed from the square.`));
    } catch {
      if (mounted.current) setError(tr('删除失败，请检查网络后重试。', 'Deletion failed. Check your connection and retry.'));
    } finally {
      pending.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  const normalized = query.trim().toLocaleLowerCase();
  const filtered = recruitments.filter(post =>
    (status === 'all' || post.status === status) && (track === 'all' || post.track === track) &&
    (!normalized || [post.title, post.summary, post.leader.name, post.city, ...post.skills, ...post.neededRoles].some(value => value.toLocaleLowerCase().includes(normalized)))
  ).sort(sort === 'newest' ? newestRecruitmentFirst : (a, b) => b.applicationsCount - a.applicationsCount || newestRecruitmentFirst(a, b));
  const hasFilters = Boolean(normalized || status !== 'all' || track !== 'all');
  const statusLabel = (value: RecruitmentPost['status']) => value === 'open' ? tr('招募中', 'Recruiting') : tr('已招满', 'Filled');
  const trackLabel = (value: RecruitmentPost['track']) => value === 'industry' ? tr('FDE 赛道', 'Industry') : tr('自由创意赛道', 'Creator');
  const stageLabel = (value: RecruitmentPost['stage']) => ({ idea: tr('构思阶段', 'Idea'), prototype: tr('原型阶段', 'Prototype'), demo: tr('Demo 阶段', 'Demo') })[value];

  return (
    <div className="space-y-4 [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed">
      {notice && <div role="status" className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><p className="min-w-0 flex-1 break-words">{notice}</p><button type="button" onClick={() => setNotice('')} aria-label={tr('关闭提示', 'Dismiss message')} className="rounded p-1 focus-visible:outline-2"><X className="h-4 w-4" /></button></div>}
      <div className="overflow-hidden rounded-xl border border-[#E3ECFA] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-x-4 border-b border-[#E3ECFA] px-4 sm:px-5">
          <div role="group" aria-label={tr('按招募状态筛选', 'Filter by recruitment status')} className="flex gap-4 sm:gap-6">
            {(['all', 'open', 'filled'] as const).map(value => <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)} className={`relative flex min-h-14 items-center gap-2 border-b-2 px-0.5 text-[13px] focus-visible:outline-2 focus-visible:outline-[#165DFF] ${status === value ? 'border-[#165DFF] font-semibold text-[#165DFF]' : 'border-transparent text-[#6B7C9B] hover:text-[#0B1B3A]'}`}>
              {value === 'all' ? tr('全部帖子', 'All posts') : statusLabel(value)}<span className="text-[11px] tabular-nums opacity-75">{loading || loadError ? '—' : value === 'all' ? recruitments.length : recruitments.filter(post => post.status === value).length}</span>
            </button>)}
          </div>
          <button type="button" disabled={loading} onClick={() => void reloadRecruitments()} className={`${action} my-1 text-[#48597A] hover:bg-[#F3F7FD]`}><RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} />{tr('刷新', 'Refresh')}</button>
        </div>
        <div className="flex flex-wrap gap-2 bg-[#F8FAFD] p-4 sm:px-5">
          <label className="relative min-w-0 flex-[1_1_220px]">
            <span className="sr-only">{tr('搜索招募帖', 'Search recruitment posts')}</span><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#8B9AB1]" />
            <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={tr('搜索标题、发起人、技能…', 'Search titles, founders, skills…')} className={`${control} w-full pl-9`} />
          </label>
          <label><span className="sr-only">{tr('筛选赛道', 'Filter by track')}</span><select value={track} onChange={event => setTrack(event.target.value)} className={`${control} max-w-full`}><option value="all">{tr('全部赛道', 'All tracks')}</option><option value="industry">{tr('FDE 赛道', 'Industry')}</option><option value="creator">{tr('自由创意赛道', 'Creator')}</option></select></label>
          <label><span className="sr-only">{tr('排序方式', 'Sort order')}</span><select value={sort} onChange={event => setSort(event.target.value)} className={control}><option value="newest">{tr('最新发布', 'Newest first')}</option><option value="applications">{tr('申请最多', 'Most applications')}</option></select></label>
        </div>

        {loading ? <div role="status" className="px-5 py-12 text-center text-sm text-[#6B7C9B]"><Loader2 aria-hidden="true" className="mx-auto mb-3 h-5 w-5 animate-spin motion-reduce:animate-none text-[#165DFF]" />{tr('正在读取招募帖…', 'Loading recruitment posts…')}</div>
          : loadError ? <div role="alert" className="px-5 py-14 text-center"><TriangleAlert aria-hidden="true" className="mx-auto mb-4 h-7 w-7 text-[#B76B17]" /><h3 className="font-semibold text-[#0B1B3A]">{tr('招募帖暂时无法读取', 'Recruitment posts could not be loaded')}</h3><p className="mt-2 text-[13px] text-[#6B7C9B]">{tr('请检查网络后重试。', 'Check your connection and try again.')}</p><button type="button" onClick={() => void reloadRecruitments()} className={`${action} mt-5 border border-[#DCE5F2] text-[#165DFF] hover:bg-[#F3F7FD]`}>{tr('重新加载', 'Retry')}</button></div>
          : filtered.length === 0 ? <div className="px-5 py-16 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF5FF] text-[#165DFF]">{hasFilters ? <Search aria-hidden="true" className="h-6 w-6" /> : <Inbox aria-hidden="true" className="h-7 w-7" />}</div>
            <h3 className="text-base font-semibold text-[#0B1B3A]">{hasFilters ? tr('没有符合条件的招募帖', 'No matching posts') : tr('广场还没有招募帖', 'No recruitment posts yet')}</h3>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-[#6B7C9B]">{hasFilters ? tr('试试其他关键词，或清除筛选查看全部帖子。', 'Try another keyword or clear the filters to see all posts.') : tr('创客发布组队招募后，会在这里展示。你可以查看帖子内容，并处理不当信息。', 'Posts will appear here when makers start recruiting. Review their content and manage inappropriate posts.')}</p>
            <button type="button" onClick={hasFilters ? resetFilters : () => setActiveRoute('square/recruit')} className={`${action} mt-6 border border-[#DCE5F2] text-[#165DFF] hover:bg-[#F3F7FD]`}>{hasFilters ? tr('清除筛选', 'Clear filters') : tr('前往组队广场', 'Visit Team Square')}{!hasFilters && <ArrowUpRight aria-hidden="true" className="h-4 w-4" />}</button>
          </div> : <>
            <div className="hidden grid-cols-[minmax(0,1fr)_110px_72px_100px] gap-4 border-y border-[#EDF1F7] px-5 py-3 text-[11px] text-[#6B7C9B] xl:grid" aria-hidden="true"><span>{tr('招募内容', 'Recruitment post')}</span><span>{tr('发起人 / 发布日期', 'Founder / Date')}</span><span className="text-right">{tr('申请人数', 'Applicants')}</span><span className="text-right">{tr('操作', 'Actions')}</span></div>
            <ul className="divide-y divide-[#EDF1F7]">
              {filtered.map(post => <li key={post.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-5 hover:bg-[#FAFCFF] sm:px-5 xl:grid-cols-[minmax(0,1fr)_110px_72px_100px]">
                <div className="col-span-2 min-w-0 xl:col-span-1"><div className="mb-2 flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-medium ${post.status === 'open' ? 'bg-[#EAF7F0] text-[#23734D]' : 'bg-[#F0F2F5] text-[#627087]'}`}><span className="h-1 w-1 rounded-full bg-current" />{statusLabel(post.status)}</span><span className="text-[11px] text-[#6B7C9B]">{trackLabel(post.track)}</span></div><button type="button" onClick={() => viewPost(post.id)} className="line-clamp-2 break-words text-left text-[15px] font-semibold leading-6 text-[#0B1B3A] hover:text-[#165DFF] focus-visible:outline-2 focus-visible:outline-[#165DFF]">{post.title}</button><p className="mt-1 line-clamp-1 break-words text-xs leading-5 text-[#6B7C9B]">{post.summary}</p></div>
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs xl:block"><p className="truncate text-[#48597A]">{post.leader.name}</p><time dateTime={post.createdAt} className="mt-1 block text-[11px] tabular-nums text-[#8B9AB1]">{formatPostDate(post.createdAt)}</time></div>
                <p className="text-xs tabular-nums text-[#48597A] xl:text-right">{post.applicationsCount}<span className="ml-1 xl:sr-only">{tr('人申请', 'applicants')}</span></p>
                <button type="button" onClick={() => viewPost(post.id)} aria-label={tr(`查看与处理：${post.title}`, `Review: ${post.title}`)} className={`${action} col-span-2 justify-self-end px-0 text-[#165DFF] hover:underline xl:col-span-1`}>{tr('查看与处理', 'Review')}<ChevronRight aria-hidden="true" className="h-3.5 w-3.5" /></button>
              </li>)}
            </ul>
          </>}
        {!loading && !loadError && recruitments.length > 0 && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E3ECFA] px-5 py-3 text-xs text-[#6B7C9B]"><span>{tr(`当前列表 ${recruitments.length} 条，筛选后 ${filtered.length} 条`, `${filtered.length} of ${recruitments.length} loaded posts`)}</span>{hasFilters && <button type="button" onClick={resetFilters} className="min-h-8 text-[#165DFF] hover:underline focus-visible:outline-2">{tr('清除筛选', 'Clear filters')}</button>}</div>}
      </div>
      <div className="flex items-start gap-2 px-1 text-xs leading-5 text-[#6B7C9B]"><FileText aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>{tr('招募中和已招满的帖子都可能在广场展示。请先查看内容，再决定是否删除。', 'Recruiting and filled posts can both appear in the square. Review the content before deleting a post.')}</p></div>

      <dialog ref={dialog} aria-labelledby="recruitment-review-title" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-full max-w-[560px] border-0 bg-white p-0 text-[#0B1B3A] shadow-2xl backdrop:bg-[#0B1B3A]/35 open:flex open:flex-col">
        {selected && <>
          <header className="flex shrink-0 items-center justify-between border-b border-[#E3ECFA] px-5 py-4 sm:px-7"><h3 id="recruitment-review-title" className="text-base font-semibold">{tr('查看与处理招募帖', 'Review recruitment post')}</h3><button type="button" autoFocus disabled={saving} onClick={close} aria-label={tr('关闭详情', 'Close details')} className={`${action} px-2 text-[#6B7C9B] hover:bg-[#F3F7FD]`}><X aria-hidden="true" className="h-5 w-5" /></button></header>
          <div className="min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7">
            <div><div className="flex flex-wrap gap-2 text-xs text-[#6B7C9B]"><span className="font-medium text-[#23734D]">{statusLabel(selected.status)}</span><span>{trackLabel(selected.track)}</span></div><h4 className="mt-3 break-words text-2xl font-semibold leading-snug">{selected.title}</h4></div>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-5 border-y border-[#E3ECFA] py-5 text-[13px]">{[
              [tr('发起人', 'Founder'), selected.leader.name], [tr('发布日期', 'Published'), formatPostDate(selected.createdAt)],
              [tr('项目阶段', 'Stage'), stageLabel(selected.stage)], [tr('已有申请', 'Applicants'), tr(`${selected.applicationsCount} 人`, `${selected.applicationsCount}`)],
              [tr('所在城市', 'City'), selected.city || tr('未填写', 'Not specified')], [tr('协作方式', 'Collaboration'), selected.isRemote ? tr('可远程协作', 'Remote OK') : tr('需到场协作', 'On-site')],
            ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-[#6B7C9B]">{label}</dt><dd className="mt-1.5 break-words font-medium text-[#0B1B3A]">{value}</dd></div>)}</dl>
            <section><h5 className="text-sm font-semibold">{tr('招募介绍', 'About the recruitment')}</h5><p className="mt-3 whitespace-pre-wrap break-words text-[13px] leading-7 text-[#48597A]">{selected.summary || tr('未填写介绍', 'No introduction provided')}</p></section>
            {[[tr('招募角色', 'Roles needed'), selected.neededRoles], [tr('相关技能', 'Skills'), selected.skills]].map(([label, values]) => <section key={label as string}><h5 className="text-sm font-semibold">{label}</h5><div className="mt-3 flex flex-wrap gap-2">{(values as string[]).length ? (values as string[]).map((value, index) => <span key={`${value}-${index}`} className="max-w-full break-words rounded-md bg-[#F1F5FB] px-2.5 py-1.5 text-xs text-[#48597A]">{value}</span>) : <span className="text-xs text-[#6B7C9B]">{tr('未填写', 'Not specified')}</span>}</div></section>)}
          </div>
          <footer className="max-h-[50dvh] shrink-0 space-y-3 overflow-y-auto border-t border-[#E3ECFA] bg-[#FAFBFD] px-5 py-5 sm:px-7">
            {confirming ? <>
              <div className="flex items-start gap-2"><TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /><div><h5 className="text-sm font-semibold text-red-700">{tr('永久删除这条招募帖？', 'Permanently delete this post?')}</h5><p className="mt-1.5 text-xs leading-5 text-[#6B7C9B]">{tr(`帖子及其 ${selected.applicationsCount} 条申请明细将被删除，广场不再展示。此操作无法撤销。`, `The post and its ${selected.applicationsCount} applications will be deleted and removed from the square. This cannot be undone.`)}</p></div></div>
              <label className="flex cursor-pointer items-start gap-2 py-1 text-xs leading-5 text-[#48597A]"><input type="checkbox" checked={acknowledged} disabled={saving} onChange={event => setAcknowledged(event.target.checked)} className="mt-1 accent-red-600" />{tr('我已核对内容，确认永久删除帖子及申请明细', 'I reviewed the content and confirm permanent deletion of the post and applications')}</label>
              {error && <p role="alert" className="break-words text-xs text-red-700">{error}</p>}
              <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => { setConfirming(false); setAcknowledged(false); setError(''); }} className={`${action} border border-[#DCE5F2] bg-white text-[#48597A]`}>{tr('取消', 'Cancel')}</button><button type="button" disabled={!acknowledged || saving || loading || loadError} onClick={() => void deletePost()} className={`${action} bg-red-600 text-white hover:bg-red-700`}>{saving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Trash2 aria-hidden="true" className="h-4 w-4" />}{saving ? tr('正在删除…', 'Deleting…') : tr('确认永久删除', 'Confirm permanent deletion')}</button></div>
            </> : <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#6B7C9B]">{tr('发现不当内容？删除后无法恢复。', 'Inappropriate content? Deletion cannot be undone.')}</p><button type="button" disabled={loading || loadError} onClick={() => setConfirming(true)} className={`${action} border border-red-200 bg-white text-red-600 hover:bg-red-50`}><Trash2 aria-hidden="true" className="h-3.5 w-3.5" />{tr('删除招募帖', 'Delete post')}</button></div>}
          </footer>
        </>}
      </dialog>
    </div>
  );
};
