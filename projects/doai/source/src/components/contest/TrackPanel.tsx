/** 赛道详情中的赛题、赛制、评审与奖项子 tab。 */
import React, { useId, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { contestBriefs } from '../../data/community';
import { contest } from '../../data/plan';
import { CreatorCriteria } from './CreatorCriteria';
import { ContestAwards } from './ContestAwards';
import { BriefCard } from './BriefCard';
import { ContestRules } from './ContestRules';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gavel,
  Package,
  ScrollText,
  Trophy,
} from 'lucide-react';
import type { TrackType } from '../../types';
import { isTrackRegistrationOpen } from '../../lib/contestRegistration';

export interface TrackPanelProps {
  track: TrackType;
  /** 赛道主色：FDE 用站点蓝，自由创意用创意赛道绿。 */
  accent: string;
  eyebrow: string;
  /** eyebrow 的英文侧，用于脚注与副标题，避免英文页混入中文赛道名。 */
  eyebrowEn?: string;
  name: string;
  nameEn: string;
  tagline: string;
  taglineEn: string;
  positioning: string;
  /** 题面说明：FDE 是两条企业命题，自由创意是三条技术方向。 */
  directions: { title: string; titleEn?: string; desc: string; descEn?: string }[];
  briefLede: string;
  briefLedeEn?: string;
  rulesLede: string;
  rulesLedeEn?: string;
  reviewFocus: string;
  reviewFocusEn?: string;
  /** contest.dimensions 里本赛道最看重的一项，用于在评审维度中标注。 */
  emphasis: string;
  materials: string[];
  requirements: string[];
  /** 报名按钮的锚点 id，让两条赛道在框内各自拥有报名入口。 */
  registerRoute: string;
}

type SectionId = 'briefs' | 'rules' | 'review' | 'awards';

const SECTIONS: { id: SectionId; icon: React.FC<{ className?: string; style?: React.CSSProperties }>; zh: string; en: string }[] = [
  { id: 'briefs', icon: FileText, zh: '赛题', en: 'Briefs' },
  { id: 'rules', icon: ScrollText, zh: '赛制', en: 'Rules' },
  { id: 'review', icon: ClipboardList, zh: '评审与提交', en: 'Judging' },
  { id: 'awards', icon: Trophy, zh: '本赛道奖项', en: 'Awards' },
];

export const TrackPanel: React.FC<TrackPanelProps> = ({
  track,
  accent,
  eyebrow,
  eyebrowEn,
  name,
  nameEn,
  tagline,
  taglineEn,
  positioning,
  directions,
  briefLede,
  briefLedeEn,
  rulesLede,
  rulesLedeEn,
  reviewFocus,
  reviewFocusEn,
  emphasis,
  materials,
  requirements,
  registerRoute,
}) => {
  const { tr, lang, setActiveRoute } = useApp();
  const [open, setOpen] = useState<SectionId>('briefs');
  const bodyId = useId();
  const briefs = contestBriefs.filter(b => b.track === track);
  const registrationOpen = isTrackRegistrationOpen(track);
  const deadline = briefs[0]?.deadline.slice(5).replace('-', '/') ?? tr('待公布', 'TBA');
  const eyebrowText = lang === 'en' ? (eyebrowEn ?? eyebrow) : eyebrow;

  return (
    <div className="space-y-8">
      {track === 'industry' && <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E3ECFA] bg-[#F7FAFF] p-5"><div><p className="text-sm font-bold text-[#0B1B3A]">{tr('上服集团 · 真实定制需求与完整工作流', 'SF Group · Real bespoke requirements & workflow')}</p><p className="mt-1 text-xs text-[#6B7C9B]">{tr('6 个客户案例，从需求解构到成衣交付。', '6 customer cases, from requirements to garment delivery.')}</p></div><button onClick={() => setActiveRoute('detail/enterprise/shangfu')} className="doa-btn doa-btn-primary">{tr('查看企业真实案例', 'View real enterprise cases')}</button></div>}
      {/* 题面：FDE 是企业命题，自由创意是技术方向 */}
      <div className={`grid grid-cols-1 ${directions.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-px bg-[#E3ECFA] border border-[#E3ECFA] rounded-2xl overflow-hidden`}>
        {directions.map(d => (
          <div key={d.title} className="bg-white p-5">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} aria-hidden />
              <h4 className="text-[14px] font-bold text-[#0B1B3A] leading-snug">
                {lang === 'en' && d.titleEn ? d.titleEn : d.title}
              </h4>
            </div>
            <p className="mt-2 text-[12px] text-[#6B7C9B] leading-relaxed">
              {lang === 'en' && d.descEn ? d.descEn : d.desc}
            </p>
          </div>
        ))}
      </div>

      {/* 事实行：命题方 / 截止 / 决赛形式，一条一行，像命题文件的封面信息 */}
      <dl className="border-t border-[#E3ECFA]">
        <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 py-2.5 border-b border-[#EFF5FF]">
          <dt className="text-[12px] text-[#6B7C9B]">{tr('提交截止', 'Deadline')}</dt>
          <dd className="text-[13px] font-semibold text-[#0B1B3A] font-mono">{deadline}</dd>
        </div>
        <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 py-2.5 border-b border-[#EFF5FF]">
          <dt className="text-[12px] text-[#6B7C9B]">{tr('决赛形式', 'Finals')}</dt>
          <dd className="text-[13px] font-semibold text-[#0B1B3A]">
            {tr('8 分钟路演 + 5 分钟答辩', '8-min pitch + 5-min Q&A')}
          </dd>
        </div>
      </dl>

      <div>
        <div role="tablist" aria-label={tr('赛道详情', 'Track details')} className="flex gap-1 overflow-x-auto border-b border-[#E3ECFA] mb-6">
          {SECTIONS.map((sec, index) => {
            const Icon = sec.icon;
            const selected = open === sec.id;
            return (
              <button
                key={sec.id}
                id={`${bodyId}-tab-${sec.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${bodyId}-${sec.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setOpen(sec.id)}
                onKeyDown={event => {
                  let next = index;
                  if (event.key === 'ArrowRight') next = (index + 1) % SECTIONS.length;
                  else if (event.key === 'ArrowLeft') next = (index - 1 + SECTIONS.length) % SECTIONS.length;
                  else if (event.key === 'Home') next = 0;
                  else if (event.key === 'End') next = SECTIONS.length - 1;
                  else return;
                  event.preventDefault();
                  setOpen(SECTIONS[next].id);
                  document.getElementById(`${bodyId}-tab-${SECTIONS[next].id}`)?.focus();
                }}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#165DFF]"
                style={{ color: selected ? accent : '#6B7C9B', borderColor: selected ? accent : 'transparent' }}
              >
                <Icon className="w-4 h-4" aria-hidden />
                {tr(sec.zh, sec.en)}
              </button>
            );
          })}
        </div>
        {SECTIONS.map(sec => {
          const on = open === sec.id;
          return (
            <section key={sec.id} id={`${bodyId}-${sec.id}`} role="tabpanel" aria-labelledby={`${bodyId}-tab-${sec.id}`} hidden={!on} tabIndex={0}>
              {on && (
                <div>
                  {sec.id === 'briefs' && (
                    <div className="pt-4">
                      <p className="text-[13px] text-[#6B7C9B] leading-relaxed mb-4 max-w-2xl">
                        {tr(briefLede, briefLedeEn)}
                      </p>
                      <div className="rounded-2xl border border-[#E3ECFA] overflow-hidden divide-y divide-[#EFF5FF] -mx-1">
                        {briefs.map(b => (
                          <BriefCard
                            key={b.id}
                            brief={b}
                            accent={accent}
                            variant="docket"
                            defaultOpen={briefs.length === 1}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {sec.id === 'rules' && (
                    <div className="pt-4">
                      <ContestRules
                        accent={accent}
                        track={track}
                        deadline={deadline}
                        onReview={() => setOpen('review')}
                        onAwards={() => setOpen('awards')}
                      />
                    </div>
                  )}

                  {sec.id === 'review' && (
                    <div className="pt-4 grid gap-8 md:grid-cols-3">
                      <div>
                        <h5 className="flex items-center gap-2 text-[13px] font-bold text-[#1A2B4D] mb-3">
                          <Gavel className="w-4 h-4" style={{ color: accent }} />
                          {tr('评审维度', 'Judging dimensions')}
                        </h5>
                        {track === 'creator' ? <CreatorCriteria compact /> : <>
                        <ul className="border-t border-[#E3ECFA]">
                          {contest.dimensions.map(d => {
                            const on = d === emphasis;
                            return (
                              <li
                                key={d}
                                className="flex items-center justify-between gap-3 py-[10px] border-b border-[#EFF5FF]"
                              >
                                <span className={`text-[13px] ${on ? 'font-bold text-[#0B1B3A]' : 'text-[#48597A]'}`}>
                                  {d}
                                </span>
                                {on && (
                                  <span className="text-[11px] font-semibold shrink-0" style={{ color: accent }}>
                                    {tr('本赛道侧重', 'Focus')}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                        <p className="text-[12px] text-[#6B7C9B] leading-relaxed mt-3">
                          {tr(
                            `权重由评审委员会公布；本赛道重点看「${reviewFocus}」。`,
                            `Weights are announced by the jury. This track focuses on ${reviewFocusEn?.toLowerCase() ?? reviewFocus}.`,
                          )}
                        </p>
                        </>}
                      </div>

                      <div>
                        <h5 className="flex items-center gap-2 text-[13px] font-bold text-[#1A2B4D] mb-3">
                          <Package className="w-4 h-4" style={{ color: accent }} />
                          {tr('提交材料', 'What to submit')}
                        </h5>
                        <ul className="space-y-2.5">
                          {materials.map(m => (
                            <li key={m} className="flex items-start gap-2.5 text-[13px] text-[#48597A] leading-relaxed">
                              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accent }} aria-hidden />
                              <span>{m}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="text-[13px] font-bold text-[#1A2B4D] mb-3">
                          {tr('申报要求', 'Requirements')}
                        </h5>
                        <ul className="space-y-2.5">
                          {requirements.map(r => (
                            <li key={r} className="flex items-start gap-2.5 text-[13px] text-[#48597A] leading-relaxed">
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0 mt-[7px]"
                                style={{ background: '#A9CCFF' }}
                                aria-hidden
                              />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {sec.id === 'awards' && (
                    <div className="pt-4">
                      <ContestAwards />
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* 框内报名：点完赛题与赛制，下一步就在同一个方框里 */}
      <div
        className="rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ background: `${accent}0A`, border: `1px solid ${accent}26` }}
      >
        <div className="min-w-0">
          <div className="text-[12px] font-semibold" style={{ color: accent }}>
            {tr(name, nameEn)}
          </div>
          <div className="mt-1 text-[15px] font-bold text-[#0B1B3A]">
            {registrationOpen ? tr('报名本赛道 · 全程免费', 'Enter this track · free') : tr('暂未开放报名', 'Registration not open yet')}
          </div>
          <p className="mt-1.5 text-[12px] text-[#48597A] leading-relaxed max-w-md">
            {registrationOpen ? tr(
              '填写团队与项目资料生成报名凭证，提交截止前可覆盖更新。',
              'Submit your team and project to get an entry pass; update it until the deadline.',
            ) : tr('本赛道报名暂未开放，请查看赛事中心。', 'Registration for this track is not open yet. Please visit the contest center.')}
          </p>
        </div>
        <button
          type="button"
          disabled={!registrationOpen}
          onClick={() => setActiveRoute(registerRoute)}
          className="doa-btn doa-btn-track shrink-0 disabled:cursor-not-allowed"
          style={{ background: registrationOpen ? accent : '#9CA3AF', boxShadow: registrationOpen ? `0 8px 20px ${accent}33` : 'none' }}
        >
          {registrationOpen ? tr('立即报名', 'Register now') : tr('暂未开放报名', 'Registration not open yet')}
          {registrationOpen && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>

      <p className="text-[11px] text-[#98A6BE] leading-relaxed">
        {tr(
          `${eyebrowText} · 报名与评审全程免费，作品知识产权归参赛团队所有；以上条款以组委会最终公告为准。`,
          `${eyebrowText} · free to enter, IP stays with your team. Terms follow the organisers’ final announcement.`,
        )}
      </p>
    </div>
  );
};
