import React from 'react';
import { useApp } from '../../context/AppContext';
export const ForumStatsStatus: React.FC = () => {
  const { forumStatsLoading, forumStatsError, reloadForumStats, tr } = useApp();
  return <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
    <p role="status" className="text-[#6B7C9B]">{forumStatsLoading ? tr('正在读取预约统计…', 'Loading booking statistics…') : forumStatsError ? tr('预约统计暂时无法加载，请重试。', 'Booking statistics could not be loaded. Please retry.') : tr('预约人数包含已核销的论坛票。', 'Reservations include checked-in forum passes.')}</p>
    <button type="button" disabled={forumStatsLoading} onClick={() => void reloadForumStats()} className="text-[#165DFF] font-semibold disabled:opacity-50">{forumStatsError ? tr('重新加载预约统计', 'Reload booking statistics') : tr('刷新预约统计', 'Refresh booking statistics')}</button>
  </div>;
};
