import { useEffect, useState } from 'react';
import { FORUM_IDS, forumSchedule } from './forumSchedule';

export function useForumClock(sessions: { startsAt?: string; endsAt?: string }[] = []) {
  const [now, setNow] = useState(Date.now);
  const boundaries = sessions.flatMap(s => s.startsAt && s.endsAt ? [Date.parse(s.startsAt) - 48 * 3600000, Date.parse(s.endsAt)] : []).join(',');
  useEffect(() => {
    let timer: number;
    const update = () => {
      const current = Date.now(); setNow(current);
      window.clearTimeout(timer);
      const future = [...boundaries.split(',').filter(Boolean).map(Number), ...FORUM_IDS.flatMap(id => {
        const schedule = forumSchedule(id)!;
        return [Date.parse(schedule.cancellationDeadline), Date.parse(schedule.endsAt)];
      })].filter(time => time > current);
      timer = window.setTimeout(update, Math.min(60000, Math.max(1, Math.min(...future) - current + 1)));
    };
    update();
    window.addEventListener('focus', update); document.addEventListener('visibilitychange', update);
    return () => { window.clearTimeout(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); };
  }, [boundaries]);
  return now;
}
