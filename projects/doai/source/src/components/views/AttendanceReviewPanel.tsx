import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { canManageRegistrations, registrationAccessKey, registrationChannelLabel, validRegistrationChannel } from '../../lib/registrationChannel.ts';
import { loadAttendanceApplications, reviewAttendance, attendanceCSV } from '../../lib/attendanceApi';
import { useRemoteList } from '../../lib/useRemoteList';
import type { DigitalTicket } from '../../types';

export const AttendanceReviewPanel: React.FC<{ channelFilter?: string }> = ({ channelFilter = 'all' }) => {
  const { currentUser, tr, lang } = useApp();
  const owner = canManageRegistrations(currentUser) ? `${currentUser.id}:${registrationAccessKey(currentUser)}` : null;
  const list = useRemoteList(owner, loadAttendanceApplications);
  const rows = list.items.filter(row => currentUser?.role === 'admin' || (currentUser?.role === 'channel_operator' && validRegistrationChannel(currentUser.operatorChannel) && row.channel === currentUser.operatorChannel)).filter(row => channelFilter === 'all' || row.channel === channelFilter);
  const exportCSV = () => {
    if (list.loading || list.error) return;
    const url = URL.createObjectURL(new Blob([attendanceCSV(rows)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'doai-attendance.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  useEffect(() => { setSelected(null); setFeedback(''); setError(''); }, [channelFilter]);
  const [selected, setSelected] = useState<DigitalTicket | null>(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const decide = async (status: 'claimed' | 'rejected') => {
    if (!selected || pending.current) return;
    if (status === 'rejected' && !feedback.trim()) { setError(tr('请填写未通过的原因', 'Provide a reason for declining.')); return; }
    pending.current = true; setBusy(true); setError('');
    try {
      const saved = await reviewAttendance(selected.id, status, feedback.trim());
      if (!mounted.current) return;
      list.setItems(previous => previous.map(row => row.id === saved.id ? saved : row));
      setSelected(null); setFeedback('');
    } catch (error) { if (mounted.current) setError(error instanceof Error ? error.message : tr('审核未保存，请重试', 'The review was not saved. Please retry.')); }
    finally { if (mounted.current) { pending.current = false; setBusy(false); } }
  };
  return <section aria-label={tr('参会申请审核', 'Attendance applications')} className="pt-8 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">{tr('大会报名与审核', 'Attendance registrations and reviews')}</h3><button type="button" disabled={list.loading || list.error || busy} onClick={exportCSV} className="doa-btn doa-btn-secondary">{tr('导出参会数据 (CSV)', 'Export attendance CSV')}</button><button type="button" disabled={list.loading || busy} onClick={() => void list.reload()} className="doa-btn doa-btn-secondary">{tr('刷新参会申请', 'Refresh applications')}</button></div>
    {!list.loading && !list.error && <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[{ label: tr('报名记录', 'Registrations'), value: rows.length }, { label: tr('报名人数（按账号去重）', 'Unique attendees'), value: new Set(rows.map(row => row.ownerUserId || row.id)).size }, { label: tr('待审核', 'Pending review'), value: rows.filter(row => row.status === 'pending_review').length }, { label: tr('已签到', 'Checked in'), value: rows.filter(row => row.status === 'checked_in').length }].map(metric => <div key={metric.label} className="doa-card p-4"><p className="text-xs text-[#6B7C9B]">{metric.label}</p><p className="mt-2 text-2xl font-semibold text-[#165DFF]">{metric.value}</p></div>)}</div>}
    {list.loading && <p role="status">{tr('正在读取参会申请…', 'Loading applications…')}</p>}
    {list.error && <div role="status" className="doa-card p-6 space-y-3"><p>{tr('参会申请暂时无法加载，请重试。', 'Applications could not be loaded. Please retry.')}</p><button type="button" onClick={() => void list.reload()} className="doa-btn doa-btn-secondary">{tr('重新加载参会申请', 'Reload applications')}</button></div>}
    {!list.loading && !list.error && rows.length === 0 && <p>{tr('暂无参会申请', 'No attendance applications yet')}</p>}
    {!list.loading && !list.error && rows.map(ticket => <article key={ticket.id} className="doa-card p-5 space-y-3">
      <h4 className="font-bold break-words">{tr(ticket.title, ticket.titleEn)}</h4><p className="text-sm break-words">{ticket.holderName} · {ticket.holderPhone} · {ticket.organization || '—'}</p>
      <p className="text-xs text-[#165DFF]">{registrationChannelLabel(ticket.channel, lang === 'en')}</p>
      <p className="text-xs text-[#6B7C9B]">{ticket.sessionTime} · {ticket.venue}</p>
      <p className="text-sm">{ticket.status === 'pending_review' ? tr('待审核', 'Pending review') : ticket.status === 'rejected' ? tr('未通过审核', 'Not approved') : ticket.status === 'checked_in' ? tr('已现场核销', 'Checked in') : ticket.bookingKey?.includes(':media:') ? tr('已通过审核', 'Approved') : tr('已出票', 'Pass issued')}</p>
      {ticket.reviewFeedback && <p className="text-sm break-words">{ticket.reviewFeedback}</p>}
      {ticket.status === 'pending_review' && <button type="button" onClick={() => { setSelected(ticket); setFeedback(''); setError(''); }} className="doa-btn doa-btn-primary">{tr('审核参会申请', 'Review application')}</button>}
    </article>)}
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"><form onSubmit={event => { event.preventDefault(); void decide('claimed'); }} role="dialog" aria-modal="true" aria-labelledby="attendance-review-title" className="w-full max-w-lg max-h-[90svh] overflow-y-auto bg-white rounded-2xl p-6 space-y-4">
      <h3 id="attendance-review-title" className="font-bold">{tr('审核参会申请', 'Review application')}</h3><p className="break-words text-sm">{selected.holderName} · {selected.organization}</p>
      <label className="block text-sm" htmlFor="attendance-review-feedback">{tr('审核说明（拒绝时必填）', 'Feedback (required when declining)')}</label><textarea id="attendance-review-feedback" maxLength={1000} disabled={busy} value={feedback} onChange={event => setFeedback(event.target.value)} className="doa-input w-full" />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy} className="doa-btn doa-btn-primary">{busy ? tr('正在保存…', 'Saving…') : tr('通过并签发凭证', 'Approve and issue pass')}</button><button type="button" disabled={busy} onClick={() => void decide('rejected')} className="doa-btn doa-btn-secondary">{tr('不通过', 'Decline')}</button><button type="button" disabled={busy} onClick={() => { setSelected(null); setError(''); }} className="doa-btn doa-btn-ghost">{tr('关闭', 'Close')}</button></div>
    </form></div>}
  </section>;
};
