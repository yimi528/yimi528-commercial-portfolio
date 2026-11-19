import React from 'react';
import { useApp } from '../../context/AppContext';
import { contest } from '../../data/plan';

/** Shared award terms for the contest overview and both track detail pages. */
export const ContestAwards: React.FC = () => {
  const { tr } = useApp();
  const [maker, ...independent] = contest.awards;
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#C8DAFF] bg-[#F5F9FF] p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-[#0B1B3A]">{tr(maker.name, maker.nameEn)}</h3>
          <span className="text-3xl font-extrabold tabular-nums text-[#165DFF]">{maker.amount}</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[#48597A]">+ {tr(maker.note, maker.noteEn)}</p>
      </div>
      <div>
        <h3 className="mb-3 text-base font-bold text-[#0B1B3A]">{tr('四个独立奖项', 'Four Independent Awards')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {independent.map(award => (
            <div key={award.name} className="rounded-2xl border border-[#E3ECFA] bg-white p-5">
              <h4 className="font-bold text-[#1A2B4D]">{tr(award.name, award.nameEn)}</h4>
              <div className="mt-2 text-2xl font-extrabold tabular-nums text-[#165DFF]">{award.amount}</div>
              <p className="mt-2 text-xs leading-relaxed text-[#6B7C9B]">+ {tr(award.note, award.noteEn)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
