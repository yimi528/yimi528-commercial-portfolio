import { registrationChannelLabel } from './registrationChannel.ts';
import type { DigitalTicket } from '../types';
import { apiRequest } from './api.ts';

export function validAttendanceTicket(value: unknown): value is DigitalTicket {
  if (!value || typeof value !== 'object') return false;
  const ticket = value as DigitalTicket;
  return typeof ticket.id === 'string' && Boolean(ticket.id) && ticket.type === 'guest' && typeof ticket.bookingKey === 'string'
    && ['pending_review', 'rejected', 'claimed', 'checked_in'].includes(ticket.status) && typeof ticket.holderName === 'string' && typeof ticket.holderPhone === 'string'
    && (['claimed', 'checked_in'].includes(ticket.status) ? typeof ticket.qrCode === 'string' && Boolean(ticket.qrCode) : !ticket.qrCode);
}
export async function loadAttendanceApplications(): Promise<DigitalTicket[]> {
  const result = await apiRequest<{ ok: boolean; applications: DigitalTicket[] }>('/api/attendance-applications');
  if (result.ok !== true || !Array.isArray(result.applications) || !result.applications.every(validAttendanceTicket)) throw new Error('参会申请未读取成功');
  return result.applications;
}
export async function reviewAttendance(id: string, status: 'claimed' | 'rejected', feedback: string): Promise<DigitalTicket> {
  const result = await apiRequest<{ ok: boolean; ticket: DigitalTicket }>('/api/attendance-review', { id, status, feedback });
  if (result.ok !== true || !validAttendanceTicket(result.ticket) || result.ticket.id !== id || result.ticket.status !== status) throw new Error('参会审核结果未确认，请刷新后重试');
  return result.ticket;
}

export function attendanceCSV(tickets: DigitalTicket[]): string {
  const cell = (value: unknown) => {
    let text = String(value ?? '');
    if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const rows = tickets.map(row => [row.id, row.ownerUserId, row.holderName, row.holderPhone, row.organization, row.title, row.passType, row.channel ? registrationChannelLabel(row.channel) : registrationChannelLabel(null), row.status, row.reviewFeedback, row.issuedAt, row.checkedInAt]);
  return '\uFEFF' + [['报名ID', '账号ID', '姓名', '手机号', '机构／学校', '场次', '参会类型', '报名渠道', '状态', '审核说明', '报名时间', '签到时间'], ...rows].map(row => row.map(cell).join(',')).join('\r\n');
}
