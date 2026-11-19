import React from 'react';
import { useApp } from '../../context/AppContext';
import { creatorCriteria, creatorCriteriaEn, creatorScoringIntroduction, creatorScoringIntroductionEn } from '../../data/creatorTrack';

export const CreatorCriteria: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { tr, lang } = useApp();
  const criteria = lang === 'en' ? creatorCriteriaEn : creatorCriteria;

  return (
    <div className="min-w-0">
      <p className="mb-4 text-[13px] leading-relaxed text-[#48597A]">
        {tr(creatorScoringIntroduction, creatorScoringIntroductionEn)}
      </p>
      {compact ? (
        <dl className="divide-y divide-[#EFF5FF] border-y border-[#E3ECFA]">
          {criteria.map(item => (
            <div key={item.name} className="flex items-baseline justify-between gap-3 py-2.5 text-[13px]">
              <dt className="text-[#48597A]">{item.name}</dt>
              <dd className="shrink-0 font-bold text-[#00A77A]">{item.weight}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <table className="w-full table-fixed border-collapse text-left text-[13px] leading-relaxed text-[#48597A]">
          <caption className="sr-only">{tr('自由创意赛道评审标准', 'Free Creation judging criteria')}</caption>
          <colgroup><col className="w-[25%] sm:w-[20%]" /><col className="w-[16%] sm:w-[12%]" /><col /></colgroup>
          <thead className="border-b border-[#E3ECFA] text-[#1A2B4D]">
            <tr>
              <th scope="col" className="pb-3 pr-2">{tr('评审维度', 'Dimension')}</th>
              <th scope="col" className="pb-3 pr-2">{tr('占比', 'Weight')}</th>
              <th scope="col" className="pb-3">{tr('评审重点', 'What judges look for')}</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((item, index) => (
              <tr key={item.name} className="border-b border-[#EFF5FF] align-top">
                <th scope="row" className="py-3 pr-2 font-medium text-[#1A2B4D] break-words">{item.name}</th>
                <td className="py-3 pr-2 font-bold text-[#00A77A]">{item.weight}</td>
                <td className="py-3 break-words">
                  {index === 0 ? <>{item.desc.slice(0, item.desc.indexOf(lang === 'en' ? 'Proprietary' : '不以'))}<strong className="font-semibold text-[#1A2B4D]">{item.desc.slice(item.desc.indexOf(lang === 'en' ? 'Proprietary' : '不以'))}</strong></> : item.desc}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="font-bold text-[#1A2B4D]">
            <tr><th scope="row" className="pt-3 pr-2">{tr('合计', 'Total')}</th><td className="pt-3" colSpan={2}>100%</td></tr>
          </tfoot>
        </table>
      )}
      {compact && <p className="mt-3 text-[12px] leading-relaxed text-[#6B7C9B]">{tr('不以自研模型或技术复杂度作为主要标准。', 'Proprietary models and technical complexity are not the primary criteria.')}</p>}
    </div>
  );
};
