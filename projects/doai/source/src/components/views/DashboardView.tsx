import { ForumTicketActions } from '../common/ForumTicketActions';
import React, { useState, useCallback, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { readEntrySummary, registrationTrackLabel } from '../../lib/contestEntry';
import type { Registration } from '../../types';
import { QRCodeSVG } from 'qrcode.react';
import { TeamPanel } from './TeamPanel';
import { WorkSubmission } from '../contest/WorkSubmission';
import { TicketLoadStatus } from '../common/TicketLoadStatus';
import { Avatar } from '../common/Avatar';
import { DigitalPassport } from '../common/DigitalPassport';
import { PrivacySettings } from './PrivacySettings';
import { ForumBookmarksPanel } from './ForumBookmarksPanel';
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Users,
  Award,
  FileText,
  Mail,
  Share2,
  Check,
  Smartphone,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  ImageUp,
  ContactRound,
  CalendarDays,
  Ticket,
} from 'lucide-react';

/* Sync presentation fields from the authoritative main account; privacy stays local. */
const ProfileEditor: React.FC = () => {
  const { currentUser, refreshAtomclubUser, syncAtomclubUser, profileBusy, tr } = useApp();
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState('');
  const pending = React.useRef(false);
  const mounted = React.useRef(true);
  const me = currentUser!;
  const account = React.useRef(me.id);
  account.current = me.id;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { pending.current = false; setSyncing(false); setNotice(''); }, [me.id]);
  const refresh = async (persist: boolean) => {
    if (pending.current) return;
    const uid = me.id;
    pending.current = true;
    setSyncing(true);
    setNotice('');
    try {
      if (persist) await syncAtomclubUser(); else await refreshAtomclubUser();
      if (mounted.current && account.current === uid) setNotice(persist ? tr('已同步原子公社资料', 'AtomClub profile updated') : tr('已重新读取账号', 'Account refreshed'));
    } catch (error) { if (mounted.current && account.current === uid) setNotice(error instanceof Error ? error.message : tr('同步失败，请稍后重试', 'Sync failed. Please retry.')); }
    finally { if (mounted.current && account.current === uid) { pending.current = false; setSyncing(false); } }
  };
  return (
    <div className="doa-card min-w-0 p-6 sm:p-8 shadow-sm space-y-5">
      <h3 className="text-lg font-bold text-[#0B1B3A] pb-4 border-b border-[#E8EAED]">{tr('个人资料', 'Profile')}</h3>
      <div className="flex items-center gap-4">
        <Avatar src={me.avatar} name={me.name} className="w-20 h-20 rounded-full border-2 border-[#E3ECFA]" />
        <div className="min-w-0 [overflow-wrap:anywhere]"><div className="font-bold text-[#0B1B3A]">{me.name}</div><div className="text-xs text-[#666] mt-1">{me.city}</div><div className="text-xs text-[#666] mt-1">{me.bio}</div></div>
      </div>
      <p className="text-xs text-[#666]">{tr('修改原子公社头像、昵称、城市、简介或技能后，点击同步更新 DOAI 展示资料；公开和交换名片的隐私设置会保留。', 'Sync your main-account name, avatar, location, bio and skills into DOAI. Card privacy preferences are preserved.')}</p>
      {notice && <p role="status" className="text-xs text-[#165DFF]">{notice}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => void refresh(true)} disabled={syncing || profileBusy} className="doa-btn doa-btn-secondary flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />{tr('同步原子公社资料', 'Sync AtomClub profile')}</button>
        <button type="button" onClick={() => void refresh(false)} disabled={syncing || profileBusy} className="doa-btn doa-btn-ghost">{tr('重新读取账号', 'Refresh account')}</button>
        <a href="https://atomclub.cn/profile" target="_blank" rel="noopener noreferrer" className="doa-btn doa-btn-secondary flex items-center gap-2"><ExternalLink className="w-4 h-4" />{tr('前往原子公社编辑', 'Edit on AtomClub')}</a>
      </div>
    </div>
  );
};

/* 报名状态统一文案与配色（五状态全覆盖，submitted 绝不能落到"驳回"分支） */
const REG_STATUS_META: Record<Registration['status'], { label: string; cls: string }> = {
  submitted: { label: '已提交 · 待审核', cls: 'bg-[#F0F2F5] text-[#48597A]' },
  reviewing: { label: '评审中', cls: 'bg-[#165DFF]/10 text-[#165DFF]' },
  needs_info: { label: '需补充材料', cls: 'bg-[#FF7D00]/10 text-[#FF7D00]' },
  shortlisted: { label: '已通过初审 · 入围决赛', cls: 'bg-[#00C48C]/10 text-[#00C48C]' },
  rejected: { label: '未通过审核', cls: 'bg-red-50 text-red-500' },
};

export const DashboardView: React.FC = () => {
  const {
    currentUser,
    authLoading,
    logout,
    registrations,
    registrationsLoading,
    registrationsError,
    reloadRegistrations,
    tickets,
    reloadTickets,
    ticketsLoading,
    ticketsError,
    exchangedCards,
    cardsLoading,
    cardsError,
    reloadCards,
    checkInTicket,
    lang,
    setLoginModalOpen,
    setActiveRoute,
    activeRoute,
    setNotificationDrawerOpen,
    submitWork,
    tr,
  } = useApp();

  // 支持子路由直链：dashboard/registrations 等（报名成功后「去提交作品」用）
  const routeSub = activeRoute.split('/')[1];
  const initialTab =
    routeSub === 'bookmarks' || routeSub === 'passport' || routeSub === 'registrations' || routeSub === 'team' || routeSub === 'settings'
      ? (routeSub as 'passport' | 'registrations' | 'team' | 'settings' | 'bookmarks')
      : 'passport';
  const [activeTab, setActiveTab] = useState<'passport' | 'registrations' | 'team' | 'settings' | 'bookmarks'>(initialTab);
  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);
  // 旧消息中心链接统一打开铃铛通知。
  useEffect(() => {
    if (routeSub === 'messages') {
      setActiveRoute('dashboard');
      setNotificationDrawerOpen(true);
    }
  }, [routeSub, setActiveRoute, setNotificationDrawerOpen]);
  const [checkInNotice, setCheckInNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [checkingTicket, setCheckingTicket] = useState<string | null>(null);
  const checkinPending = React.useRef(false);
  const checkinOwner = React.useRef(currentUser?.id);
  checkinOwner.current = currentUser?.id;
  const checkinVersion = React.useRef(0);
  useEffect(() => {
    ++checkinVersion.current; checkinPending.current = false;
    setCheckingTicket(null); setCheckInNotice(null);
    return () => { ++checkinVersion.current; };
  }, [currentUser?.id, currentUser?.role]);
  useEffect(() => {
    if (!checkInNotice?.ok) return;
    const timer = window.setTimeout(() => setCheckInNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [checkInNotice]);

  if (authLoading) return <div className="flex min-h-[calc(100svh-150px)] items-center justify-center pt-[72px] text-center text-sm text-[#78849A]">正在读取原子公社账号…</div>;
  if (!currentUser) {
    return (
      <section className="relative isolate flex min-h-[calc(100svh-150px)] items-center justify-center overflow-hidden px-6 pb-14 pt-[126px] text-center">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_42%_46%_at_24%_52%,rgba(22,93,255,0.045),transparent_76%),radial-gradient(ellipse_34%_38%_at_79%_46%,rgba(22,93,255,0.025),transparent_78%)]" />
        <div className="mx-auto flex w-full max-w-[760px] flex-col items-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#165DFF]/[0.07] text-[#165DFF] sm:h-28 sm:w-28">
            <CreditCard aria-hidden="true" className="h-10 w-10 stroke-[1.75] sm:h-11 sm:w-11" />
          </div>
          <p className="mt-6 text-[11px] font-semibold tracking-[0.34em] text-[#8A96AF] sm:text-xs">MY DOAI</p>
          <h1 className="mt-4 text-[29px] font-bold leading-[1.22] tracking-tight text-[#0B1B3A] sm:text-[38px] lg:text-[42px]">
            {tr('登录后开启你的 DOAI 身份', 'Sign in to unlock your DOAI identity')}
          </h1>
          <p className="mt-4 max-w-[610px] text-sm leading-relaxed text-[#78849A] sm:text-base">
            {tr('使用原子公社账号，统一管理名片、报名与入场凭证', 'Use your AtomClub account to manage your card, registrations and passes')}
          </p>
          <button
            type="button"
            onClick={() => setLoginModalOpen(true)}
            className="mt-9 inline-flex min-h-12 w-full max-w-[300px] items-center justify-center rounded-full bg-[#165DFF] px-7 text-sm font-semibold text-white shadow-[0_7px_18px_rgba(22,93,255,0.15)] transition-colors hover:bg-[#1453E6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#165DFF] focus-visible:ring-offset-4"
          >
            {tr('使用原子公社账号登录', 'Sign in with AtomClub')}
          </button>
          <div className="mt-12 grid w-full max-w-[590px] grid-cols-3 divide-x divide-[#E5EBF4] sm:mt-14">
            {[
              { Icon: ContactRound, zh: '数字名片', en: 'Digital Card' },
              { Icon: CalendarDays, zh: '赛事报名', en: 'Contest Entry' },
              { Icon: Ticket, zh: '电子凭证', en: 'Digital Passes' },
            ].map(({ Icon, zh, en }) => (
              <div key={zh} className="flex flex-col items-center gap-2.5 px-2 text-[#0B1B3A]">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#165DFF]/[0.07] text-[#165DFF] sm:h-14 sm:w-14">
                  <Icon aria-hidden="true" className="h-5 w-5 stroke-[1.75] sm:h-6 sm:w-6" />
                </span>
                <span className="text-[12px] font-semibold sm:text-sm">{tr(zh, en)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const myRegistrations = registrations.filter(r => r.ownerUserId
    ? r.ownerUserId === currentUser.id
    : r.members?.some(member => member.id === currentUser.id));
  const selectedRegistrationId = activeRoute.split('/')[2];
  const myRegistration = selectedRegistrationId
    ? myRegistrations.find(item => item.id === selectedRegistrationId) || null
    : myRegistrations[0] || null;
  const myTickets = tickets.filter(t => t.ownerUserId
    ? t.ownerUserId === currentUser.id
    : (!!currentUser.phone && t.holderPhone === currentUser.phone));

  // The identity card is the primary entry point for the usable maker pass.
  const makerTicket = !ticketsLoading && !ticketsError
    ? myTickets.find(t => t.type === 'maker' && t.status === 'claimed' && t.qrCode)
    : undefined;

  // 现场核销：走后端校验（重复拦截 / 闸口记录 / 持久化），成功后更新本地状态
  const handleCheckIn = async (ticketId: string) => {
    if (checkinPending.current || currentUser.role !== 'admin') return;
    const uid = currentUser.id, version = checkinVersion.current;
    const isCurrent = () => checkinOwner.current === uid && checkinVersion.current === version;
    checkinPending.current = true; setCheckingTicket(ticketId); setCheckInNotice(null);
    try {
      const record = await checkInTicket(ticketId);
      if (isCurrent()) setCheckInNotice({ ok: true, text: tr(`核销成功：${record.gate} · ${record.time}`, `Checked in: ${record.gate} · ${record.time}`) });
    } catch (error) {
      if (isCurrent()) setCheckInNotice({ ok: false, text: error instanceof Error ? error.message : tr('核销失败，请重试', 'Check-in failed. Please retry.') });
    } finally { if (isCurrent()) { checkinPending.current = false; setCheckingTicket(null); } }
  };

  return (
    <div className="pt-24 pb-24 max-w-[1200px] mx-auto px-6 sm:px-8">
      <header className="flex items-start gap-4 pb-6 sm:gap-5">
        <Avatar
          src={currentUser.avatar}
          name={currentUser.name}
          className="h-14 w-14 rounded-full border-2 border-[#E3ECFA] sm:h-16 sm:w-16"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="min-w-0 max-w-full text-2xl font-bold text-[#0B1B3A] [overflow-wrap:anywhere]">{currentUser.name}</h1>
            {currentUser.atomclubBound && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#00C48C]/10 px-2 py-1 text-[11px] font-semibold text-[#008B65]">
                <ShieldCheck className="h-3 w-3" />
                {tr('原子公社已绑定', 'AtomClub linked')}
              </span>
            )}
          </div>
          {currentUser.bio && <p className="mt-2 max-w-3xl break-words text-sm leading-relaxed text-[#6B7C9B] [overflow-wrap:anywhere]">{currentUser.bio}</p>}
        </div>
      </header>

      <nav aria-label={tr('我的 DOAI 功能', 'My DOAI navigation')} className="flex flex-wrap gap-x-2 gap-y-1 border-b border-[#E3ECFA] sm:gap-x-5">
        {[
          { id: 'passport', label: '身份与凭证', labelEn: 'Identity & passes', Icon: CreditCard },
          { id: 'registrations', label: '我的报名', labelEn: 'My Entries', Icon: FileText },
          { id: 'bookmarks', label: '收藏的论坛', labelEn: 'Saved forums', Icon: CalendarDays },
          { id: 'team', label: '我的战队', labelEn: 'My Team', Icon: Users },
          { id: 'settings', label: '资料与隐私', labelEn: 'Profile & Privacy', Icon: ShieldCheck },
        ].map(({ Icon, ...tab }) => (
          <button
            type="button"
            key={tab.id}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            onClick={() => { setActiveTab(tab.id as typeof activeTab); setActiveRoute(`dashboard/${tab.id}`); }}
            className={`inline-flex min-h-12 items-center gap-2 border-b-2 px-2 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#165DFF] ${
              activeTab === tab.id
                ? 'border-[#165DFF] text-[#165DFF]'
                : 'border-transparent text-[#6B7C9B] hover:text-[#0B1B3A]'
            }`}
          >
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
            {tr(tab.label, tab.labelEn)}
          </button>
        ))}
      </nav>

      {/* Check In Success Notice Toast */}
      {checkInNotice && (
        <div role="status" className={`fixed bottom-8 left-6 right-6 sm:left-auto sm:max-w-md z-50 p-4 bg-white rounded-2xl shadow-floating border text-xs flex items-center gap-3 ${checkInNotice.ok ? 'border-[#00C48C]' : 'border-red-300'}`}>
          {checkInNotice.ok ? <CheckCircle2 className="w-5 h-5 text-[#00C48C] shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />}
          <div className="font-bold text-[#0B1B3A] break-words">{checkInNotice.text}</div>
          <button type="button" onClick={() => setCheckInNotice(null)} className="ml-auto shrink-0">{tr('关闭', 'Close')}</button>
        </div>
      )}

      {activeTab === 'bookmarks' && <ForumBookmarksPanel />}

      {/* Tab 1: DOAI Passport & Digital Passes */}
      {activeTab === 'passport' && (
        <div className="space-y-8 pt-7">
          <DigitalPassport user={currentUser} makerId={myRegistration?.makerId} ticket={makerTicket} tr={tr} />

          <section aria-labelledby="passes-heading" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="passes-heading" className="text-base font-bold text-[#0B1B3A]">{tr('我的电子通行凭证', 'My Digital Passes')}</h2>
              <button type="button" disabled={ticketsLoading} onClick={() => void reloadTickets()} className="-my-2 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-[#165DFF] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">
                <RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${ticketsLoading ? 'animate-spin motion-reduce:animate-none' : ''}`} />
                {tr('刷新凭证', 'Refresh passes')}
              </button>
            </div>
            <TicketLoadStatus />
            {!ticketsLoading && !ticketsError && myTickets.length === 0 && (
              <div className="flex flex-col items-start gap-4 rounded-2xl border border-[#E3ECFA] bg-white p-5 sm:flex-row sm:items-center sm:p-6">
                <Ticket aria-hidden="true" className="h-7 w-7 shrink-0 stroke-[1.5] text-[#6B7C9B]" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-[#0B1B3A]">{tr('还没有电子通行凭证', 'No digital passes yet')}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#6B7C9B]">{tr('报名参会或预约分论坛后，在这里查看凭证和审核状态。', 'Register for the conference or reserve a forum to view your passes and review status here.')}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => setActiveRoute('attend')} className="doa-btn doa-btn-secondary">{tr('报名参会', 'Register to attend')}</button>
                  <button type="button" onClick={() => setActiveRoute('forum')} className="doa-btn doa-btn-ghost">{tr('预约分论坛', 'Reserve a forum')}</button>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {myTickets.map(ticket => (
                <article key={ticket.id} data-testid="digital-ticket" className="min-w-0 rounded-2xl border border-[#E3ECFA] bg-white p-5 sm:px-6 [overflow-wrap:anywhere]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#6B7C9B]">
                      {ticket.type === 'maker' ? tr('选手全场通行票', 'Maker All-Access Pass') : ticket.type === 'forum' ? tr('分论坛预约票', 'Forum Reservation') : tr('大会参会凭证', 'Conference Pass')}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ticket.status === 'claimed' ? 'bg-[#00C48C]/10 text-[#008B65]' : ticket.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-[#F2F5FA] text-[#6B7C9B]'}`}>
                      {ticket.status === 'checked_in' ? tr('已现场核销', 'Checked In') : ticket.status === 'pending_review' ? tr('待审核', 'Pending review') : ticket.status === 'rejected' ? tr('未通过审核', 'Not approved') : ticket.status === 'claimed' ? tr('有效凭证', 'Valid') : tr('待领取', 'Pending')}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold leading-relaxed text-[#0B1B3A]">{ticket.title}</h3>
                      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5 text-xs leading-relaxed text-[#6B7C9B]">
                        {ticket.sessionTime && <span>{tr('有效时间：', 'Valid: ')}{ticket.sessionTime}</span>}
                        {ticket.venue && <span>{tr('通行区域：', 'Access: ')}{ticket.venue}</span>}
                        <span>{tr('持票人：', 'Holder: ')}{ticket.holderName}</span>
                        {ticket.organization && <span>{tr('机构 / 学校：', 'Organisation: ')}{ticket.organization}</span>}
                      </div>
                      {ticket.reviewFeedback && <p className={`mt-2 text-xs leading-relaxed ${ticket.status === 'rejected' ? 'text-red-600' : 'text-[#48597A]'}`}>{ticket.reviewFeedback}</p>}
                      {ticket.id === makerTicket?.id && <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#165DFF]"><QrCode aria-hidden="true" className="h-3.5 w-3.5" />{tr('点击身份卡下方「出示入场码」扫码入场', 'Select “Show entry code” below your identity card to enter')}</p>}
                      {ticket.qrCode && ['claimed', 'checked_in'].includes(ticket.status) && <details className="mt-2 text-[11px] text-[#6B7C9B]"><summary className="w-fit cursor-pointer py-1 focus-visible:outline-2 focus-visible:outline-offset-2">{tr('查看凭证码', 'View pass code')}</summary><code className="mt-1 block break-all leading-relaxed">{ticket.qrCode}</code></details>}
                    </div>
                    {ticket.id !== makerTicket?.id && ['claimed', 'checked_in'].includes(ticket.status) && ticket.qrCode && <div className="shrink-0 self-start rounded-lg border border-[#E3ECFA] bg-white p-2" data-testid="ticket-qr"><QRCodeSVG value={ticket.qrCode} size={84} level="M" /></div>}
                  </div>
                  {ticket.type === 'forum' && <ForumTicketActions ticket={ticket} />}
                  {currentUser.role === 'admin' && ticket.status === 'claimed' && <div className="mt-3 flex justify-end">
                    <button type="button" onClick={() => void handleCheckIn(ticket.id)} disabled={checkingTicket !== null} className="min-h-11 rounded-full border border-[#165DFF]/30 px-4 text-xs font-semibold text-[#165DFF] transition-colors hover:bg-[#165DFF]/10 disabled:opacity-50">
                      {checkingTicket === ticket.id ? tr('正在核销…', 'Checking…') : tr('现场核销', 'Check in')}
                    </button>
                  </div>}
                </article>
              ))}
            </div>
          </section>

          {/* Exchanged Digital Name Cards Box */}
          <section className="space-y-4">
            <h3 className="text-base font-bold text-[#0B1B3A]">
              {tr('已互换的名片盒', 'Exchanged Cards')} {!cardsLoading && !cardsError && `(${exchangedCards.length})`}
            </h3>

            {cardsLoading && <p role="status" className="text-sm text-[#6B7C9B]">{tr('正在读取名片…', 'Loading cards…')}</p>}
            {cardsError && <div role="status" className="space-y-3"><p className="text-sm text-[#6B7C9B]">{tr('名片盒暂时无法加载，请重试。', 'Your card box could not be loaded. Please retry.')}</p><button type="button" onClick={() => void reloadCards()} className="doa-btn doa-btn-secondary">{tr('重新加载名片盒', 'Reload card box')}</button></div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {exchangedCards.map(card => (
                <div
                  key={card.id}
                  className="min-w-0 p-5 doa-panel space-y-3 [overflow-wrap:anywhere]"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={card.avatar} name={card.name} className="w-10 h-10 rounded-full" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-[#0B1B3A]">{card.name || tr('未留存姓名', 'Name not saved')}</div>
                      <div className="text-[11px] text-[#888888]">{card.org}</div>
                    </div>
                    {card.direction && (
                      <span
                        className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          card.direction === 'in'
                            ? 'text-[#165DFF] bg-[#165DFF]/10'
                            : 'text-[#888888] bg-[#F0F2F5]'
                        }`}
                      >
                        {card.direction === 'in'
                          ? tr('对方换给我', 'Received')
                          : tr('我换给对方', 'Sent')}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-[#555555] space-y-1">
                    <div>{tr('联系方式：', 'Contact: ')}<span className="font-medium text-[#0B1B3A]">{card.contactStatus === 'not_shared' ? tr('本次交换不含联系方式', 'Contact details are not part of this exchange') : tr('未留存联系方式', 'No contact details saved')}</span></div>
                    <div>{tr('常驻城市：', 'City: ')}{card.city || tr('未填写', 'Not provided')}</div>
                  </div>

                  <div className="text-[10px] text-[#888888] pt-2 border-t border-[#E8EAED] flex items-center justify-between">
                    <span>{tr('互换日期（上海时间）: ', 'Exchange date (Shanghai): ')}{card.exchangedAt}</span>
                    <span className="text-[#00C48C] font-semibold">互为创客同行</span>
                  </div>
                </div>
              ))}
            </div>
            {!cardsLoading && !cardsError && exchangedCards.length === 0 && (
              <div className="flex flex-col items-start gap-4 rounded-2xl border border-[#E3ECFA] bg-white p-5 sm:flex-row sm:items-center sm:px-6">
                <ContactRound aria-hidden="true" className="h-7 w-7 shrink-0 stroke-[1.5] text-[#6B7C9B]" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#0B1B3A]">{tr('还没有交换名片', 'No exchanged cards yet')}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#6B7C9B]">{tr('在创客社区交换名片后，对方的名片会保存在这里。', 'Cards you exchange in the maker community will be saved here.')}</p>
                </div>
                <button type="button" onClick={() => setActiveRoute('square')} className="doa-btn doa-btn-secondary">{tr('逛逛创客社区', 'Explore makers')}</button>
              </div>
            )}
            {!cardsLoading && !cardsError && exchangedCards.length > 0 && <button type="button" onClick={() => setActiveRoute('square')} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[#165DFF]">{tr('前往创客社区', 'Explore the maker community')}<ChevronRight aria-hidden="true" className="h-4 w-4" /></button>}
          </section>
        </div>
      )}

      {/* Tab 2: Registrations State Machine */}
      {activeTab === 'registrations' && registrationsLoading && (
        <p role="status" className="pt-8 text-sm text-[#6B7C9B]">{tr('正在加载报名记录…', 'Loading entries…')}</p>
      )}
      {activeTab === 'registrations' && !registrationsLoading && registrationsError && (
        <div role="status" className="pt-8 space-y-3">
          <p className="text-sm text-[#6B7C9B]">{tr('报名记录暂时无法加载，请重试。', 'Entries could not be loaded. Please retry.')}</p>
          <button type="button" onClick={() => void reloadRegistrations()} className="doa-btn doa-btn-secondary">{tr('重新加载报名', 'Reload entries')}</button>
        </div>
      )}
      {activeTab === 'registrations' && !registrationsLoading && !registrationsError && myRegistrations.length > 1 && (
        <nav aria-label={tr('选择参赛项目', 'Choose an entry')} className="flex flex-wrap gap-2 pt-8">
          {myRegistrations.map(item => <button type="button" key={item.id} aria-pressed={myRegistration?.id === item.id} onClick={() => setActiveRoute(`dashboard/registrations/${item.id}`)} className={`rounded-xl border px-4 py-2 text-sm ${myRegistration?.id === item.id ? 'border-[#165DFF] text-[#165DFF]' : 'border-[#E3ECFA] text-[#6B7C9B]'}`}>{item.projectName}</button>)}
        </nav>
      )}
      {activeTab === 'registrations' && !registrationsLoading && !registrationsError && !myRegistration && (
        <div className="pt-8 doa-card p-8 text-center text-sm text-[#666]">
          <FileText className="mx-auto mb-3 h-10 w-10 text-[#C0CBDD]" />
          <h3 className="text-base font-bold text-[#0B1B3A]">{selectedRegistrationId ? tr('未找到这条报名记录', 'Entry not found') : tr('还没有参赛报名', 'No contest entry yet')}</h3>
          <p className="mt-1 mb-6 text-xs text-[#888888]">{tr('选择一条赛道，免费提交你的参赛申报，通过审核即可入围线下路演。', 'Pick a track and submit your entry for free.')}</p>
          <button type="button" onClick={() => setActiveRoute('maker/tracks')} className="rounded-full bg-[#165DFF] px-8 py-3 text-xs font-semibold text-white transition-colors hover:bg-[#1453E6]">{tr('去报名参赛', 'Enter the Contest')}</button>
        </div>
      )}
      {activeTab === 'registrations' && !registrationsLoading && !registrationsError && myRegistration && (
        <div className="pt-8 space-y-8">
          <div className="doa-card p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E8EAED]">
              <div>
                <span className="text-xs font-semibold text-[#165DFF] uppercase tracking-wider">
                  CONTEST APPLICATION STATUS
                </span>
                <h3 className="text-2xl font-bold text-[#0B1B3A] mt-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveRoute(`detail/project/${myRegistration.id}`)}
                    className="text-left hover:text-[#165DFF] transition-colors"
                  >
                    {myRegistration.projectName}
                  </button>
                </h3>
                <div className="text-xs text-[#666666] mt-1">
                  所属赛道：{registrationTrackLabel(myRegistration)} · 提交于 {myRegistration.submittedAt}
                </div>
                {readEntrySummary(myRegistration.projectSummary).overseas && <p className="mt-2 text-xs text-[#666666]">{tr('海外报名：', 'Overseas entry: ')}{readEntrySummary(myRegistration.projectSummary).overseas!.countryOrRegion} · {readEntrySummary(myRegistration.projectSummary).overseas!.university}</p>}
                <p className="mt-2 text-sm font-semibold text-[#165DFF]">
                  {tr('申报方向：', 'Entry: ')}{readEntrySummary(myRegistration.projectSummary).entry || tr('原报名未记录具体方向', 'No direction recorded for this entry')}
                </p>
              </div>

              {/* Status Badge（五状态全覆盖） */}
              <div className="flex items-center gap-2">
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${REG_STATUS_META[myRegistration.status].cls}`}>
                  {REG_STATUS_META[myRegistration.status].label}
                </span>
              </div>
            </div>

            {/* State Machine Visual Timeline（按真实审核状态渲染） */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 py-2">
              {(() => {
                const st = myRegistration.status;
                const steps: { title: string; desc: string; state: 'done' | 'active' | 'attention' | 'failed' | 'pending' }[] = [
                  { title: '1. 提交成功', desc: '报名材料已接收', state: 'done' },
                  {
                    title: '2. 资格初筛',
                    desc: '专家人工独立核验',
                    state:
                      st === 'rejected' ? 'failed'
                      : st === 'needs_info' ? 'attention'
                      : st === 'reviewing' ? 'active'
                      : st === 'shortlisted' ? 'done'
                      : 'pending',
                  },
                  { title: '3. 入围决赛', desc: '入围名单以组委会公告为准', state: st === 'shortlisted' ? 'done' : 'pending' },
                  { title: '4. 现场路演', desc: '乐动虹桥 · 路演主会场现场答辩', state: 'pending' },
                ];
                const STEP_STYLE = {
                  done: { cls: 'bg-[#00C48C]/5 border-[#00C48C]/30 text-[#0B1B3A]', icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#00C48C]" />, note: '' },
                  active: { cls: 'bg-[#165DFF]/5 border-[#165DFF]/30 text-[#0B1B3A]', icon: <Clock className="w-3.5 h-3.5 text-[#165DFF]" />, note: '评审进行中' },
                  attention: { cls: 'bg-[#FF7D00]/5 border-[#FF7D00]/30 text-[#0B1B3A]', icon: <AlertCircle className="w-3.5 h-3.5 text-[#FF7D00]" />, note: '待补充材料' },
                  failed: { cls: 'bg-red-50 border-red-200 text-red-500', icon: <AlertCircle className="w-3.5 h-3.5 text-red-500" />, note: '未通过' },
                  pending: { cls: 'bg-[#F7F8FA] border-[#E8EAED] text-neutral-400', icon: null, note: '' },
                } as const;
                return steps.map(step => {
                  const s = STEP_STYLE[step.state];
                  return (
                    <div key={step.title} className={`p-4 rounded-xl border text-xs ${s.cls}`}>
                      <div className="font-bold flex items-center justify-between">
                        <span>{step.title}</span>
                        {s.icon}
                      </div>
                      <div className="text-[11px] mt-1">{step.state === 'failed' ? s.note : step.desc}</div>
                      {s.note && step.state !== 'failed' && <div className="text-[11px] mt-0.5 font-semibold">{s.note}</div>}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Review Feedback Box */}
            {myRegistration.reviewFeedback && (
              <div className="p-5 doa-panel text-xs space-y-1">
                <div className="font-semibold text-[#0B1B3A] flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#165DFF]" />
                  <span>评委会审核意见与指导反馈</span>
                </div>
                <p className="text-[#555555] leading-relaxed pt-1">
                  {myRegistration.reviewFeedback}
                </p>
              </div>
            )}

            {/* 提交作品（会议 2026-10-13：报名后提交 视频 / 可访问 / GitHub 三个链接）。
                被驳回的报名关闭作品提交通道。 */}
            {myRegistration.status === 'rejected' ? (
              <div className="p-5 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  该报名未通过审核，作品提交通道已关闭。如有疑问请联系组委会：jocelyn@atomesh.cn。
                </span>
              </div>
            ) : (
              <WorkSubmission key={myRegistration.id} registration={myRegistration} />
            )}
          </div>
        </div>
      )}

      {/* Tab 4: My Team */}
      {activeTab === 'team' && <TeamPanel />}

      {/* Tab 5: Settings & Privacy */}
      {activeTab === 'settings' && (
        <div className="grid items-start gap-6 pt-6 lg:grid-cols-2">
          {/* 名片身份资料由原子公社账号提供 */}
          <ProfileEditor />

          <PrivacySettings />

          {/* 退出登录（会议结论 2026-10-13：我的 DOAI 需要退出登录入口） */}
          <div className="doa-card p-6 sm:p-8 flex items-center justify-between gap-4 lg:col-span-2">
            <div>
              <h3 className="text-sm font-bold text-[#0B1B3A]">{tr('退出登录', 'Sign Out')}</h3>
              <p className="text-[11px] text-[#666666] mt-0.5">
                退出后将返回官网首页，报名与战队数据保留在账号中
              </p>
            </div>
            <button
              onClick={() => { void logout(); }}
              className="px-5 py-2.5 text-xs font-semibold text-red-600 hover:text-white hover:bg-red-500 border border-red-300 hover:border-red-500 rounded-full transition-colors shrink-0"
            >
              {tr('退出登录', 'Sign Out')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
