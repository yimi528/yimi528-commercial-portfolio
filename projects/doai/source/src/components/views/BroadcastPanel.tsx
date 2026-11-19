import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, Eye, Inbox, Megaphone, RefreshCw, Send, Users, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiRequest } from '../../lib/api';
import type { NotificationItem } from '../../types';

export function BroadcastPanel({ active }: { active: boolean }) {
  const { tr, lang, notifications, notificationsLoading, notificationsError, reloadNotifications, setNotifications } = useApp();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef(false);
  const refreshPending = useRef(false);
  const mounted = useRef(true);
  const titleInput = useRef<HTMLInputElement>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (!active) dialog.current?.close(); }, [active]);

  const ready = Boolean(title.trim() && content.trim());
  const notices = notifications.filter(item => item.type === 'system' && (!item.toUserId || item.toUserId === 'all'))
    .sort((a, b) => (Date.parse(b.time) || 0) - (Date.parse(a.time) || 0)).slice(0, 10);
  const formatTime = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'zh-CN', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(date);
  };
  const templates = [
    { label: tr('日程调整', 'Schedule change'), title: tr('关于大会日程调整的通知', 'Event schedule update'), content: tr('各位创客：\n\n原定于【时间】举行的【活动名称】，现调整至【新时间】，地点为【地点】。\n\n请及时调整行程。如有疑问，请联系组委会。\n\nDOAI 大会组委会', 'Dear makers,\n\n【Event】 scheduled for 【time】 has moved to 【new time】 at 【venue】.\n\nPlease update your plans. Contact the organizing committee with any questions.\n\nDOAI Organizing Committee') },
    { label: tr('报名提醒', 'Registration reminder'), title: tr('大会报名截止提醒', 'Event registration deadline'), content: tr('各位创客：\n\n大会报名将于【截止时间】结束。计划参与的创客请在截止前完成报名，并确认信息完整。\n\nDOAI 大会组委会', 'Dear makers,\n\nEvent registration closes at 【deadline】. Please complete your registration and check your details before then.\n\nDOAI Organizing Committee') },
    { label: tr('参会指引', 'Attendance guide'), title: tr('大会参会与签到指引', 'Event attendance and check-in guide'), content: tr('各位创客：\n\n大会将于【时间】在【地点】举行。请提前查看入场凭证，并于【签到时间】前往【签到地点】签到。\n\nDOAI 大会组委会', 'Dear makers,\n\nThe event takes place at 【venue】 on 【date】. Please have your entry pass ready and check in at 【check-in location】 at 【check-in time】.\n\nDOAI Organizing Committee') },
  ];
  const hasPlaceholders = /【(?:时间|活动名称|新时间|地点|截止时间|签到时间|签到地点|Event|time|new time|venue|deadline|check-in location|check-in time|date)】/.test(title + content);
  const useTemplate = (index: number) => {
    if ((title || content) && !window.confirm(tr('使用模板将替换当前内容，是否继续？', 'Replace the current draft with this template?'))) return;
    setTitle(templates[index].title); setContent(templates[index].content); setSent(''); setError('');
    titleInput.current?.focus();
  };
  const openConfirmation = (event: React.FormEvent) => {
    event.preventDefault();
    if (!active || !ready || pending.current || hasPlaceholders) return;
    setConfirmed(false); setError(''); dialog.current?.showModal();
  };
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!dialog.current?.open || !confirmed || !ready || pending.current || hasPlaceholders) return;
    pending.current = true; setSaving(true); setError(''); setSent('');
    const sentTitle = title.trim();
    try {
      const result = await apiRequest<{ notification: NotificationItem }>('/api/notifications', { to: 'all', type: 'system', title: sentTitle, content: content.trim() });
      if (!result.notification?.id) throw new Error(tr('通知发送未完成，请重试', 'The notification was not sent. Please retry.'));
      if (!mounted.current) return;
      setNotifications(prev => [result.notification, ...prev.filter(item => item.id !== result.notification.id)]);
      setSent(sentTitle); setTitle(''); setContent(''); setConfirmed(false); dialog.current?.close();
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : tr('发送失败，请重试', 'Sending failed. Please retry.'));
    } finally {
      if (mounted.current) { pending.current = false; setSaving(false); }
    }
  };
  const refresh = async () => {
    if (refreshPending.current) return;
    refreshPending.current = true; setRefreshing(true); setRefreshError(false);
    try { const ok = await reloadNotifications(); if (mounted.current) setRefreshError(!ok); }
    catch { if (mounted.current) setRefreshError(true); }
    finally { if (mounted.current) { refreshPending.current = false; setRefreshing(false); } }
  };
  const preview = (isConfirmation = false) => (
    <div className="min-w-0 rounded-xl border border-[#E3ECFA] bg-white p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EFF5FF] text-[#165DFF]"><Megaphone aria-hidden="true" className="h-4 w-4" /></span>
        <div><p className="text-xs font-semibold text-[#0B1B3A]">{tr('DOAI 大会组委会', 'DOAI Organizing Committee')}</p><p className="mt-1 text-[11px] text-[#6B7C9B]">{tr('官方公告', 'Official announcement')}</p></div>
      </div>
      <h4 className={`mt-5 break-words text-base font-semibold leading-relaxed [overflow-wrap:anywhere] ${title.trim() ? 'text-[#0B1B3A]' : 'text-[#98A6BE]'}`}>{title.trim() || tr('通知标题将在这里显示', 'Your title appears here')}</h4>
      <p className={`mt-3 whitespace-pre-wrap break-words text-[13px] leading-7 [overflow-wrap:anywhere] ${isConfirmation ? 'max-h-56 overflow-y-auto' : ''} ${content.trim() ? 'text-[#48597A]' : 'text-[#98A6BE]'}`}>{content.trim() || tr('填写左侧内容，预览用户收到的通知。', 'Write your message to preview what recipients will see.')}</p>
    </div>
  );

  return (
    <div className="space-y-8 text-[#0B1B3A] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-[#165DFF]">
      {sent && <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-semibold">{tr('站内信已下发', 'Notification sent')}</p><p className="mt-1 break-words [overflow-wrap:anywhere]">{tr(`「${sent}」已发布，用户可在消息中心查看。`, `“${sent}” is now available in the message center.`)}</p></div></div>}

      <div className="overflow-hidden rounded-2xl border border-[#E3ECFA] bg-white">
        <div className="flex flex-wrap items-start gap-3 border-b border-[#E3ECFA] px-5 py-5 sm:px-6">
          <Users aria-hidden="true" className="mt-0.5 h-5 w-5 text-[#165DFF]" />
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2.5"><h3 className="text-sm font-semibold">{tr('接收范围：全站注册用户', 'Recipients: all registered users')}</h3><span className="rounded-md bg-[#EFF5FF] px-2 py-1 text-[11px] font-medium text-[#165DFF]">{tr('站内信', 'In-app message')}</span></div><p className="mt-2 text-xs leading-6 text-[#6B7C9B]">{tr('适用于与所有用户有关的大会事项。发送后显示在消息中心，不发送短信或微信。', 'Use for updates relevant to everyone. Notices appear in the message center; no SMS or WeChat message is sent.')}</p></div>
        </div>

        <div className="grid min-w-0 grid-cols-1 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <form onSubmit={openConfirmation} aria-label="群发站内信" className="min-w-0 p-5 sm:p-6">
            <fieldset disabled={saving} className="min-w-0 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold">{tr('编写通知', 'Compose notice')}</h3><label className="flex items-center gap-2 text-xs text-[#6B7C9B]">{tr('常用模板', 'Templates')}<select aria-label={tr('选择通知模板', 'Choose a notice template')} value="" onChange={event => { if (event.target.value) useTemplate(Number(event.target.value)); }} className="max-w-40 rounded-lg border border-[#E3ECFA] bg-white px-2 py-2 text-xs text-[#48597A] focus-visible:outline-[#165DFF]"><option value="">{tr('选择模板', 'Choose template')}</option>{templates.map((template, index) => <option key={index} value={index}>{template.label}</option>)}</select></label></div>
              <div><div className="mb-2 flex items-center justify-between gap-2"><label htmlFor="broadcast-title" className="text-xs font-semibold">{tr('通知标题', 'Title')} <span className="text-red-500">*</span></label><span className="text-[11px] tabular-nums text-[#6B7C9B]">{title.length}/128</span></div><input ref={titleInput} id="broadcast-title" required maxLength={128} value={title} onChange={event => setTitle(event.target.value)} placeholder={tr('例如：大会签到时间与入场指引', 'e.g. Event check-in and entry guide')} className="doa-input" /></div>
              <div><div className="mb-2 flex items-center justify-between gap-2"><label htmlFor="broadcast-content" className="text-xs font-semibold">{tr('通知正文', 'Message')} <span className="text-red-500">*</span></label><span className="text-[11px] tabular-nums text-[#6B7C9B]">{content.length}/2000</span></div><textarea id="broadcast-content" required rows={9} maxLength={2000} value={content} onChange={event => setContent(event.target.value)} placeholder={tr('说明具体事项、时间、地点，以及用户需要完成的操作。', 'Include the details, time, location and any action required.')} aria-describedby="broadcast-content-help" className="doa-input min-h-48 resize-y leading-7" /><p id="broadcast-content-help" className={`mt-2 text-xs leading-5 ${hasPlaceholders ? 'text-amber-700' : 'text-[#6B7C9B]'}`}>{hasPlaceholders ? tr('请先替换模板中【】内的待填写内容。', 'Replace all 【placeholder】 text before sending.') : tr('建议写明时间、地点和联系方式，方便用户行动。', 'Include time, location and contact details where relevant.')}</p></div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E3ECFA] pt-5"><p className="text-xs text-[#6B7C9B]">{tr('下一步核对内容与接收范围', 'Review content and recipients next')}</p><button type="submit" disabled={!ready || hasPlaceholders} className="doa-btn doa-btn-primary gap-2 text-xs"><Eye aria-hidden="true" className="h-4 w-4" />{saving ? tr('正在发送…', 'Sending…') : tr('预览并确认', 'Review and confirm')}</button></div>
            </fieldset>
          </form>
          <aside aria-label={tr('通知实时预览', 'Live notice preview')} className="min-w-0 border-t border-[#E3ECFA] bg-[#F7FAFF] p-5 sm:p-6 xl:border-l xl:border-t-0"><div className="mb-5 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{tr('用户收到的通知', 'Recipient preview')}</h3><span className="flex items-center gap-1.5 text-[11px] text-[#6B7C9B]"><span className="h-1.5 w-1.5 rounded-full bg-[#165DFF]" />{tr('实时预览', 'Live preview')}</span></div>{preview()}<p className="mt-4 text-xs leading-6 text-[#6B7C9B]">{tr('以组委会名义发布，请确认内容准确后发送。', 'Published on behalf of the organizing committee. Check the details before sending.')}</p></aside>
        </div>
      </div>

      <section aria-labelledby="broadcast-history-title">
        <div className="flex items-center justify-between gap-3"><h3 id="broadcast-history-title" className="text-sm font-semibold">{tr('近期全员通知', 'Recent notices to everyone')}</h3><button type="button" disabled={refreshing || notificationsLoading || saving} onClick={() => void refresh()} className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-[#48597A] hover:bg-[#F7FAFF] disabled:opacity-50"><RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />{refreshing ? tr('刷新中…', 'Refreshing…') : tr('刷新通知', 'Refresh notices')}</button></div>
        <p className="mb-4 mt-1 text-xs leading-6 text-[#6B7C9B]">{tr('展示当前消息列表中最近的 10 条全员公告，可展开查看正文。', 'Up to 10 recent announcements from the current message list. Expand to read.')}</p>
        {notificationsLoading ? <p role="status" className="py-8 text-center text-sm text-[#6B7C9B]">{tr('正在读取通知…', 'Loading notices…')}</p> : notificationsError || refreshError ? <p role="alert" className="rounded-xl border border-red-200 p-4 text-sm text-red-700">{tr('通知读取失败，请点击「刷新通知」重试。', 'Notices could not be loaded. Select “Refresh notices” to retry.')}</p> : notices.length ? <div className="divide-y divide-[#E3ECFA] border-y border-[#E3ECFA]">{notices.map(notice => <details key={notice.id} className="group"><summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 py-4 text-sm focus-visible:outline-[#165DFF] [&::-webkit-details-marker]:hidden"><Megaphone aria-hidden="true" className="h-4 w-4 shrink-0 text-[#6B7C9B]" /><span className="min-w-0 flex-1 break-words font-medium [overflow-wrap:anywhere]">{notice.title}</span><span className="text-xs text-[#6B7C9B]">{formatTime(notice.time)}</span><ChevronDown aria-hidden="true" className="h-4 w-4 text-[#6B7C9B] group-open:rotate-180" /></summary><p className="pb-5 pl-7 whitespace-pre-wrap break-words text-sm leading-7 text-[#48597A] [overflow-wrap:anywhere]">{notice.content}</p></details>)}</div> : <div className="flex flex-col items-center rounded-xl border border-dashed border-[#D6E2F5] px-5 py-8 text-center"><Inbox aria-hidden="true" className="mb-3 h-6 w-6 text-[#98A6BE]" /><p className="text-sm font-medium">{tr('暂无全员通知', 'No announcements yet')}</p><p className="mt-2 text-xs text-[#6B7C9B]">{tr('成功发送的通知会在这里显示。', 'Successfully sent notices will appear here.')}</p></div>}
      </section>

      <dialog ref={dialog} aria-labelledby="broadcast-confirm-title" aria-describedby="broadcast-confirm-description" onCancel={event => { if (pending.current) event.preventDefault(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-[#E3ECFA] bg-white p-0 text-[#0B1B3A] shadow-xl backdrop:bg-[#0B1B3A]/40">
        <form onSubmit={send} aria-label="确认群发站内信" className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><h3 id="broadcast-confirm-title" className="text-lg font-bold">{tr('确认发送给全站用户？', 'Send to all registered users?')}</h3><button type="button" autoFocus disabled={saving} onClick={() => dialog.current?.close()} aria-label={tr('关闭发送确认', 'Close confirmation')} className="rounded-lg p-2 text-[#6B7C9B] hover:bg-[#F7FAFF] disabled:opacity-50"><X aria-hidden="true" className="h-4 w-4" /></button></div>
          <p id="broadcast-confirm-description" className="mb-5 mt-2 text-xs leading-6 text-[#6B7C9B]">{tr('通知将以组委会名义立即发布至消息中心，发送后无法在此撤回或修改。', 'This notice will be published immediately on behalf of the organizing committee. It cannot be recalled or edited here.')}</p>
          {preview(true)}
          <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-sm leading-6"><input id="broadcast-confirm-scope" type="checkbox" required checked={confirmed} disabled={saving} onChange={event => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#165DFF]" />{tr('我已核对内容，确认这条通知适用于全站用户。', 'I have checked the content and confirm it is relevant to all users.')}</label>
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700">{error}</p>}
          <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" disabled={saving} onClick={() => dialog.current?.close()} className="doa-btn doa-btn-secondary text-xs">{tr('返回修改', 'Back to editing')}</button><button type="submit" disabled={!confirmed || saving} className="doa-btn doa-btn-primary gap-2 text-xs"><Send aria-hidden="true" className="h-3.5 w-3.5" />{saving ? tr('正在发送…', 'Sending…') : tr('确认发送站内信', 'Send notice')}</button></div>
        </form>
      </dialog>
    </div>
  );
}
