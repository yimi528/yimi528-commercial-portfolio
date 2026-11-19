import React from 'react';
import type { DigitalTicket } from '../../types';
import { useApp } from '../../context/AppContext';
import { forumRules } from '../../lib/forumSchedule';
import { useForumClock } from '../../lib/useForumClock';
export const ForumTicketActions: React.FC<{ ticket: DigitalTicket }> = ({ ticket }) => {
  const { cancelForum, forumPending, ticketsLoading, ticketsError, tr } = useApp();
  const now = useForumClock([ticket]);
  const id = ticket.bookingKey?.startsWith('forum:') ? ticket.bookingKey.slice(6) : '';
  const rules = forumRules(id, now, ticket);
  if (ticket.type !== 'forum' || !id) return null;
  return <div className="mt-3 text-xs text-[#6B7C9B]">
    {ticket.status === 'claimed' && rules?.cancellationOpen ? <button type="button" disabled={ticketsLoading || ticketsError || forumPending.includes(id)} onClick={() => void cancelForum(id)} className="doa-btn doa-btn-ghost disabled:opacity-50">{forumPending.includes(id) ? tr('正在取消…', 'Cancelling…') : tr('取消论坛预约', 'Cancel forum reservation')}</button> : <p>{ticket.status === 'checked_in' ? tr('已核销 · 不可取消', 'Checked in · Cannot cancel') : tr('已过自助取消时间，请联系组委会。', 'Self-service cancellation has closed. Contact the organisers.')}</p>}
  </div>;
};
