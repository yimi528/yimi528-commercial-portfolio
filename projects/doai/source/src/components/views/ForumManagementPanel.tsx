import { useForumClock } from '../../lib/useForumClock';
import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, Plus, Pencil, RefreshCw, X, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { loadManagedForums, saveManagedForum, type ForumCatalogue, type ManagedForum } from '../../lib/forumCatalogueApi';

const blank = (): Partial<ManagedForum> => ({ title: '', titleEn: '', track: '', trackEn: '', venue: '', venueEn: '', description: '', descriptionEn: '', startsAt: '', endsAt: '', capacity: null, bookingEnabled: false, publication: 'draft', speakers: [] });
const inputClass = 'doa-input w-full min-w-0';
export const ForumManagementPanel: React.FC = () => {
  const { currentUser, reloadForums, reloadForumStats, tr } = useApp();
  const [catalogue, setCatalogue] = useState<ForumCatalogue | null>(null);
  const now = useForumClock(catalogue?.forums || []);
  const [draft, setDraft] = useState<Partial<ManagedForum> | null>(null);
  const [loading, setLoading] = useState(true), [pending, setPending] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all'), [deleteId, setDeleteId] = useState('');
  const epoch = useRef(0), busy = useRef(false);
  const editorTitle = useRef<HTMLInputElement>(null);
  const load = async () => {
    const version = ++epoch.current;
    setLoading(true); setError('');
    try { const result = await loadManagedForums(); if (version === epoch.current) setCatalogue(result); }
    catch (err) { if (version === epoch.current) setError(err instanceof Error ? err.message : tr('场次加载失败，请重试', 'Could not load sessions. Please retry.')); }
    finally { if (version === epoch.current) setLoading(false); }
  };
  useEffect(() => { setCatalogue(null); setDraft(null); void load(); return () => { ++epoch.current; }; }, [currentUser?.id]);
  useEffect(() => { if (draft) editorTitle.current?.focus(); }, [draft?.id, Boolean(draft)]);
  const persist = async (forum: Partial<ManagedForum>, deleting = false) => {
    if (!catalogue || busy.current || loading) return;
    const version = epoch.current;
    busy.current = true; setPending(true); setError(''); setMessage('');
    try {
      const result = await saveManagedForum(forum, catalogue.version, deleting);
      if (version !== epoch.current) return;
      setCatalogue(result); setDraft(null); setDeleteId(''); setPending(false);
      setMessage(deleting ? tr('草稿已删除', 'Draft deleted') : tr('场次已保存', 'Session saved'));
      void reloadForums(); void reloadForumStats(); void load();
    } catch (err) {
      if (version !== epoch.current) return;
      setError(err instanceof Error ? err.message : tr('保存失败，请重试', 'Could not save. Please retry.'));
    } finally { busy.current = false; if (version === epoch.current) setPending(false); }
  };
  const fields = [
    ['title', '论坛议题', 'Topic', true], ['titleEn', '英文议题（选填）', 'English topic (optional)', false],
    ['track', '论坛分类（选填）', 'Category (optional)', false], ['trackEn', '英文分类（选填）', 'English category (optional)', false],
    ['venue', '场地', 'Venue', true], ['venueEn', '英文场地（选填）', 'English venue (optional)', false],
  ] as const;
  const rows = (catalogue?.forums || []).filter(f => filter === 'all' || f.publication === filter);
  const activeBookings = draft?.bookedCount ?? catalogue?.forums.find(f => f.id === draft?.id)?.bookedCount ?? 0;
  return <section aria-label={tr('论坛场次管理', 'Forum session management')} className="pt-6 space-y-5 min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="font-bold text-lg">{tr('场次与预约', 'Sessions & reservations')}</h3><p className="text-sm text-[#6B7C9B] mt-1">{tr('确认排期后发布，发布场次会展示在前台论坛列表。', 'Publish confirmed sessions to the public forum programme.')}</p></div>
      <div className="flex gap-2"><button type="button" onClick={() => void load()} disabled={loading || pending} className="doa-btn doa-btn-secondary disabled:opacity-50" aria-label={tr('刷新场次', 'Refresh sessions')}><RefreshCw size={16} /></button><button type="button" onClick={() => { setDraft(blank()); setMessage(''); setDeleteId(''); }} disabled={!catalogue || loading || pending || Boolean(draft)} className="doa-btn doa-btn-primary disabled:opacity-50"><Plus size={16} />{tr('新增场次', 'New session')}</button></div>
    </div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" onClick={() => void load()} disabled={pending || loading} className="ml-3 underline">{tr('重新加载场次', 'Reload sessions')}</button></div>}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    {draft && <form onSubmit={event => { event.preventDefault(); void persist(draft); }} className="doa-card p-5 sm:p-6 space-y-5" aria-label={tr('场次编辑', 'Session editor')}>
      <div className="flex items-center justify-between"><h4 className="font-bold">{draft.id ? tr('编辑场次', 'Edit session') : tr('新增场次', 'New session')}</h4><button type="button" disabled={pending} onClick={() => setDraft(null)} aria-label={tr('关闭编辑', 'Close editor')}><X size={20} /></button></div>
      <fieldset disabled={pending} className="space-y-5 min-w-0">
        <div className="grid sm:grid-cols-2 gap-4">{fields.map(([key, zh, en, required]) => <label key={key} className="block text-sm space-y-2"><span>{tr(zh, en)}{required && ' *'}</span><input ref={key === 'title' ? editorTitle : undefined} name={key} value={String(draft[key] || '')} required={required} maxLength={128} onChange={e => setDraft({ ...draft, [key]: e.target.value })} className={inputClass} /></label>)}</div>
        <div className="grid sm:grid-cols-2 gap-4">{(['startsAt', 'endsAt'] as const).map(key => <label key={key} className="block text-sm space-y-2"><span>{key === 'startsAt' ? tr('开始时间（上海）', 'Start (Shanghai)') : tr('结束时间（上海）', 'End (Shanghai)')} *</span><input name={key} type="datetime-local" required value={(draft[key] || '').slice(0,16)} onChange={e => setDraft({ ...draft, [key]: e.target.value ? `${e.target.value}:00+08:00` : '' })} className={inputClass} /></label>)}</div>
        {activeBookings > 0 && <p className="text-xs text-[#6B7C9B]">{tr('已有预约，时间和场地不能变更；仍可编辑介绍、暂停预约或下架。', 'Existing reservations prevent time or venue changes. You can edit descriptions, pause bookings or unpublish.')}</p>}
        {(['description', 'descriptionEn'] as const).map(key => <label key={key} className="block text-sm space-y-2"><span>{key === 'description' ? tr('论坛介绍 *', 'Description *') : tr('英文介绍（选填）', 'English description (optional)')}</span><textarea name={key} required={key === 'description'} value={draft[key] || ''} rows={3} maxLength={4000} onChange={e => setDraft({ ...draft, [key]: e.target.value })} className={inputClass} /></label>)}
        <div className="space-y-3"><div className="flex justify-between items-center"><h5 className="text-sm font-semibold">{tr('主讲嘉宾（选填）', 'Speakers (optional)')}</h5><button type="button" className="text-sm text-[#165DFF]" disabled={(draft.speakers?.length || 0) >= 30} onClick={() => setDraft({ ...draft, speakers: [...(draft.speakers || []), { name: '', nameEn: '', role: '', roleEn: '', org: '', avatar: '' }] })}>{tr('添加嘉宾', 'Add speaker')}</button></div>
          {(draft.speakers || []).map((speaker, index) => <div key={index} className="rounded-xl bg-[#F7FAFF] p-4 space-y-3"><div className="flex justify-between text-sm"><span>{tr('嘉宾', 'Speaker')} {index + 1}</span><button type="button" className="text-red-600" onClick={() => setDraft({ ...draft, speakers: draft.speakers!.filter((_, i) => i !== index) })}>{tr('移除', 'Remove')}</button></div><div className="grid sm:grid-cols-2 gap-3">{(['name', 'nameEn', 'role', 'roleEn', 'org', 'avatar'] as const).map((key, i) => <label key={key} className="text-xs space-y-1 block"><span>{tr(['姓名 *','英文姓名','身份／职务','英文职务','机构','头像链接'][i], ['Name *','English name','Role','English role','Organisation','Avatar URL'][i])}</span><input required={key === 'name'} type={key === 'avatar' ? 'url' : 'text'} value={speaker[key]} maxLength={key === 'avatar' ? 512 : 128} onChange={e => setDraft({ ...draft, speakers: draft.speakers!.map((row, n) => n === index ? { ...row, [key]: e.target.value } : row) })} className={inputClass} /></label>)}</div></div>)}
        </div>
        <div className="grid sm:grid-cols-2 gap-4"><label className="block text-sm space-y-2"><span>{tr('人数上限（留空不限）', 'Capacity (blank = unlimited)')}</span><input name="capacity" type="number" min={1} max={100000} step={1} value={draft.capacity ?? ''} onChange={e => setDraft({ ...draft, capacity: e.target.value === '' ? null : Number(e.target.value) })} className={inputClass} /></label><label className="block text-sm space-y-2"><span>{tr('发布状态', 'Publication')}</span><select name="publication" value={draft.publication} onChange={e => setDraft({ ...draft, publication: e.target.value as 'draft' | 'published' })} className={inputClass}><option value="draft">{tr('草稿 · 前台隐藏', 'Draft · Hidden')}</option><option value="published">{tr('已发布 · 前台展示', 'Published · Visible')}</option></select></label></div>
        <label className="flex items-center gap-2 text-sm"><input name="bookingEnabled" type="checkbox" checked={Boolean(draft.bookingEnabled)} onChange={e => setDraft({ ...draft, bookingEnabled: e.target.checked })} />{tr('开放预约（发布后生效，结束后自动停止）', 'Accept bookings when published; closes automatically at session end')}</label>
      </fieldset>
      <div className="flex gap-3 justify-end"><button type="button" disabled={pending} onClick={() => setDraft(null)} className="doa-btn doa-btn-secondary">{tr('取消编辑', 'Cancel')}</button><button type="submit" disabled={pending || loading} className="doa-btn doa-btn-primary disabled:opacity-50">{pending ? tr('正在保存…', 'Saving…') : tr('保存场次', 'Save session')}</button></div>
    </form>}
    {catalogue && <div className="flex flex-wrap gap-2" aria-label={tr('按发布状态筛选', 'Filter by publication')}>{[['all','全部','All'],['draft','草稿','Draft'],['published','已发布','Published']].map(([id,zh,en]) => <button type="button" key={id} aria-pressed={filter === id} onClick={() => setFilter(id)} className={`px-4 py-2 rounded-lg text-sm ${filter === id ? 'bg-[#EDF3FF] text-[#165DFF]' : 'text-[#6B7C9B]'}`}>{tr(zh,en)} · {id === 'all' ? catalogue.forums.length : catalogue.forums.filter(f => f.publication === id).length}</button>)}</div>}
    {loading && <p role="status" className="text-sm text-[#6B7C9B]">{tr('正在读取场次…', 'Loading sessions…')}</p>}
    {!loading && catalogue && rows.length === 0 && !draft && <div className="rounded-2xl border border-dashed border-[#CDD9ED] p-10 text-center"><CalendarDays className="mx-auto text-[#165DFF] mb-3" size={28} /><h4 className="font-semibold">{catalogue.forums.length ? tr('暂无该状态的场次', 'No sessions match this filter') : tr('创建第一场论坛', 'Create your first forum')}</h4><p className="mt-2 text-sm text-[#6B7C9B]">{tr('填写议题、时间与场地，可先存草稿，确认后再发布。', 'Add a topic, time and venue. Save a draft, then publish when confirmed.')}</p></div>}
    <div className="space-y-3">{rows.map(forum => {
      const ended = now >= Date.parse(forum.endsAt), full = forum.capacity !== null && forum.bookedCount >= forum.capacity;
      return <article key={forum.id} data-forum-id={forum.id} className="doa-card p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-bold break-words">{tr(forum.title, forum.titleEn)}</h4><span className="text-xs rounded-full px-2 py-1 bg-[#EDF3FF] text-[#165DFF]">{forum.publication === 'draft' ? tr('草稿', 'Draft') : tr('已发布', 'Published')}</span></div><p className="text-sm text-[#6B7C9B] mt-2 break-words">{tr(forum.venue,forum.venueEn)} · {forum.date} {forum.time}</p></div><button type="button" disabled={pending || Boolean(draft) || loading} onClick={() => { setDraft({ ...forum, speakers: forum.speakers.map(s => ({...s})) }); setMessage(''); setDeleteId(''); }} className="doa-btn doa-btn-secondary disabled:opacity-50"><Pencil size={14} />{tr('编辑', 'Edit')}</button></div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#48597A]"><span className="inline-flex items-center gap-2"><Users size={15} />{tr('已预约', 'Reserved')}：{forum.bookedCount ?? '—'} / {forum.capacity ?? tr('不限', 'Unlimited')}</span><span>{tr('已核销', 'Checked in')}：{forum.checkedInCount ?? '—'}</span><span>{forum.publication === 'draft' ? tr('前台隐藏', 'Hidden') : ended ? tr('已结束', 'Ended') : !forum.bookingEnabled ? tr('预约已暂停', 'Bookings paused') : full ? tr('预约已满', 'Full') : tr('预约开放中', 'Bookings open')}</span></div>
        <div className="flex flex-wrap gap-4 text-sm"><button type="button" disabled={pending || loading || Boolean(draft)} className="text-[#165DFF] disabled:opacity-50" onClick={() => void persist({ ...forum, publication: forum.publication === 'published' ? 'draft' : 'published' })}>{forum.publication === 'published' ? tr('下架场次', 'Unpublish') : tr('发布场次', 'Publish')}</button><button type="button" disabled={pending || loading || Boolean(draft)} className="text-[#165DFF] disabled:opacity-50" onClick={() => void persist({ ...forum, bookingEnabled: !forum.bookingEnabled })}>{forum.bookingEnabled ? tr('暂停预约', 'Pause bookings') : tr('开放预约', 'Open bookings')}</button>{forum.publication === 'draft' && !forum.bookedCount && <button type="button" disabled={pending || Boolean(draft)} className="text-red-600 disabled:opacity-50" onClick={() => setDeleteId(forum.id)}>{tr('删除草稿', 'Delete draft')}</button>}</div>
        {deleteId === forum.id && <div className="text-sm flex flex-wrap gap-3 items-center" role="alert"><span>{tr('确认删除此草稿？此操作无法撤销。', 'Delete this draft permanently?')}</span><button type="button" disabled={pending} onClick={() => void persist(forum, true)} className="text-red-600 font-semibold">{tr('确认删除', 'Confirm delete')}</button><button type="button" onClick={() => setDeleteId('')}>{tr('保留', 'Keep')}</button></div>}
      </article>;
    })}</div>
  </section>;
};
