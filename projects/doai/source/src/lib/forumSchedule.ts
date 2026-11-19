// Release this schedule with its byte-identical backend copy.
// Historical slots retained only for existing ticket cancellation and records.
// No provisional forum is published or open for new reservations.
const afternoon = new Set([2, 3, 7, 10, 12, 13, 15, 17]);
const allDay = new Set([5, 8]);
export const FORUM_IDS = Array.from({ length: 18 }, (_, index) => `forum-${index + 1}`);
export const PUBLISHED_FORUM_IDS: string[] = [];
export const isForumPublished = (id: string): boolean => PUBLISHED_FORUM_IDS.includes(id);
export const CANCELLATION_LEAD_MS = 48 * 60 * 60 * 1000;
export function forumSchedule(id: string) {
  const index = FORUM_IDS.indexOf(id) + 1;
  if (!index) return null;
  const startsAt = `2026-12-06T${afternoon.has(index) ? '14' : '10'}:00:00+08:00`;
  const endsAt = `2026-12-06T${afternoon.has(index) || allDay.has(index) ? '17' : '12'}:00:00+08:00`;
  return { startsAt, endsAt, cancellationDeadline: new Date(Date.parse(startsAt) - CANCELLATION_LEAD_MS).toISOString() };
}
export function forumRules(id: string, now: number = Date.now(), session?: { startsAt?: string; endsAt?: string; bookingEnabled?: boolean; publication?: string; capacity?: number | null; bookedCount?: number }) {
  const schedule = session?.startsAt && session?.endsAt ? { startsAt: session.startsAt, endsAt: session.endsAt, cancellationDeadline: new Date(Date.parse(session.startsAt) - CANCELLATION_LEAD_MS).toISOString() } : forumSchedule(id);
  if (!schedule) return null;
  return { ...schedule, cancellationOpen: now < Date.parse(schedule.cancellationDeadline), bookingOpen: now < Date.parse(schedule.endsAt) && session?.bookingEnabled !== false && session?.publication !== 'draft' && (session?.capacity == null || (session.bookedCount ?? 0) < session.capacity) };
}
export function forumIdFromBookingKey(key: string): string | null {
  const id = key.startsWith('forum:') ? key.slice(6) : '';
  return forumSchedule(id) ? id : null;
}
