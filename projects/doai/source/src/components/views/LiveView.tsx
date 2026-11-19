import React from 'react';
import { Radio } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const LiveView: React.FC = () => {
  const { tr } = useApp();

  return (
    <div className="pt-24 pb-24 max-w-[1200px] mx-auto px-6 sm:px-8">
      <div className="py-6 border-b border-[#E8EAED]">
        <div className="text-xs font-semibold text-[#165DFF] tracking-wider uppercase mb-1">DOAI LIVE</div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1B3A]">{tr('直播中心', 'Live Broadcasts')}</h1>
      </div>
      <div className="mt-6 rounded-3xl bg-[#0A0D14] aspect-video flex flex-col items-center justify-center text-center px-6">
        <Radio className="w-10 h-10 text-neutral-500 mb-4" />
        <h2 className="text-lg font-semibold text-white">{tr('直播尚未开始', 'Broadcasts have not started yet')}</h2>
        <p className="text-sm text-neutral-400 mt-2">{tr('直播安排与观看入口将在公布后更新。', 'The schedule and viewing links will appear here once announced.')}</p>
      </div>
    </div>
  );
};
