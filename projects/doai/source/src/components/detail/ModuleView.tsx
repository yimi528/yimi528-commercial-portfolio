import React from 'react';
import { useApp } from '../../context/AppContext';
import { DetailShell, NotFound } from './DetailShell';
import { modulePages } from '../../data/conference';
import { VenueGuide } from './VenueGuide';
import { ArrowRight, Check, Sparkles, ShieldCheck, Users } from 'lucide-react';

/**
 * A dedicated page for one navbar sub-module (e.g. 大会介绍 → 大会愿景与使命).
 * Every sub-item in the nav resolves to one of these, so each click lands on a
 * page of its own rather than scrolling within a shared one.
 */
/** module/<id>/<anchor> 的楼层深链：可逛→1F、可玩→4F—5F、全球化→PARK */
const VENUE_FLOOR_ANCHORS: Record<string, string> = {
  '1f': 'ledong-1f',
  '4f': 'ledong-4f',
  park: 'debei',
};

export const ModuleView: React.FC<{ id?: string; sub?: string }> = ({ id, sub }) => {
  const { setActiveRoute, tr, lang } = useApp();
  const en = lang === 'en';
  const mod = modulePages.find(m => m.id === id);

  if (!mod) {
    return <NotFound what="该模块" whatEn="This module" backRoute="home" backLabel="返回首页" backLabelEn="Back to home" />;
  }

  const backRoute = mod.parent;
  const backLabel =
    backRoute === 'conference' ? '返回大会介绍' : backRoute === 'maker' ? '返回赛事中心' : '返回创客社区';
  const backLabelEn =
    backRoute === 'conference' ? 'Back to the conference' : backRoute === 'maker' ? 'Back to the competition' : 'Back to the community';

  const modTitle = en ? mod.titleEn : mod.title;
  const modSubtitle = en ? mod.subtitleEn : mod.subtitle;
  const ctaLabel = mod.cta ? (en ? mod.cta.labelEn : mod.cta.label) : '';

  // Sibling modules in the same nav group, for cross-linking.
  const siblings = modulePages.filter(m => m.parent === mod.parent && m.id !== mod.id);

  return (
    <DetailShell
      backRoute={backRoute}
      backLabel={backLabel}
      backLabelEn={backLabelEn}
      eyebrow={mod.eyebrow}
      title={modTitle}
      subtitle={modSubtitle}
      actions={
        mod.cta ? (
          <button type="button" onClick={() => setActiveRoute(mod.cta!.route)} className="doa-btn doa-btn-primary">
            {ctaLabel}
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : undefined
      }
    >
      {/* Hero image — the module's key visual */}
      <figure className="doa-card overflow-hidden mb-10">
        <div className="relative aspect-[21/9] overflow-hidden bg-[#EFF5FF]">
          <img
            src={mod.heroImage}
            alt={modTitle}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(11,27,58,0) 40%, rgba(11,27,58,0.55) 100%)',
            }}
          />
          <figcaption className="absolute left-5 bottom-4 right-5 text-white">
            <div className="text-[11px] uppercase tracking-[0.22em] opacity-80 font-semibold">
              DOAI 2026 · {mod.eyebrow}
            </div>
            <div className="text-lg sm:text-xl font-extrabold mt-1">{modTitle}</div>
          </figcaption>
        </div>
      </figure>

      {/* Stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
        {mod.stats.map((s, i) => (
          <div key={i} className="doa-card p-5">
            <div className="text-[11px] uppercase tracking-wider text-[#98A6BE] font-semibold mb-1.5">
              {en ? s.labelEn : s.label}
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-[#0B1B3A] tabular-nums">
              {en ? s.valueEn : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Content sections */}
      <div className="space-y-6">
        {mod.sections.map((sec, si) => (
          <section key={si} className="doa-card p-6 sm:p-8">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-7 h-7 rounded-lg bg-[#E4EFFF] text-[#165DFF] flex items-center justify-center text-[12px] font-bold shrink-0">
                {si + 1}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-[#0B1B3A]">
                {en ? sec.headingEn : sec.heading}
              </h2>
            </div>
            <p className="text-sm text-[#48597A] leading-[1.9] mb-5">{en ? sec.bodyEn : sec.body}</p>

            {sec.items && sec.items.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sec.items.map((item, ii) => (
                  <div
                    key={ii}
                    className="flex items-start gap-3 p-4 rounded-2xl bg-[#F7FAFF] border border-[#E3ECFA]"
                  >
                    <span className="w-6 h-6 rounded-lg bg-white border border-[#E3ECFA] text-[#165DFF] flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-[#1A2B4D] mb-0.5">
                        {en ? item.titleEn : item.title}
                      </div>
                      <div className="text-[12px] text-[#6B7C9B] leading-relaxed">
                        {en ? item.descEn : item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* 双会场空间规划：15 个现场点位的逐层导览由这个模块页承载，
          大会介绍页只留一条入口。 */}
      {mod.id === 'venue' && (
        <div className="mt-14 border-t border-[#E3ECFA] pt-12">
          <VenueGuide initialFloor={sub ? VENUE_FLOOR_ANCHORS[sub] : undefined} />
        </div>
      )}

      {/* Closing CTA */}
      {mod.cta && (
        <section className="doa-panel p-8 sm:p-10 mt-8 text-center">
          <h2 className="text-xl font-extrabold text-[#0B1B3A] mb-2">
            {tr('准备好了吗？', 'Ready to join?')}
          </h2>
          <p className="text-sm text-[#48597A] mb-6">
            {tr(
              '报名、评审与参会全程免费，谨防任何以大会名义收费的诈骗。',
              'Registering, judging and attending are free of charge all the way through. Beware of anyone charging fees in the name of DOAI.',
            )}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={() => setActiveRoute(mod.cta!.route)} className="doa-btn doa-btn-primary">
              {ctaLabel}
              <ArrowRight className="w-4 h-4" />
            </button>
            {mod.secondaryCta && (
              <button
                type="button"
                onClick={() => setActiveRoute(mod.secondaryCta!.route)}
                className="doa-btn doa-btn-secondary"
              >
                {en ? mod.secondaryCta.labelEn : mod.secondaryCta.label}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Sibling modules —— 场地页是深链落地页，兄弟模块推荐与本次访问目的无关，不在该页显示 */}
      {mod.id !== 'venue' && siblings.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold text-[#0B1B3A] mb-5">{tr('相关模块', 'Related modules')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {siblings.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveRoute(`module/${s.id}`)}
                className="doa-card doa-card-hover p-5 text-left flex items-start gap-4 group"
              >
                <img
                  src={s.heroImage}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-20 h-14 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="doa-eyebrow mb-1.5">{s.eyebrow}</div>
                  <h3 className="font-bold text-[#1A2B4D] text-sm mb-1 group-hover:text-[#165DFF] transition-colors">
                    {en ? s.titleEn : s.title}
                  </h3>
                  <p className="text-[12px] text-[#6B7C9B] line-clamp-2 leading-relaxed">
                    {en ? s.subtitleEn : s.subtitle}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#98A6BE] group-hover:text-[#165DFF] group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </button>
            ))}
          </div>
        </section>
      )}
    </DetailShell>
  );
};
