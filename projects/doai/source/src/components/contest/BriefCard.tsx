/**
 * 命题卡 — 赛道页「赛题」区的单条记录。
 *
 * 形态：按「命题登记簿」的一行排布（编号 / 状态 / 标题 / 摘要 / 命题方 / 截止），
 * 由赛道页用一个带分隔线的面板串起来，避免每条都做成独立卡片。
 * 细则（背景、分节要求、交付物、配套资源、评审维度）按需展开。
 *
 * 命题方尚未公布细则时（交付物等仍为「待公布」），不渲染展开箭头，
 * 而是直说「细则待公布」，不给一个点开只有空话的按钮。
 */
import React, { useState } from 'react';
import { CreatorCriteria } from './CreatorCriteria';
import { useApp } from '../../context/AppContext';
import type { ContestBrief } from '../../data/community';
import {
  ChevronDown,
  Building2,
  Calendar,
  FileText,
  Target,
  Package,
  Gift,
  CheckCircle2,
} from 'lucide-react';

const STATUS = {
  open: { zh: '申报中', en: 'Open', color: '#00B487' },
  upcoming: { zh: '待发布', en: 'Coming', color: '#FF8A1F' },
  closed: { zh: '已截止', en: 'Closed', color: '#98A6BE' },
} as const;

/** 命题方是否已给出可展开的细则。细则未公布时保持静态行。 */
function hasDetail(b: ContestBrief): boolean {
  if (b.sections?.length) return true;
  const pending = /待.*公布/;
  return (
    b.deliverables.some(d => !pending.test(d)) ||
    b.resources.some(r => !pending.test(r)) ||
    b.criteria.some(c => c.weight !== '待公布')
  );
}

export const BriefCard: React.FC<{
  brief: ContestBrief;
  accent: string;
  /** docket：与相邻命题共用一个面板，行间用分隔线；card：独立卡片。 */
  variant?: 'card' | 'docket';
  defaultOpen?: boolean;
}> = ({ brief, accent, variant = 'card', defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const { tr, lang } = useApp();
  const en = lang === 'en';
  const status = STATUS[brief.status];
  const expandable = hasDetail(brief);
  const hasSponsor = !/^不设/.test(brief.sponsor);
  const bodyId = `brief-body-${brief.id}`;
  const docket = variant === 'docket';

  const statusChip = (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap"
      style={{ color: status.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} aria-hidden />
      {tr(status.zh, status.en)}
    </span>
  );

  const head = (
    <div className="min-w-0 flex-1">
      {/* 窄屏没有左侧编号栏，编号与状态回到标题上方 */}
      <div className="flex items-center gap-3 flex-wrap mb-2 sm:hidden">
        <span className="font-mono text-[11px] font-bold tracking-[0.08em] text-[#98A6BE]">
          {brief.code}
        </span>
        {statusChip}
      </div>

      <h3 className="text-[17px] sm:text-lg font-bold text-[#0B1B3A] leading-snug">{en ? brief.titleEn : brief.title}</h3>
      <p className="text-[13px] text-[#48597A] leading-relaxed mt-1.5 max-w-2xl">{en ? brief.summaryEn : brief.summary}</p>

      <div className="flex items-center gap-x-5 gap-y-1.5 flex-wrap mt-3 text-[12px] text-[#6B7C9B]">
        {hasSponsor && (
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            {tr('命题方', 'Brief by')} · {en ? brief.sponsorEn : brief.sponsor}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {tr('提交截止', 'Deadline')} {brief.deadline.slice(5).replace('-', '/')}
        </span>
        {!expandable && (
          <span className="text-[#6B7C9B]">
            {tr('命题细则待命题方公布', 'Full brief to be released by the host')}
          </span>
        )}
      </div>
    </div>
  );

  const chevron = expandable ? (
    <ChevronDown
      className={`w-5 h-5 shrink-0 mt-1 transition-transform ${open ? 'rotate-180' : 'text-[#98A6BE]'}`}
      style={open ? { color: accent } : undefined}
      aria-hidden
    />
  ) : null;

  const rowBody = docket ? (
    <div className="grid grid-cols-1 sm:grid-cols-[76px_minmax(0,1fr)_20px] items-start gap-x-5">
      <div className="hidden sm:flex flex-col items-start gap-2 pt-5">
        <span className="font-mono text-[11px] font-bold tracking-[0.08em] text-[#98A6BE]">
          {brief.code}
        </span>
        {statusChip}
      </div>
      <div className="flex items-start gap-4 py-5">
        {head}
        {chevron}
      </div>
    </div>
  ) : (
    <div className="flex items-start gap-4">{head}{chevron}</div>
  );

  const rowClass = docket
    ? 'w-full text-left px-6 sm:pl-6 sm:pr-7 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#165DFF]'
    : 'w-full text-left px-6 sm:px-7 py-5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#165DFF]';

  return (
    <div className={docket ? 'bg-white' : 'doa-card overflow-hidden'}>
      {expandable ? (
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-controls={bodyId}
          className={`${rowClass} hover:bg-[#F7FAFF] cursor-pointer`}
        >
          {rowBody}
        </button>
      ) : (
        <div className={rowClass}>{rowBody}</div>
      )}

      {brief.track === 'industry' && brief.status === 'open' && (
        <div className="px-6 pb-4 pt-2 sm:px-7">
          <button type="button" disabled className="text-xs font-semibold text-[#888888] cursor-not-allowed">
            {tr('暂未开放报名', 'Registration not open yet')} · {brief.code}
          </button>
        </div>
      )}

      {open && expandable && (
        <div id={bodyId} className="px-6 sm:pl-[120px] sm:pr-7 pb-7 pt-5 border-t border-[#EFF5FF] space-y-6">
          {brief.meta && brief.meta.length > 0 && (
            <section className="rounded-xl bg-[#F7FAFF] border border-[#EFF5FF] px-4 py-3.5 flex flex-col sm:flex-row sm:flex-wrap gap-x-8 gap-y-2">
              {(en && brief.metaEn ? brief.metaEn : brief.meta).map(m => (
                <div key={m.label} className="text-[12px] leading-relaxed">
                  <span className="text-[#98A6BE]">{m.label}</span>
                  <span className="text-[#1A2B4D] font-semibold ml-2.5">{m.value}</span>
                </div>
              ))}
            </section>
          )}

          <section>
            <h4 className="flex items-center gap-2 text-[13px] font-bold text-[#1A2B4D] mb-2.5">
              <FileText className="w-4 h-4" style={{ color: accent }} /> {tr('赛题背景', 'Background')}
            </h4>
            <p className="text-[13px] text-[#48597A] leading-[1.85]">{en ? brief.backgroundEn : brief.background}</p>
          </section>

          {brief.sections?.map(sec => {
            // 有标题的条目（能力要求）用左侧导轨把「能力 → 输出物」配成一组；
            // 无标题的条目（技术要求 / 功能要求）用普通圆点，避免给平铺列表加装饰。
            const titled = sec.items.some(it => it.title);
            return (
              <section key={sec.heading}>
                <h4 className="flex items-center gap-2 text-[13px] font-bold text-[#1A2B4D] mb-2.5">
                  <Target className="w-4 h-4" style={{ color: accent }} /> {en && sec.headingEn ? sec.headingEn : sec.heading}
                </h4>
                {(en && sec.bodyEn ? sec.bodyEn : sec.body) && (
                  <p className="text-[13px] text-[#48597A] leading-[1.85] mb-3">{en && sec.bodyEn ? sec.bodyEn : sec.body}</p>
                )}
                {titled ? (
                  <ul className="space-y-4 border-l border-[#DDE7F7] pl-5">
                    {sec.items.map((it, i) => (
                      <li key={i} className="relative">
                        <span
                          className="absolute -left-[23px] top-[7px] w-1.5 h-1.5 rounded-full"
                          style={{ background: accent }}
                          aria-hidden
                        />
                        <div className="text-[13px] font-semibold text-[#1A2B4D]">{en && it.titleEn ? it.titleEn : it.title}</div>
                        <p className="text-[13px] text-[#48597A] leading-[1.8] mt-0.5">{en && it.descEn ? it.descEn : it.desc}</p>
                        {it.output && (
                          <p className="mt-2 text-[12px] leading-[1.7] bg-[#00B487]/10 border-l-2 border-[#00B487] rounded-r-lg px-3 py-2">
                            <span className="font-bold text-[#0A8F6C]">{tr('输出物', 'Output')}</span>
                            <span className="text-[#48597A]">{tr('：', ': ')}{en && it.outputEn ? it.outputEn : it.output}</span>
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-2">
                    {sec.items.map((it, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#48597A] leading-[1.8]">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0 mt-[9px]"
                          style={{ background: '#98A6BE' }}
                          aria-hidden
                        />
                        <span>{en && it.descEn ? it.descEn : it.desc}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="flex items-center gap-2 text-[13px] font-bold text-[#1A2B4D] mb-2.5">
                <Package className="w-4 h-4" style={{ color: accent }} /> {tr('交付物', 'Deliverables')}
              </h4>
              <ul className="space-y-2">
                {(en ? brief.deliverablesEn : brief.deliverables).map((d, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#48597A]">
                    <CheckCircle2 className="w-4 h-4 text-[#00B487] shrink-0 mt-0.5" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="flex items-center gap-2 text-[13px] font-bold text-[#1A2B4D] mb-2.5">
                <Gift className="w-4 h-4" style={{ color: accent }} /> {tr('配套资源', 'Resources')}
              </h4>
              <ul className="space-y-2">
                {(en ? brief.resourcesEn : brief.resources).map((d, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#48597A]">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                      style={{ background: accent }}
                      aria-hidden
                    />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section>
            <h4 className="text-[13px] font-bold text-[#1A2B4D] mb-3">
              {tr('评审维度', 'Judging Dimensions')}
            </h4>
            {brief.track === 'creator' ? <CreatorCriteria /> : <div className="space-y-2.5">
              {(en ? brief.criteriaEn : brief.criteria).map((c, i) => {
                // 权重可能是「30%」，也可能尚未公布；后者画斜纹占位，不假装是 0%。
                const pct = /^\d+(\.\d+)?%$/.test(c.weight) ? c.weight : null;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-[13px] mb-1 gap-4">
                      <span className="font-semibold text-[#1A2B4D]">{c.name}</span>
                      <span className="font-bold shrink-0" style={{ color: pct ? accent : '#98A6BE' }}>
                        {c.weight}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#EFF5FF] overflow-hidden mb-1">
                      {pct ? (
                        <div className="h-full rounded-full" style={{ width: pct, background: accent }} />
                      ) : (
                        <div
                          className="h-full w-full"
                          style={{
                            backgroundImage:
                              'repeating-linear-gradient(45deg, #E3ECFA 0 4px, #F7FAFF 4px 8px)',
                          }}
                        />
                      )}
                    </div>
                    <p className="text-[12px] text-[#6B7C9B]">{c.desc}</p>
                  </div>
                );
              })}
            </div>}
          </section>

          <div className="flex items-center justify-between gap-4 flex-wrap pt-1">
            <span className="text-[12px] text-[#98A6BE]">
              {tr('赛制条款见本页「赛制」', 'See “Rules” on this page for contest terms')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
