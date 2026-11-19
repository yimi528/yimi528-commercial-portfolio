import { Avatar } from '../common/Avatar';
import { ForumStatsStatus } from '../common/ForumStatsStatus';
import { forumRules } from '../../lib/forumSchedule';
import { useForumClock } from '../../lib/useForumClock';
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TicketLoadStatus } from '../common/TicketLoadStatus';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Plus,
  ShieldCheck,
  ExternalLink,
  ArrowUpRight,
  Ticket
} from 'lucide-react';

export const ForumView: React.FC = () => {
  const { forumsLoading, forumsError, reloadForums, forumStatsLoading, forumStatsError, tickets, t, forums, bookForum, cancelForum, ticketsLoading, ticketsError, reloadTickets, forumPending, setActiveRoute, tr } = useApp();
  const now = useForumClock(forums);

  const [filterSlot, setFilterSlot] = useState<'all' | 'morning' | 'afternoon' | 'allday'>('all');

  // 会议结论 2026-10-13：发起分论坛申请不做站内数据收集，直接跳飞书问卷。
  const FORUM_PROPOSE_FORM_URL =
    'https://pcntu7vxqu2m.feishu.cn/share/base/shrcn4bA2qUb1drKi7VVcw3BY1d';

  // Slots follow the plan's 排期建议：上午 / 下午 / 全天。
  const slotOf = (time: string): 'morning' | 'afternoon' | 'allday' => {
    const [start, end] = time.split(' - ').map(v => Number(v.split(':')[0]));
    if (start < 12 && end >= 14) return 'allday';
    if (start < 12) return 'morning';
    return 'afternoon';
  };

  const filteredForums = forums.filter(f => {
    if (filterSlot === 'all') return true;
    return slotOf(f.time) === filterSlot;
  });

  return (
    <div className="pt-24 pb-20">
      {/* 1. Header Banner */}
      <section className="max-w-[1200px] mx-auto px-6 sm:px-8 py-8">
        {forums.length > 0 && <><TicketLoadStatus /><div className="mb-5"><ForumStatsStatus /></div></>}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-[#E8EAED]">
          <div>
            <div className="text-xs font-semibold text-[#165DFF] tracking-wider uppercase mb-1">
              DOAI FORUM & INTELLECTUAL SYMPOSIUM
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#0B1B3A]">
              {tr('DOAI Forum 思想交流中心', 'DOAI Forum — Ideas Hub')}
            </h1>
            <p className="text-[13px] leading-relaxed text-[#6B7C9B] mt-3 flex items-start gap-2 max-w-2xl">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#00B487]" />
              <span>{forums.length ? tr('查看已确认的场次安排，选择感兴趣的论坛预约参与。', 'Explore confirmed sessions and reserve your place.') : tr('分论坛议题与排期待公布，敬请关注。', 'Forum topics and schedules will be announced. Stay tuned.')}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.open(FORUM_PROPOSE_FORM_URL, '_blank', 'noopener')}
              className="px-6 py-2.5 text-xs font-semibold text-[#165DFF] bg-white hover:bg-[#F7F8FA] border border-[#165DFF]/30 rounded-full transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t.forum.proposeBtn}</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </button>
          </div>
        </div>

        {/* Filter Chips Bar */}
        {forums.length > 0 && <div className="mt-8 flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-[#888888] text-[11px] mr-1">{tr('举办时段', 'Time')}:</span>
          {[
            { id: 'all', label: '全部场次', labelEn: 'All', count: forums.length },
            { id: 'morning', label: '上午场', labelEn: 'Morning', count: forums.filter(f => slotOf(f.time) === 'morning').length },
            { id: 'afternoon', label: '下午场', labelEn: 'Afternoon', count: forums.filter(f => slotOf(f.time) === 'afternoon').length },
            { id: 'allday', label: '全天场', labelEn: 'All day', count: forums.filter(f => slotOf(f.time) === 'allday').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterSlot(tab.id as typeof filterSlot)}
              aria-pressed={filterSlot === tab.id}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                filterSlot === tab.id
                  ? 'bg-[#165DFF] text-white'
                  : 'bg-[#F7F8FA] text-[#666666] hover:text-[#0B1B3A] border border-[#E8EAED]'
              }`}
            >
              {tr(tab.label, tab.labelEn)}
              <span className="ml-1.5 opacity-70">{tab.count}</span>
            </button>
          ))}
        </div>}
      </section>

      <section className="max-w-[1200px] mx-auto px-6 sm:px-8 pt-2" aria-label={tr('分论坛场次', 'Forum sessions')}>
        {forumsLoading && <p role="status" className="py-10 text-sm text-[#6B7C9B]">{tr('正在读取场次…', 'Loading sessions…')}</p>}
        {forumsError && <div role="alert" className="py-10 text-sm text-red-700">{tr('场次暂时无法加载', 'Sessions could not be loaded')}<button type="button" onClick={() => void reloadForums()} className="ml-3 underline">{tr('重新加载', 'Retry')}</button></div>}
        {!forumsLoading && !forumsError && forums.length === 0 && <div className="rounded-2xl border border-[#E3ECFA] bg-[#F7FAFF] px-6 py-16 text-center">
          <Calendar className="mx-auto mb-4 h-8 w-8 text-[#165DFF]" />
          <h2 className="text-xl font-bold text-[#0B1B3A]">{tr('分论坛排期待公布', 'Forum programme coming soon')}</h2>
          <p className="mt-3 text-sm text-[#6B7C9B]">{tr('确认后的议题、嘉宾与场次将在这里发布。', 'Confirmed topics, speakers and sessions will be published here.')}</p>
        </div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
          {filteredForums.map(session => {
            const name = tr(session.track, session.trackEn);
            const fullTitle = tr(session.title, session.titleEn);
            const topic = fullTitle.startsWith(name) ? fullTitle.slice(name.length).replace(/^[：:\s]+/, '') : fullTitle;
            const description = tr(session.description, session.descriptionEn);
            const summary = description.startsWith(topic) ? description.slice(topic.length).replace(/^[。.\s]+/, '') : description;
            const slot = slotOf(session.time);
            const rules = forumRules(session.id, now, session);
            const reservation = tickets.find(ticket => ticket.bookingKey === `forum:${session.id}`);
            const checkedIn = reservation?.status === 'checked_in';
            const canCancel = reservation?.status === 'claimed' && Boolean(rules?.cancellationOpen);
            return (
              <article key={session.id} className="forum-session-card relative flex flex-col group">
                <div className="p-5 sm:p-6 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <span className="text-[13px] font-semibold text-[#165DFF]">{name}</span>
                    <span className="text-[11px] font-medium text-[#48597A] bg-[#F2F7FF] rounded-md px-2 py-1">
                      {slot === 'morning' ? tr('上午场', 'Morning') : slot === 'afternoon' ? tr('下午场', 'Afternoon') : tr('全天场', 'All day')}
                    </span>
                  </div>
                  <a
                    href={`${import.meta.env.BASE_URL}detail/forum/${session.id}`}
                    onClick={event => {
                      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                      event.preventDefault();
                      setActiveRoute(`detail/forum/${session.id}`);
                      window.scrollTo({ top: 0, behavior: 'instant' });
                    }}
                    className="block after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-[#165DFF]"
                  >
                    <h3 className="text-xl sm:text-[22px] leading-[1.5] font-bold text-[#0B1B3A] group-hover:text-[#165DFF] transition-colors">{topic}</h3>
                  </a>
                  {summary && <p className="text-[13px] text-[#6B7C9B] leading-relaxed mt-2.5">{summary}</p>}
                  <dl className="mt-5 grid gap-2.5 text-[13px] text-[#48597A]">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <div className="flex items-center gap-2"><dt><Calendar className="w-4 h-4 text-[#6B7C9B]" /><span className="sr-only">{tr('日期', 'Date')}</span></dt><dd>{session.date}</dd></div>
                      <div className="flex items-center gap-2"><dt><Clock className="w-4 h-4 text-[#6B7C9B]" /><span className="sr-only">{tr('时间', 'Time')}</span></dt><dd className="tabular-nums">{session.time}</dd></div>
                    </div>
                    <div className="flex items-start gap-2"><dt><MapPin className="w-4 h-4 mt-0.5 text-[#6B7C9B]" /><span className="sr-only">{tr('地点', 'Venue')}</span></dt><dd>{tr(session.venue, session.venueEn)}</dd></div>
                  </dl>
                  {session.speakers.length > 0 && (
                    <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-[#EDF1F7]">
                      {session.speakers.map(speaker => (
                        <div key={speaker.name} className="flex items-center gap-2.5">
                          <Avatar src={speaker.avatar} name={tr(speaker.name, speaker.nameEn)} className="w-8 h-8 rounded-full object-cover" />
                          <div><div className="text-xs font-semibold text-[#1A2B4D]">{tr(speaker.name, speaker.nameEn)}</div><div className="text-[11px] text-[#6B7C9B]">{tr(speaker.role, speaker.roleEn)}</div></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative z-10 px-5 sm:px-6 py-4 border-t border-[#EDF1F7] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#48597A]"><Ticket className="w-3.5 h-3.5 text-[#165DFF]" />{session.capacity == null ? tr('免费参与 · 席位不限', 'Free entry · Unlimited seats') : tr(`免费参与 · 限 ${session.capacity} 人`, `Free entry · ${session.capacity} seats`)}</div>
                    {!forumStatsLoading && !forumStatsError && session.bookedCount > 0 && <div className="text-[11px] text-[#6B7C9B] mt-1">{session.bookedCount} {tr('人已预约', 'booked')}</div>}
                  </div>
                  {session.isBooked ? (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-[#008765] inline-flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />{tr('已预约', 'Reserved')}</span>
                      {canCancel ? <button type="button" disabled={ticketsLoading || ticketsError || forumPending.includes(session.id)} onClick={() => void cancelForum(session.id)} className="text-xs text-[#6B7C9B] hover:text-[#E5484D] rounded-md px-2 py-2 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#165DFF]">{forumPending.includes(session.id) ? tr('正在处理…', 'Processing…') : tr('取消', 'Cancel')}</button> : <span className="text-xs text-[#6B7C9B]">{checkedIn ? tr('已核销 · 不可取消', 'Checked in · Cannot cancel') : !rules?.cancellationOpen ? tr('已过取消时间', 'Cancellation closed') : tr('暂不可取消', 'Cannot cancel')}</span>}
                    </div>
                  ) : (
                    <button type="button" disabled={ticketsLoading || ticketsError || forumPending.includes(session.id) || !rules?.bookingOpen} onClick={() => void bookForum(session.id)} className="inline-flex items-center justify-center gap-2 min-h-10 px-4 rounded-lg text-xs font-semibold bg-[#165DFF] hover:bg-[#0F47CC] text-white transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#165DFF]">
                      {forumPending.includes(session.id) || ticketsLoading ? tr('正在处理…', 'Processing…') : !rules?.bookingOpen ? Date.parse(session.endsAt || '') <= now ? tr('已结束', 'Ended') : session.bookingEnabled === false ? tr('预约暂停', 'Paused') : tr('预约已满', 'Full') : tr('免费预约', 'Reserve for free')}<ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
