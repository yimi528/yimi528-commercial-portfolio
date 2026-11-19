import React from 'react';
import { useApp } from '../../context/AppContext';

export const TicketLoadStatus: React.FC = () => {
  const { ticketsLoading, ticketsError, reloadTickets, tr } = useApp();
  if (ticketsLoading) return <p role="status" className="mb-5 text-sm text-[#6B7C9B]">{tr('正在读取预约凭证…', 'Loading booking passes…')}</p>;
  if (!ticketsError) return null;
  return <div role="status" className="mb-5 rounded-xl border border-[#E3ECFA] bg-[#F7FAFF] p-4 text-sm text-[#48597A]">
    <p>{tr('预约凭证暂时无法加载，请重试后继续预约或取消。', 'Booking passes could not be loaded. Retry before booking or cancelling.')}</p>
    <button type="button" onClick={() => void reloadTickets()} className="mt-3 font-semibold text-[#165DFF]">{tr('重新加载凭证', 'Reload passes')}</button>
  </div>;
};
