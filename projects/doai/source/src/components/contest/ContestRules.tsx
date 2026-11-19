/** 赛制速览与默认收起的完整条款。 */
import React from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { contestRules } from '../../data/community';
import type { TrackType } from '../../types';

export const ContestRules: React.FC<{
  accent: string;
  track: TrackType;
  deadline: string;
  onReview: () => void;
  onAwards: () => void;
}> = ({ accent, track, deadline, onReview, onAwards }) => {
  const { tr } = useApp();
  const facts = [
    { label: tr('参赛资格', 'Eligibility'), value: tr('全球开放，可个人或团队报名', 'Open worldwide to individuals and teams') },
    { label: tr('团队人数', 'Team size'), value: tr('建议 2—5 人，无硬性上限', '2–5 recommended; no fixed upper limit') },
    { label: tr('提交截止', 'Deadline'), value: deadline },
    { label: tr('晋级方式', 'Selection'), value: tr('作品初筛后入围决赛路演', 'Submission screening → final pitch') },
    { label: tr('决赛形式', 'Finals'), value: tr('8 分钟路演 + 5 分钟答辩', '8-min pitch + 5-min Q&A') },
  ];
  const steps = [tr('报名', 'Enter'), tr('提交', 'Submit'), tr('初筛', 'Screening'), tr('决赛路演', 'Final pitch'), tr('评奖', 'Awards')];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[#0B1B3A]">{tr('赛制速览', 'Rules at a glance')}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-[#6B7C9B]">
          {track === 'industry'
            ? tr('选择企业命题，围绕真实业务需求提交方案；建议组队参赛。', 'Choose a corporate brief and solve a real business need; team entry is recommended.')
            : tr('在三条技术方向内自由选题，独立评审、独立评奖。', 'Choose your own project in one of three directions, judged and awarded independently.')}
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 rounded-xl border border-[#E3ECFA] px-4 py-1 sm:grid-cols-2">
        {facts.map(fact => (
          <div key={fact.label} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-[#EFF5FF] py-2.5 last:border-b-0">
            <dt className="w-16 shrink-0 text-[12px] text-[#6B7C9B]">{fact.label}</dt>
            <dd className="text-[13px] font-semibold text-[#1A2B4D]">{fact.value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <h3 className="sr-only">{tr('比赛流程', 'Contest process')}</h3>
        <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {steps.map((step, i) => (
            <li key={step} className="flex items-center gap-3 text-[13px] font-semibold text-[#1A2B4D]">
              {i > 0 && <ArrowRight className="h-3.5 w-3.5 text-[#98A6BE]" aria-hidden />}
              <span className="font-mono text-[11px]" style={{ color: accent }}>{String(i + 1).padStart(2, '0')}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="mb-1 text-[13px] font-bold text-[#0B1B3A]">{tr('详细规则', 'Detailed rules')}</h3>
        <div className="divide-y divide-[#E3ECFA] border-y border-[#E3ECFA]">
          {contestRules.map(rule => (
            <details key={rule.id} className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 py-3 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#165DFF] [&::-webkit-details-marker]:hidden">
                <span className="shrink-0 font-semibold text-[#1A2B4D]">{rule.title}</span>
                <span className="hidden text-[12px] text-[#6B7C9B] sm:block">{rule.summary}</span>
                <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-[#6B7C9B] group-open:rotate-180" aria-hidden />
              </summary>
              <dl className="space-y-3 pb-4">
                {rule.items.map(item => (
                  <div key={item.q}>
                    <dt className="text-[13px] font-semibold text-[#1A2B4D]">{item.q}</dt>
                    <dd className="mt-1 text-[13px] leading-relaxed text-[#48597A]">{item.a}</dd>
                  </div>
                ))}
              </dl>
            </details>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12px]">
        <button type="button" onClick={onReview} className="inline-flex items-center gap-1.5 font-semibold hover:underline" style={{ color: accent }}>
          {tr('查看评审与提交材料', 'Judging & submission materials')} <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onAwards} className="inline-flex items-center gap-1.5 font-semibold hover:underline" style={{ color: accent }}>
          {tr('查看本赛道奖项', 'Track awards')} <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-[11px] text-[#98A6BE]">
        {tr('以上条款以组委会最终公告为准。', 'These terms are subject to the organisers’ final announcement.')}
      </p>
    </div>
  );
};
