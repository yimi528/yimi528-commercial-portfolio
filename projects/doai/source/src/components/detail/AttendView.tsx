import { registrationChannels, registrationChannelLabel, validRegistrationChannel, type RegistrationChannel } from '../../lib/registrationChannel.ts';
/**
 * 大会报名 — conference attendance registration (as distinct from 赛事报名,
 * which is the contest entry). Mirrors the plan's 票务预约 module:
 * 「按分会场与场次选座预约，生成入场凭证」.
 *
 * Everything the plan states about attendance is honoured here:
 *   - 参会全程免费，不设任何付费通道（并给出防诈骗提示）
 *   - 双会场：12/5 乐动虹桥（开幕与社交），12/6 乐动虹桥（路演·游园·市集）
 *   - 游园 / 市集 / AI 互动区对公众开放
 *   - 所有场次席位不限人数，可免费预约获取凭证
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { DigitalTicket } from '../../types';
import { useApp } from '../../context/AppContext';
import { DetailShell } from '../detail/DetailShell';
import { TicketLoadStatus } from '../common/TicketLoadStatus';
import { event, venues as planVenues, forums as planForums, agenda } from '../../data/plan';
import {
  Ticket, Check, Users, Calendar, MapPin, QrCode, Download, AlertTriangle,
  Sparkles, Baby, Accessibility, Coffee,
} from 'lucide-react';

/* ------------------------------------------------------------ 参会类型 */

interface PassType {
  id: string;
  name: string;
  nameEn: string;
  audience: string;
  price: '免费';
  quota: string;
  perks: string[];
  perksEn: string[];
  needsSeat: boolean;
  badge: string;
  badgeEn?: string;
  audienceEn?: string;
  priceEn?: string;
  quotaEn?: string;
}

const PASS_TYPES: PassType[] = [
  {
    id: 'pass-full',
    name: '全程通票',
    nameEn: 'Full Pass',
    audience: '所有公众与创客', audienceEn: 'All visitors & makers',
    price: '免费', priceEn: 'Free',
    quota: '不限量', quotaEn: 'Unlimited',
    perks: [
      '12/5 乐动虹桥签到与开幕主会场（需选座）',
      '12/6 乐动虹桥决赛路演厅（需选座）',
      'AI 创客游园会与 4F 选手作品展',
      '长宁味道市集与 AI 互动区',
      '展商展位区与樊登书店休闲区',
    ],
    perksEn: [
      'Dec 5 check-in and opening main hall at LeDong Hongqiao (seat required)',
      'Dec 6 finals roadshow hall at LeDong Hongqiao (seat required)',
      'AI makers fair and the 4F shortlisted project showcase',
      'Changning Flavours market and the AI experience zone',
      'Exhibitor booths and the Fan Deng Books lounge',
    ],
    needsSeat: true,
    badge: '推荐', badgeEn: 'Recommended',
  },
  {
    id: 'pass-day2',
    name: '公众开放日',
    nameEn: 'Open Day',
    audience: '面向普通观众与家庭', audienceEn: 'General public & families',
    price: '免费', priceEn: 'Free',
    quota: '不限量', quotaEn: 'Unlimited',
    perks: [
      '12/6 全天游园会、市集与 AI 互动大厅',
      '选手作品布展区自由参观',
      '游园护照与打卡集章',
      '不含开幕主会场与决赛路演厅席位',
    ],
    perksEn: [
      'All-day fair, market and AI experience hall on Dec 6',
      'Free access to the shortlisted project showcase',
      'Fairground passport with stamp collecting',
      'Does not include seats at the opening main hall or finals hall',
    ],
    needsSeat: false,
    badge: '免预约', badgeEn: 'No booking',
  },
  {
    id: 'pass-forum',
    name: '分论坛选座',
    nameEn: 'Forums Only',
    audience: '有明确议题关注的观众', audienceEn: 'Focused forum-goers',
    price: '免费', priceEn: 'Free',
    quota: '不限量', quotaEn: 'Unlimited',
    perks: [
      '分论坛议题与排期待公布',
      '所有场次席位不限人数，可按需预约',
      '开场前 48 小时起停止自助取消',
      '预约成功自动生成电子入场凭证',
    ],
    perksEn: [
      'Forum topics and schedules will be announced',
      'Unlimited seats in every session — book as many as you like',
      'Self-service cancellation closes 48 hours before the start',
      'A digital entry pass is issued automatically after booking',
    ],
    needsSeat: true,
    badge: '需选座', badgeEn: 'Seat pick',
  },
  {
    id: 'pass-media',
    name: '媒体 / 行业观摩',
    nameEn: 'Media & Industry',
    audience: '媒体、投资机构、产业方', audienceEn: 'Media, VCs, industry',
    price: '免费', priceEn: 'Free',
    quota: '审核制', quotaEn: 'By application',
    perks: [
      '开幕主会场与决赛路演厅优先席位',
      '媒体采访区与产业对接区通行',
      '需提交机构信息，组委会 3 个工作日内审核',
    ],
    perksEn: [
      'Priority seats at the opening main hall and finals roadshow hall',
      'Access to the press interview area and industry matchmaking zone',
      'Institution details required; the organiser reviews within 3 working days',
    ],
    needsSeat: true,
    badge: '审核制', badgeEn: 'Review',
  },
];

/* ------------------------------------------------------------ 页面 */

export const AttendView: React.FC = () => {
  const { currentUser, setLoginModalOpen, setActiveRoute, tickets, ticketsLoading, ticketsError, issueAttendanceTicket, tr, lang } = useApp();
  const en = lang === 'en';
  const channelsEnabled = currentUser?.registrationChannelsEnabled === true;

  const [selectedPass, setSelectedPass] = useState<string>('pass-full');
  const [channel, setChannel] = useState<RegistrationChannel | ''>('');
  const [seatPicks, setSeatPicks] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ name: '', phone: '', org: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [issuedTickets, setIssuedTickets] = useState<DigitalTicket[]>([]);
  const requestPending = useRef(false);
  const formVersion = useRef(0);
  useEffect(() => {
    ++formVersion.current;
    requestPending.current = false;
    setSubmitting(false);
    setSubmitted(false);
    setIssuedTickets([]);
    setError('');
    setForm({ name: '', phone: '', org: '' }); setChannel('');
    setSeatPicks({});
  }, [currentUser?.id]);

  const pass = PASS_TYPES.find(p => p.id === selectedPass)!;

  /* Sessions available for free booking, with no attendance cap. */
  const seatOptions = useMemo(
    () => [
      { id: 'seat-open', label: '开幕主会场', labelEn: 'Opening Main Hall', when: '12/5 13:30—18:00', whenEn: 'Dec 5, 13:30–18:00', place: '乐动虹桥 · 主会场', placeEn: 'LeDong Hongqiao · Main Hall' },
      { id: 'seat-roadshow', label: '决赛路演厅', labelEn: 'Finals Hall', when: '12/6 09:30—17:00', whenEn: 'Dec 6, 09:30–17:00', place: '乐动虹桥 · 路演主会场', placeEn: 'LeDong Hongqiao · Roadshow Main Stage' },
      { id: 'seat-afterparty', label: 'After Party 创客社交之夜', labelEn: 'After Party Night', when: '12/5 18:30—21:30', whenEn: 'Dec 5, 18:30–21:30', place: '乐动虹桥', placeEn: 'LeDong Hongqiao' },
    ],
    []
  );

  const mediaPass = pass.id === 'pass-media';
  const forumPass = pass.id === 'pass-forum';
  const availableSeats = mediaPass ? seatOptions.filter(seat => ['seat-open', 'seat-roadshow'].includes(seat.id)) : seatOptions;
  const picked = pass.needsSeat && !forumPass ? availableSeats.filter(seat => seatPicks[seat.id]).map(seat => seat.id) : [];
  const selectPass = (id: string) => { if (!requestPending.current) { setSelectedPass(id); setSeatPicks({}); setError(''); } };
  const myPassTickets = tickets.filter(t => t.type === 'guest' && ['claimed', 'checked_in'].includes(t.status));

  const toggleSeat = (id: string) => setSeatPicks(prev => ({ ...prev, [id]: !prev[id] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (requestPending.current) return;

    if (!currentUser) {
      setLoginModalOpen(true);
      return;
    }
    const name = form.name.trim() || currentUser.name;
    const phone = form.phone.trim() || currentUser.phone;
    if (!name || !phone) {
      setError(tr('请填写姓名与手机号，以便生成入场凭证。', 'Please enter your name and phone number so we can issue your pass.'));
      return;
    }
    if (forumPass) { setActiveRoute('forum'); return; }
    if (!channelsEnabled && channel) { setError(tr('渠道选择已变化，请保留草稿并重新加载页面后重试。', 'Channel options changed. Keep your draft and reload before retrying.')); return; }
    if (channelsEnabled && !validRegistrationChannel(channel)) { setError(tr('请选择报名渠道', 'Select your registration channel')); return; }
    if (name.length > 64 || !/^1[3-9]\d{9}$/.test(phone)) { setError(tr('姓名不能超过 64 字，请填写正确的 11 位手机号。', 'Name must be at most 64 characters; enter a valid 11-digit mobile number.')); return; }
    if (form.org.trim().length > 128 || (mediaPass && !form.org.trim())) { setError(tr('请填写机构或学校，最多 128 字。', 'Enter your organisation or school, up to 128 characters.')); return; }
    if (pass.needsSeat && picked.length === 0) {
      setError(tr('该票种需要至少选择 1 个场次席位。', 'This pass type requires at least one session seat.'));
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    // 1) 生成参会凭证
    const newTickets = picked.length
      ? picked.map(sid => {
          const seat = seatOptions.find(s => s.id === sid)!;
          return {

            title: `DOAI 2026 参会凭证 · ${seat.label}`,
            titleEn: `DOAI 2026 Attendee Pass · ${seat.labelEn}`,
            type: 'guest' as const,
            holderName: name,
            holderPhone: phone,
            organization: form.org.trim(),
            passType: pass.id,
            ...(channelsEnabled && validRegistrationChannel(channel) ? { channel } : {}),

            status: 'claimed' as const,
            sessionTime: seat.when,
            venue: seat.place,
            issuedAt: now,
          };
        })
      : [
          {

            title: `DOAI 2026 参会凭证 · ${pass.name}`,
            titleEn: `DOAI 2026 Attendee Pass · ${pass.nameEn}`,
            type: 'guest' as const,
            holderName: name,
            holderPhone: phone,
            organization: form.org.trim(),
            passType: pass.id,
            ...(channelsEnabled && validRegistrationChannel(channel) ? { channel } : {}),

            status: 'claimed' as const,
            sessionTime: '2026-12-06 全天',
            venue: '乐动虹桥 · 公共展区',
            issuedAt: now,
          },
        ];

    setSubmitting(true);
    requestPending.current = true;
    const version = formVersion.current;
    const issued: DigitalTicket[] = [];
    try {
      for (const [i, ticket] of newTickets.entries()) {
        const stored = await issueAttendanceTicket({ ...ticket, bookingKey: `attendance:${mediaPass ? 'media:' : ''}${picked[i] || pass.id}` });
        if (formVersion.current !== version) return;
        issued.push(stored);
      }
    } catch (error) { if (formVersion.current === version) setError(error instanceof Error ? error.message : tr('报名失败，请重试', 'Registration failed. Please try again.')); return; } finally {
      if (formVersion.current === version) { requestPending.current = false; setSubmitting(false); }
    }

    setIssuedTickets(issued);
    setSubmitted(true);
  };

  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!submitted) return;
    resultRef.current?.focus({ preventScroll: true });
    resultRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [submitted]);

  const awaitingReview = issuedTickets.some(ticket => ticket.status === 'pending_review');
  const rejected = issuedTickets.some(ticket => ticket.status === 'rejected');
  /* ---------------- 已报名成功视图 ---------------- */
  if (submitted) {
    return (
      <DetailShell
        backRoute="conference"
        backLabel={tr('返回大会介绍', 'Back to Conference')}
        eyebrow="REGISTERED"
        title={tr('大会报名结果', 'Attendance result')}

      >
        <div className="max-w-2xl space-y-6">
          <div ref={resultRef} tabIndex={-1} role="status" aria-labelledby="attendance-result-title" className={`scroll-mt-24 rounded-3xl border-2 p-6 sm:p-8 text-center focus:outline-none ${rejected ? 'border-[#FECDCA] bg-[#FFF5F4]' : awaitingReview ? 'border-[#FEDF89] bg-[#FFFAEB]' : 'border-[#A9DFCD] bg-[#F0FBF6]'}`}>
            <span aria-hidden="true" className={`w-16 h-16 rounded-full text-white flex items-center justify-center mx-auto mb-5 ${rejected ? 'bg-[#B42318]' : awaitingReview ? 'bg-[#B54708]' : 'bg-[#00875F]'}`}>
              {rejected ? <AlertTriangle className="w-9 h-9" /> : <Check className="w-10 h-10" />}
            </span>
            <h2 id="attendance-result-title" className="font-extrabold text-[#0B1B3A] text-2xl sm:text-3xl">{awaitingReview ? tr('申请已提交', 'Application submitted') : rejected ? tr('申请未通过', 'Application not approved') : tr('报名成功！', 'You are registered!')}</h2>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#48597A]">{awaitingReview ? tr('待审核，通过后可入场。', 'Awaiting review. Entry requires approval.') : rejected ? tr('请查看下方审核说明。', 'See the review feedback below.') : tr('现场出示电子凭证即可入场。', 'Show your digital pass for entry.')}</p>
            <div className="mt-6 flex flex-col sm:flex-row items-stretch justify-center gap-3">
              <button type="button" onClick={() => setActiveRoute('dashboard/passport')} className="doa-btn doa-btn-primary min-h-12 whitespace-normal">
                <Ticket className="w-4 h-4 shrink-0" /> {tr('查看凭证', 'View pass')}
              </button>
              <button type="button" onClick={() => { setSubmitted(false); setSeatPicks({}); }} className="doa-btn doa-btn-ghost min-h-12 whitespace-normal">
                {tr('再报一个票种', 'Register another pass')}
              </button>
            </div>
          </div>
          <div className="doa-card p-6 sm:p-8">
            <h3 className="font-bold text-[#0B1B3A] text-lg mb-5">{tr(pass.name, pass.nameEn)}</h3>
            <div className="space-y-4 mb-6">{issuedTickets.map(ticket => <div key={ticket.id} className="rounded-2xl bg-[#F7FAFF] border border-[#E3ECFA] p-5 space-y-2">
              <div className="font-semibold text-sm">{tr(ticket.title, ticket.titleEn)}</div>
              <div className="text-xs text-[#48597A]">{ticket.status === 'pending_review' ? tr('待审核 · 通过后生成可用入场码', 'Pending review · an entry code is available after approval') : ticket.status === 'rejected' ? tr('未通过审核', 'Not approved') : ticket.status === 'checked_in' ? tr('已现场核销', 'Checked in') : tr('有效凭证', 'Valid pass')}</div>
              <div className="text-xs text-[#48597A]">{tr('报名渠道：', 'Registration channel: ')}{registrationChannelLabel(ticket.channel, lang === 'en')}</div>
              <code className="block text-xs text-[#165DFF] break-all">{ticket.qrCode || ticket.id}</code>
              <div className="text-xs text-[#6B7C9B] break-words">{tr('入场人', 'Attendee')}: {ticket.holderName} · {ticket.holderPhone}{ticket.organization ? ` · ${ticket.organization}` : ''}</div>
              {ticket.reviewFeedback && <p className={`text-xs break-words ${ticket.status === 'rejected' ? 'text-[#B42318]' : 'text-[#48597A]'}`}>{ticket.reviewFeedback}</p>}
            </div>)}</div>
          </div>
        </div>
      </DetailShell>
    );
  }

  /* ---------------- 报名表单视图 ---------------- */
  return (
    <DetailShell
      backRoute="conference"
      backLabel={tr('返回大会介绍', 'Back to Conference')}
      eyebrow="ATTENDANCE"
      title={tr('大会报名', 'Attend DOAI')}
      subtitle={tr(
          `${event.dateRange} · ${event.city} · 乐动虹桥。参会全程免费，凭电子凭证入场。`,
          'Dec 5–6 · LeDong Hongqiao, Changning, Shanghai. Free entry with a digital pass.',
        )}
      meta={[
        { label: tr('大会日期', 'Dates'), value: event.dateLabel },
        { label: tr('会场', 'Venues'), value: tr('乐动虹桥', 'LeDong Hongqiao') },
        { label: tr('报名费用', 'Fee'), value: tr('免费', 'Free') },
        { label: tr('已持有凭证', 'My Passes'), value: ticketsLoading ? tr('读取中…', 'Loading…') : ticketsError ? tr('暂不可用', 'Unavailable') : `${myPassTickets.length}` },
      ]}
      actions={
        <a href="#attend-form" className="doa-btn doa-btn-primary">
          <Ticket className="w-4 h-4" /> {tr('立即报名参会', 'Register to Attend')}
        </a>
      }
    >
      <TicketLoadStatus />
      {/* ---------- 参会须知 ---------- */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
        <div className="doa-card p-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-[#0B1B3A] mb-4 flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-[#165DFF]" /> {tr('参会须知', 'Good to Know')}
          </h2>
          <ul className="space-y-3 text-[13px] text-[#48597A] leading-relaxed">
            {[
              tr('报名、参会、市集与游园全程免费，不设任何付费通道。', 'Registration, entry, fair and market are entirely free.'),
              tr('开幕主会场、决赛路演厅与分会场均可免费预约，所有场次席位不限人数。', 'Main hall, finals hall and forums offer free booking with unlimited seats.'),
              tr('游园会、市集、AI 互动区与展商展位区对公众开放，无需预约。', 'Fairground, market, AI zones and exhibitors are open without booking.'),
              tr('凭电子凭证现场扫码入场，无需打印，也可出示「我的 DOAI」中的二维码。', 'Scan your digital pass at the gate — or show the QR in My DOAI.'),
              tr('未核销的论坛预约可在取消截止时间前调整；开场前 48 小时起停止自助取消。', 'Cancel unchecked forum reservations before their deadline; self-service cancellation closes 48 hours before the start.'),
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#165DFF] shrink-0 mt-0.5" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="doa-card p-6 space-y-4">
          <h2 className="text-lg font-bold text-[#0B1B3A]">{tr('便民信息', 'Visitor Info')}</h2>
          {[
            { icon: Baby, label: '亲子友好', labelEn: 'Family friendly', desc: '12/6 游园会设亲子体验区', descEn: 'Family zone at the fair on 12/6' },
            { icon: Accessibility, label: '无障碍', labelEn: 'Accessible', desc: '两会场均有无障碍通道与电梯', descEn: 'Accessible routes & lifts at both venues' },
            { icon: Coffee, label: '餐饮', labelEn: 'Food', desc: '长宁味道美食市集 · 本地餐饮', descEn: 'Local food stalls at the Changning market' },
            { icon: MapPin, label: '接驳', labelEn: 'Shuttle', desc: '两会场步行 8—10 分钟，短驳车循环接驳', descEn: 'Venues 8–10 min walk apart, shuttle bus loop' },
          ].map((r, i) => {
            const Icon = r.icon;
            return (
              <div key={i} className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-xl bg-[#E4EFFF] text-[#165DFF] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-[13px] font-semibold text-[#1A2B4D]">{tr(r.label, r.labelEn)}</div>
                  <div className="text-[12px] text-[#6B7C9B]">{tr(r.desc, r.descEn)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- 票种 ---------- */}
      <section className="mb-10">
        <div className="mb-5">
          <div className="doa-eyebrow mb-2.5">PASS TYPES</div>
          <h2 className="text-2xl font-extrabold text-[#0B1B3A] tracking-tight">{tr('选择参会类型', 'Choose a Pass')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PASS_TYPES.map(p => {
            const active = selectedPass === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={submitting}
                onClick={() => selectPass(p.id)}
                aria-pressed={active}
                className={`doa-card p-6 text-left transition-all ${
                  active ? 'border-[#165DFF] ring-2 ring-[#165DFF]/15 shadow-[0_12px_30px_rgba(22,93,255,0.12)]' : 'doa-card-hover'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-[#0B1B3A] text-base">{tr(p.name, p.nameEn)}</h3>
                      {!en && <span className="text-[11px] font-mono text-[#98A6BE]">{p.nameEn}</span>}
                    </div>
                    <div className="text-[12px] text-[#6B7C9B] mt-0.5">{tr(p.audience, p.audienceEn)}</div>
                  </div>
                  <span
                    className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: '#E4EFFF', color: '#165DFF' }}
                  >
                    {tr(p.badge, p.badgeEn)}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-2xl font-extrabold text-[#00B487]">{tr(p.price, p.priceEn)}</span>
                  <span className="text-[12px] text-[#98A6BE]">· {tr("名额", "quota")} {tr(p.quota, p.quotaEn)}</span>
                </div>

                <ul className="space-y-1.5">
                  {(en ? p.perksEn : p.perks).map((k, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-[#48597A] leading-relaxed">
                      <span className="w-1 h-1 rounded-full bg-[#165DFF] shrink-0 mt-1.5" />
                      <span>{k}</span>
                    </li>
                  ))}
                </ul>

                {active && (
                  <div className="mt-4 pt-3 border-t border-[#EFF5FF] flex items-center gap-2 text-[12px] font-semibold text-[#165DFF]">
                    <Check className="w-4 h-4" /> {tr('已选择', 'Selected')}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ---------- 选座 ---------- */}
      {pass.needsSeat && !forumPass && (
        <section className="mb-10">
          <div className="mb-5">
            <div className="doa-eyebrow mb-2.5">SEAT RESERVATION</div>
            <h2 className="text-2xl font-extrabold text-[#0B1B3A] tracking-tight">{tr('场次选座', 'Pick your sessions')}</h2>
            <p className="text-[13px] text-[#6B7C9B] mt-1.5">
              {tr('以下场次可多选，请至少选择 1 场；仅参观公共区域请选择「公众开放日」。', 'Choose one or more sessions. For public areas only, select Open Day.')}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableSeats.map(s => {
              const on = !!seatPicks[s.id];
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => toggleSeat(s.id)}
                  aria-pressed={on}
                  className={`doa-card p-5 text-left flex items-start gap-4 transition-all ${
                    on ? 'border-[#165DFF] ring-2 ring-[#165DFF]/15' : 'doa-card-hover'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      on ? 'bg-[#165DFF] border-[#165DFF]' : 'border-[#C0CBDD]'
                    }`}
                  >
                    {on && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-[#1A2B4D] text-sm">{tr(s.label, s.labelEn)}</div>
                    <div className="text-[12px] text-[#6B7C9B] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {en ? s.whenEn : s.when}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {tr(s.place, s.placeEn)}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {tr('席位不限', 'Unlimited seats')}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {forumPass && <section id="attend-form" className="doa-card p-8 space-y-4 mb-10"><h2 className="text-xl font-bold">{tr('按分论坛场次预约', 'Reserve a forum session')}</h2><p className="text-sm text-[#6B7C9B]">{tr('请进入分论坛列表选择具体议题和场次，预约将生成对应论坛凭证。', 'Choose a topic and session in the forum list to receive the corresponding forum pass.')}</p><button type="button" onClick={() => setActiveRoute('forum')} className="doa-btn doa-btn-primary">{tr('前往分论坛预约', 'Reserve a forum session')}</button></section>}
      {/* ---------- 报名表单 ---------- */}
      {!forumPass && <section id="attend-form" className="scroll-mt-24 mb-10">
        <div className="doa-card p-6 sm:p-8 max-w-3xl">
          <h2 className="text-xl font-extrabold text-[#0B1B3A] mb-1.5">{tr('填写报名信息', 'Your details')}</h2>
          <p className="text-[13px] text-[#6B7C9B] mb-6">
            {tr('信息仅用于生成入场凭证与现场核验，不会用于任何商业用途。', 'We use this only to issue your pass and verify it on site — never for marketing.')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="doa-label" htmlFor="att-name">{tr('姓名 *', 'Name *')}</label>
                <input
                  id="att-name" maxLength={64} disabled={submitting}
                  className="doa-input"
                  placeholder={currentUser?.name || tr('你的姓名', 'Your name')}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="doa-label" htmlFor="att-phone">{tr('手机号 *', 'Mobile *')}</label>
                <input
                  id="att-phone" maxLength={11} disabled={submitting}
                  className="doa-input"
                  inputMode="tel"
                  placeholder={currentUser?.phone || tr('用于接收入场凭证', 'Used to receive your pass')}
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="doa-label" htmlFor="att-org">{mediaPass ? tr('机构 / 学校 *', 'Organisation / school *') : tr('机构 / 学校（选填）', 'Organisation / school (optional)')}</label>
              <input
                id="att-org" maxLength={128} disabled={submitting}
                className="doa-input"
                placeholder={tr('用于制作参会证件', 'Printed on your attendee badge')}
                value={form.org}
                onChange={e => setForm(f => ({ ...f, org: e.target.value }))}
              />
            </div>

            {channelsEnabled && <div>
              <label htmlFor="attendance-channel" className="block text-xs font-semibold text-[#48597A] mb-2">{tr('报名渠道', 'Registration channel')} <span className="text-[#FF7D00]">*</span></label>
              <select id="attendance-channel" required disabled={submitting} value={channel} onChange={event => setChannel(event.target.value as RegistrationChannel | '')} className="doa-input w-full">
                <option disabled value="">{tr('请选择报名渠道', 'Select your registration channel')}</option>
                {registrationChannels.map(item => <option key={item.id} value={item.id}>{tr(item.zh, item.en)}</option>)}
              </select>
              <p className="mt-2 text-xs text-[#6B7C9B]">{tr('请选择你本次报名的来源渠道，方便对应工作人员跟进。', 'Select where you registered from so the relevant team can follow up.')}</p>
            </div>}
            {/* summary */}
            <div className="rounded-2xl bg-[#F7FAFF] border border-[#E3ECFA] p-5">
              <div className="text-[11px] uppercase tracking-wider text-[#98A6BE] font-semibold mb-2.5">
                {tr('报名摘要', 'Summary')}
              </div>
              <div className="space-y-1.5 text-[13px] text-[#48597A]">
                <div className="flex justify-between gap-4">
                  <span>{tr('参会类型', 'Pass type')}</span>
                  <span className="font-semibold text-[#1A2B4D]">{tr(pass.name, pass.nameEn)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>{tr('费用', 'Fee')}</span>
                  <span className="font-semibold text-[#00B487]">{tr('免费', 'Free')}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>{tr('预约场次', 'Sessions booked')}</span>
                  <span className="font-semibold text-[#1A2B4D]">
                    {picked.length || tr('未选座', 'No seat selected')}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl bg-[#FFF1F0] border border-[#FFCCC7] p-4">
                <AlertTriangle className="w-4 h-4 text-[#E5484D] shrink-0 mt-0.5" />
                <span className="text-[13px] text-[#B42318]">{error}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={submitting} className="doa-btn doa-btn-primary">
                <Ticket className="w-4 h-4" /> {tr('提交报名', 'Submit registration')}
              </button>
              <button type="button" onClick={() => setActiveRoute('forum')} className="doa-btn doa-btn-ghost">
                {tr('查看分论坛安排', 'View the forum programme')}
              </button>
            </div>

            <p className="text-[12px] text-[#98A6BE] flex items-start gap-2 pt-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {tr('大会全程免费。任何以「内部推荐」「保进席位」名义收费的行为均为诈骗，请提高警惕。', 'The whole conference is free. Anyone charging for “internal referrals” or “guaranteed seats” is committing fraud — stay alert.')}
            </p>
          </form>
        </div>
      </section>}

      {/* ---------- 凭证说明 ---------- */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: QrCode, title: tr('凭证形式', 'Your pass'), desc: tr('提交后立即生成电子入场凭证，存于「我的 DOAI」。', 'A digital pass is issued right after you submit and stored in My DOAI.') },
          { icon: Users, title: tr('现场核验', 'On-site check-in'), desc: tr('入口扫码核验，一号一证，可带 1 名同行（需同场次）。', 'Scan to verify at the gate — one pass per person, plus one guest in the same session.') },
          { icon: Download, title: tr('预约调整', 'Booking changes'), desc: tr('未核销论坛票可在开场前 48 小时的截止点之前自助取消；其他调整请联系组委会。', 'Cancel unchecked forum passes before the 48-hour cutoff. Contact the organisers for other changes.') },
        ].map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="doa-card p-6">
              <Icon className="w-5 h-5 text-[#165DFF] mb-3" />
              <h3 className="font-bold text-[#0B1B3A] text-sm mb-1.5">{c.title}</h3>
              <p className="text-[13px] text-[#6B7C9B] leading-relaxed">{c.desc}</p>
            </div>
          );
        })}
      </section>

      {/* ---------- 双会场速览 ---------- */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-[#0B1B3A] mb-5">{tr('主会场与配套空间', 'Main venue & supporting spaces')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {planVenues.map((v, i) => (
            <div key={i} className="doa-card p-6">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-[#165DFF]" />
                <h3 className="font-bold text-[#0B1B3A]">{tr(v.name, v.nameEn)}</h3>
              </div>
              <div className="text-[12px] text-[#6B7C9B] mb-3">{tr(v.role, v.roleEn)}</div>
              <ul className="space-y-2">
                {v.sessions.map((s, si) => (
                  <li key={si} className="text-[13px] text-[#48597A] leading-relaxed">
                    <span className="font-mono text-[12px] text-[#165DFF] font-semibold mr-2">{tr(s.when, s.whenEn)}</span>
                    {tr(s.content, s.contentEn)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- 议题参考 ---------- */}
      {planForums.length > 0 && <section className="mt-10">
        <div className="flex items-end justify-between gap-4 mb-5">
          <h2 className="text-lg font-bold text-[#0B1B3A]">{tr('分会场议题', 'Sub-venue topics')}</h2>
          <button type="button" onClick={() => setActiveRoute('forum')} className="text-[13px] font-semibold text-[#165DFF] hover:underline">
            {tr('查看全部并预约', 'View all and book')} →
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {planForums.map((f, i) => (
            <span key={i} className="doa-chip">{(en ? f.nameEn : f.name.replace('DOAI ', ''))}</span>
          ))}
        </div>
      </section>}
      </DetailShell>
  );
};
