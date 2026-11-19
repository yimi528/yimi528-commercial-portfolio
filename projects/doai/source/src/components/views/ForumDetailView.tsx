import { Avatar } from '../common/Avatar';
import { ForumStatsStatus } from '../common/ForumStatsStatus';
import { forumRules } from '../../lib/forumSchedule';
import { useForumClock } from '../../lib/useForumClock';
import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { apiBase } from '../../lib/api';
import { forumShareLink, forumShareText } from '../../lib/forumShare';
import { ForumBookmarkButton } from '../common/ForumBookmarkButton';
import { DetailShell, NotFound } from '../detail/DetailShell';
import { typeMeta } from '../../data/conference';
import { TicketLoadStatus } from '../common/TicketLoadStatus';
import {
  Calendar, Clock, MapPin, Users, Check, Ticket, Share2,
} from 'lucide-react';

export const ForumDetailView: React.FC<{ id?: string }> = ({ id }) => {
  const { forumsLoading, forumsError, reloadForums, forumStatsLoading, forumStatsError, tickets, forums, bookForum, cancelForum, ticketsLoading, ticketsError, reloadTickets, forumPending, currentUser, setLoginModalOpen, setActiveRoute, tr, lang } = useApp();
  const now = useForumClock(forums);
  const en = lang === 'en';
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const copyPending = useRef(false), copyVersion = useRef(0), mounted = useRef(true), copyTarget = useRef(id);
  const shareInput = useRef<HTMLInputElement>(null); copyTarget.current = id;
  useEffect(() => { mounted.current = true; copyPending.current = false; setCopyStatus('idle'); return () => { mounted.current = false; ++copyVersion.current; }; }, [id]);
  useEffect(() => {
    if (copyStatus === 'error') { shareInput.current?.focus(); shareInput.current?.select(); }
    if (copyStatus !== 'copied') return;
    const timer = window.setTimeout(() => setCopyStatus('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [copyStatus, id]);

  const session = forums.find(f => f.id === id);
  const pending = Boolean(id && forumPending.includes(id));
  const rules = forumRules(id || '', now, session);
  const reservation = tickets.find(ticket => ticket.bookingKey === `forum:${id}`);
  const checkedIn = reservation?.status === 'checked_in';
  const unavailable = session?.isBooked ? reservation?.status !== 'claimed' || !rules?.cancellationOpen : !rules?.bookingOpen;
  const bookedLabel = checkedIn ? tr('已核销 · 不可取消', 'Checked in · Cannot cancel') : !rules?.cancellationOpen ? tr('已预约 · 已过取消时间', 'Reserved · Cancellation closed') : reservation?.status !== 'claimed' ? tr('暂不可取消', 'Cannot cancel') : tr('已预约 · 点击取消', 'Reserved · Cancel');

  if (forumsLoading || forumsError) return <div className="max-w-4xl mx-auto px-6 pt-32 pb-20" role="status">{forumsError ? tr('场次暂时无法加载', 'Sessions could not be loaded') : tr('正在读取场次…', 'Loading sessions…')}{forumsError && <button type="button" onClick={() => void reloadForums()} className="ml-3 underline">{tr('重新加载', 'Retry')}</button>}</div>;
  if (!session) {
    return <NotFound what={tr('该分论坛', 'This forum')} backRoute="forum" backLabel={tr('返回分论坛列表', 'Back to Forums')} />;
  }


  const seatLabel = session.capacity == null ? tr('席位不限', 'Unlimited seats') : tr(`限 ${session.capacity} 人`, `${session.capacity} seats`);
  const closedLabel = Date.parse(session.endsAt || '') <= now ? tr('已结束', 'Ended') : session.bookingEnabled === false ? tr('预约暂停', 'Bookings paused') : tr('预约已满', 'Fully booked');
  const forumName = tr(session.track, session.trackEn);
  const fullTitle = tr(session.title, session.titleEn);
  const topic = fullTitle.startsWith(forumName) ? fullTitle.slice(forumName.length).replace(/^[：:\s]+/, '') : fullTitle;
  const description = tr(session.description, session.descriptionEn);
  const summary = description.startsWith(topic) ? description.slice(topic.length).replace(/^[。.\s]+/, '') : description;

  const handleBook = () => {
    if (!currentUser) {
      setLoginModalOpen(true);
      return;
    }
    if (session.isBooked) {
      cancelForum(session.id);
    } else {
      bookForum(session.id);
    }
  };

  const shareLink = forumShareLink(session.id, window.location.origin, apiBase);
  const handleCopy = async () => {
    if (copyPending.current) return;
    const target = id, version = copyVersion.current;
    const isCurrent = () => mounted.current && copyTarget.current === target && copyVersion.current === version;
    copyPending.current = true; setCopyStatus('copying');
    try {
      await navigator.clipboard.writeText(forumShareText(fullTitle, session.date, session.time, tr(session.venue, session.venueEn), shareLink));
      if (isCurrent()) setCopyStatus('copied');
    } catch { if (isCurrent()) setCopyStatus('error'); }
    finally { if (isCurrent()) copyPending.current = false; }
  };

  return (
    <DetailShell
      backRoute="forum"
      backLabel={tr('返回分论坛列表', 'Back to Forums')}
      eyebrow={forumName}
      title={topic}
      subtitle={summary}
      meta={[
        { label: tr('日期', 'Date'), value: session.date },
        { label: tr('时间', 'Time'), value: session.time },
        { label: tr('场地', 'Venue'), value: tr(session.venue, session.venueEn) },
        { label: tr('席位', 'Seats'), value: seatLabel },
        ...(rules ? [{ label: tr('取消截止（上海时间）', 'Cancel by (Shanghai time)'), value: new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-GB', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(rules.cancellationDeadline)) }] : []),
      ]}
      actions={
        <>
          <button
            type="button"
            onClick={handleBook}
            disabled={pending || ticketsLoading || ticketsError || unavailable}
            className={`doa-btn disabled:opacity-50 disabled:cursor-not-allowed ${session.isBooked ? 'doa-btn-secondary' : 'doa-btn-primary'}`}
          >
            {pending || ticketsLoading ? tr('正在处理…', 'Processing…') : session.isBooked ? (
              <>
                <Check className="w-4 h-4" /> {bookedLabel}
              </>
            ) : (
              <>
                <Ticket className="w-4 h-4" /> {!rules?.bookingOpen ? closedLabel : tr('免费预约', 'Reserve for free')}
              </>
            )}
          </button>
          <div className="inline-flex flex-col items-start gap-2 min-w-0 max-w-full">
            <button type="button" aria-label={tr('分享场次', 'Share session')} onClick={() => void handleCopy()} disabled={copyStatus === 'copying'} className="doa-btn doa-btn-ghost disabled:opacity-50"><Share2 className="w-4 h-4" /><span aria-live="polite">{copyStatus === 'copying' ? tr('正在复制…', 'Copying…') : copyStatus === 'copied' ? tr('已复制', 'Copied') : tr('分享场次', 'Share session')}</span></button>
            {copyStatus === 'error' && <div className="max-w-full space-y-2"><p role="status" className="text-xs text-[#6B7C9B]">{tr('复制失败，请选择下方链接手动复制。', 'Copy failed. Select the link below to copy it manually.')}</p><input ref={shareInput} readOnly aria-label={tr('场次分享链接', 'Session share link')} value={shareLink} onFocus={event => event.currentTarget.select()} className="doa-input max-w-full w-full text-xs" /></div>}
          </div>
          <ForumBookmarkButton forumId={session.id} />

        </>
      }
    >
      <TicketLoadStatus />
      <div className="mb-5"><ForumStatsStatus /></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ---- Main column ---- */}
        <div className="lg:col-span-2 space-y-6">
          <section className="doa-card p-6 sm:p-7">
            <h2 className="text-lg font-bold text-[#0B1B3A] mb-4">{tr('议程安排', 'Agenda')}</h2>
            <ol className="relative border-l-2 border-[#E3ECFA] pl-6 space-y-6">
              {[
                { t: tr('签到入场', 'Check-in'), d: tr('凭 DOAI Passport 扫码签到，领取本场席位凭证', 'Scan your DOAI Passport to check in and collect your seat pass'), time: session.time.split(' - ')[0] },
                { t: en ? (session.trackEn || 'Keynote') : (session.track.split(':')[0] || '主题分享'), d: tr('主讲人分享与现场问答', 'Talks by the speakers plus live Q&A'), time: session.time.split(' - ')[0] },
                { t: tr('自由交流', 'Open networking'), d: tr('与讲者及同场创客面对面交流', 'Meet the speakers and fellow makers in the room'), time: session.time.split(' - ')[1] || '' },
              ].map((row, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#165DFF] ring-4 ring-[#E4EFFF]" />
                  <div className="text-xs font-mono text-[#165DFF] font-semibold mb-1">{row.time}</div>
                  <div className="font-semibold text-[#1A2B4D] text-sm mb-1">{row.t}</div>
                  <p className="text-[13px] text-[#6B7C9B] leading-relaxed">{row.d}</p>
                </li>
              ))}
            </ol>
          </section>

          {session.speakers.length > 0 && <section className="doa-card p-6 sm:p-7">
            <h2 className="text-lg font-bold text-[#0B1B3A] mb-5">{tr('主讲嘉宾', 'Speakers')}</h2>
            <div className="space-y-5">
              {session.speakers.map((sp, i) => (
                <div key={i} className="flex items-start gap-4">
                  <Avatar
                    src={sp.avatar}
                    name={tr(sp.name, sp.nameEn)}
                    className="w-14 h-14 rounded-2xl object-cover shrink-0 ring-2 ring-[#E4EFFF]"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-[#1A2B4D] text-sm">{tr(sp.name, sp.nameEn)}</div>
                    <div className="text-[13px] text-[#48597A] mt-0.5">{tr(sp.role, sp.roleEn)}</div>
                    <div className="doa-chip mt-2">{sp.org}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>}

          <section className="doa-card p-6 sm:p-7">
            <h2 className="text-lg font-bold text-[#0B1B3A] mb-3">{tr('参与说明', 'How to attend')}</h2>
            <ul className="space-y-2.5 text-[13px] text-[#48597A] leading-relaxed">
              {[
                tr(`本场论坛免费参与，${seatLabel}，预约后可获取电子凭证。`, `Free entry · ${seatLabel}. Reserve to receive your digital pass.`),
                tr('预约成功后电子凭证将自动同步至「我的 DOAI」。', 'Your pass is synced to My DOAI as soon as you book.'),
                tr('未核销预约可在取消截止时间前调整；开场前 48 小时起停止自助取消，之后请联系组委会。', 'Cancel unchecked passes before the displayed deadline. Self-service cancellation closes 48 hours before the start; contact the organisers after that cutoff.'),
              ].map((t, i) => (
                <li key={i} className="flex gap-2.5">
                  <Check className="w-4 h-4 text-[#165DFF] shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ---- Side column ---- */}
        <aside className="space-y-6">
          <section className="doa-card p-6">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#165DFF] mb-3"><Ticket className="w-4 h-4" />{tr('场次预约', 'Session booking')}</div>
            <h3 className="text-xl font-bold text-[#0B1B3A]">{tr(`免费参与 · ${seatLabel}`, `Free entry · ${seatLabel}`)}</h3>
            <p className="mt-2 text-[13px] text-[#6B7C9B] leading-relaxed">{tr('预约后，电子凭证自动存入「我的 DOAI」。', 'Your digital pass appears in My DOAI after booking.')}</p>
            <button type="button" onClick={handleBook} disabled={pending || ticketsLoading || ticketsError || unavailable} className={`doa-btn w-full mt-5 disabled:opacity-50 ${session.isBooked ? 'doa-btn-secondary' : 'doa-btn-primary'}`}>
              {pending || ticketsLoading ? tr('正在处理…', 'Processing…') : session.isBooked ? bookedLabel : !rules?.bookingOpen ? closedLabel : tr('免费预约', 'Reserve for free')}
            </button>
            {!forumStatsLoading && !forumStatsError && <p className="mt-3 text-xs text-center text-[#6B7C9B]">{session.bookedCount} {tr('人已预约', 'booked')}</p>}
          </section>

          <section className="doa-card p-6 space-y-4">
            <h3 className="font-bold text-[#0B1B3A] text-sm">{tr('场次信息', 'Session details')}</h3>
            <dl className="space-y-3.5 text-[13px]">
              {[
                { icon: Calendar, label: tr('日期', 'Date'), value: session.date },
                { icon: Clock, label: tr('时间', 'Time'), value: session.time },
                { icon: MapPin, label: tr('场地', 'Venue'), value: tr(session.venue, session.venueEn) },
                { icon: Users, label: tr('形式', 'Format'), value: tr(`线下 · ${seatLabel}`, `In person · ${seatLabel}`) },
              ].map((row, i) => {
                const Icon = row.icon;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <Icon className="w-4 h-4 text-[#165DFF] shrink-0 mt-0.5" />
                    <div>
                      <dt className="text-[11px] text-[#98A6BE] font-semibold uppercase tracking-wider">{row.label}</dt>
                      <dd className="text-[#1A2B4D] font-medium mt-0.5">{row.value}</dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          </section>

          {session.isBooked && (
            <section className="doa-panel p-6 border-[#A9CCFF] bg-[#F2F7FF]">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4 text-[#00B487]" />
                <h3 className="font-bold text-[#0B1B3A] text-sm">{tr('你已预约本场', 'You have reserved this session')}</h3>
              </div>
              <p className="text-[13px] text-[#48597A] leading-relaxed mb-4">
                {tr('电子凭证已存入「我的 DOAI」，现场扫码即可入座。', 'Your digital pass is in My DOAI — just scan it on site to take your seat.')}
              </p>
              <button type="button" onClick={() => setActiveRoute('dashboard')} className="doa-btn doa-btn-secondary w-full">
                <Ticket className="w-4 h-4" /> {tr('查看我的凭证', 'View my pass')}
              </button>
            </section>
          )}

        </aside>
      </div>

      {/* ---- Related sessions ---- */}
      <section className="mt-12">
        <div className="flex items-end justify-between mb-5">
          <h2 className="text-lg font-bold text-[#0B1B3A]">{tr('其他分论坛', 'Other forums')}</h2>
          <button type="button" onClick={() => setActiveRoute('forum')} className="text-[13px] font-semibold text-[#165DFF] hover:underline">
            {tr('查看全部', 'View all')} →
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {forums.filter(f => f.id !== session.id).slice(0, 3).map(f => {
            const meta = typeMeta.symposium;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveRoute(`detail/forum/${f.id}`)}
                className="doa-card doa-card-hover p-5 text-left"
              >
                <span className="doa-chip mb-3" style={{ background: `${meta.color}14`, color: meta.color, borderColor: `${meta.color}30` }}>
                  {f.track}
                </span>
                <h3 className="font-bold text-[#1A2B4D] text-sm leading-snug mb-2 line-clamp-2">{f.title}</h3>
                <p className="text-[12px] text-[#6B7C9B] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> {f.date} {f.time}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </DetailShell>
  );
};
