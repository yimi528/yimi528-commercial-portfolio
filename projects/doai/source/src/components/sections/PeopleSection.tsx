/**
 * 嘉宾与专家团 · 组织架构 · 合作方
 *
 * Per the official 《对外招商方案》: 12 domestic + 5 international invited
 * guests (拟邀, never "confirmed"), the org structure (指导/主办/联合主办 +
 * 执行架构), strategic partners, media partners and ecosystem partners.
 */
import React from 'react';
import { PartnerLogo } from '../common/PartnerLogo';
import { ecosystemPartners } from '../../data/ecosystemPartners';
import finewillLogo from '../../assets/images/partners/ecosystem/finewill.webp';
import damoLogo from '../../assets/images/partners/damo-official.png';
import raccoonLogo from '../../assets/images/partners/xiaohuanxiong-official.svg';
import timesYouthLogo from '../../assets/images/partners/times-youth.png';
import dobeLogo from '../../assets/images/partners/dobe-official.svg';
import atomhubLogo from '../../assets/images/partners/atomhub-official.svg';
import shanghaiGarmentLogo from '../../assets/images/partners/shanghai-garment-official.svg';
import meetsocialLogo from '../../assets/images/partners/meetsocial-official.svg';
import zhihuLogo from '../../assets/images/partners/zhihu-tech.png';
import stepfunLogo from '../../assets/images/partners/stepfun-zh.svg';
import stepfunLogoEn from '../../assets/images/partners/stepfun-en.svg';
import sophnetLogo from '../../assets/images/partners/ecosystem/sophnet.webp';
import tuyaLogo from '../../assets/images/partners/tuya-developer.svg';
import {
  invitedGuestsZh, invitedGuestsIntl, partners, partnerCategories, partnerCategoryEn, execGroups,
  Person,
} from '../../data/community';
import { useApp } from '../../context/AppContext';
import { Users, Handshake, Sparkles, ShieldCheck } from 'lucide-react';

const partnerLogos: Record<string, string> = {
  'pt-finewill': finewillLogo,
  'pt-damo': damoLogo,
  'pt-raccoon': raccoonLogo,
  'pt-2': timesYouthLogo,
  'pt-db': dobeLogo,
  'pt-1': atomhubLogo,
  'pt-sf': shanghaiGarmentLogo,
  'pt-fs': meetsocialLogo,
  'pt-ty': tuyaLogo,
  'pt-zhihu': zhihuLogo,
  'pt-stepfun': stepfunLogo,
  'pt-sophnet': sophnetLogo,
};

// Temporarily unpublished; retain the guest content for a future relaunch.
const SHOW_GUESTS_AND_EXPERTS = false;

const PersonCard: React.FC<{ p: Person; en?: boolean }> = ({ p, en = false }) => {
  const name = en && p.nameEn ? p.nameEn : p.name;
  const org = en && p.orgEn ? p.orgEn : p.org;
  const title = en && p.titleEn ? p.titleEn : p.title;
  return (
    <div className="doa-card doa-card-hover overflow-hidden flex flex-col min-w-0">
      <div className="relative w-full aspect-[4/4.25] bg-gradient-to-br from-[#F2F7FF] via-[#E4EFFF] to-[#CFE2FF] overflow-hidden flex items-center justify-center">
        <div className="absolute -right-8 -top-10 w-36 h-36 rounded-full border border-white/70" aria-hidden="true" />
        <div className="absolute -left-12 bottom-0 w-40 h-40 rounded-full bg-white/20" aria-hidden="true" />
        {p.avatar ? (
          <img src={p.avatar} alt={name} className="relative w-full h-full object-cover object-top" draggable={false} />
        ) : (
          <span className="relative text-5xl sm:text-6xl font-black text-[#165DFF]/75">
            {name.slice(0, 1)}
          </span>
        )}
      </div>
      <div className="px-3 py-4 text-center flex-1 flex flex-col justify-center min-h-[88px]">
        <div className="font-bold text-[#0B1B3A] text-sm sm:text-base leading-snug break-words">{name}</div>
        <div className="text-[12px] text-[#165DFF] font-semibold mt-1 leading-snug break-words">
          {org ? `${org} ${title}` : title}
        </div>
      </div>
    </div>
  );
};

export const PeopleSection: React.FC = () => {
  const { tr, lang } = useApp();
  const en = lang === 'en';

  return (
    <section className="py-20 lg:py-24 max-w-[1200px] mx-auto px-6 md:px-10">
      {/* ---------------- 嘉宾与专家团 ---------------- */}
      {SHOW_GUESTS_AND_EXPERTS && <div className="mb-16">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <div className="doa-eyebrow mb-3">GUESTS &amp; EXPERTS</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B1B3A] tracking-tight">
              {tr('嘉宾与专家团', 'Guests & Experts')}
            </h2>
            <p className="text-[13px] text-[#6B7C9B] mt-2 max-w-xl leading-relaxed">
              {tr(
                '产业领袖 · 投资大咖 · 学术权威。以下为拟邀名单，最终出席以官方公布为准。',
                'Industry leaders, investors and academics — invited list; final attendance subject to official announcement.',
              )}
            </p>
          </div>
        </div>

        {/* 国内（11 位） */}
        <div className="mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-[#E4EFFF] text-[#165DFF] text-[11px] font-bold flex items-center justify-center shrink-0">
            CN
          </span>
          <h3 className="text-[13px] font-bold text-[#1A2B4D]">{tr('国内嘉宾与专家团', 'Domestic Guests & Experts')}</h3>
          <span className="text-[11px] text-[#98A6BE]">{tr('11 位', '11')}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-10">
          {invitedGuestsZh.map(g => (
            <PersonCard key={g.id} p={g} en={en} />
          ))}
        </div>

        {/* 国际（5 位） */}
        <div className="mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-[#E4EFFF] text-[#165DFF] text-[11px] font-bold flex items-center justify-center shrink-0">
            INT
          </span>
          <h3 className="text-[13px] font-bold text-[#1A2B4D]">{tr('国际嘉宾与专家团', 'International Guests & Experts')}</h3>
          <span className="text-[11px] text-[#98A6BE]">{tr('5 位', '5')}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {invitedGuestsIntl.map(g => (
            <PersonCard key={g.id} p={g} en={en} />
          ))}
        </div>
      </div>}

      {/* ---------------- 组织架构 ---------------- */}
      <div>
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <div className="doa-eyebrow mb-3">PARTNERS</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B1B3A] tracking-tight">
              {tr('组织架构', 'Organizers')}
            </h2>
            <p className="text-[13px] text-[#6B7C9B] mt-2 max-w-xl leading-relaxed">
              {tr('指导单位、主办单位、联合主办单位与执行架构，以《对外招商方案》为准。', 'Per the official plan: guiding, hosting and co-hosting units with the executive structure.')}
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {partnerCategories.map(cat => {
            const list = partners.filter(p => p.category === cat);
            if (!list.length) return null;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  {cat === '指导单位' ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-[#165DFF]" />
                  ) : cat === '主办单位' ? (
                    <Sparkles className="w-3.5 h-3.5 text-[#165DFF]" />
                  ) : (
                    <Handshake className="w-3.5 h-3.5 text-[#165DFF]" />
                  )}
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B7C9B]">
                    {en ? partnerCategoryEn[cat] : cat}
                  </span>
                  <span className="text-[11px] text-[#C0CBDD]">{list.length}</span>
                </div>
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${cat === '指导单位' ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
                  {list.map(p => (
                    <div key={p.id} className={`doa-card flex flex-col items-start gap-4 min-h-[132px] ${p.id === 'pt-2' ? 'sm:col-span-2' : ''} ${cat === '指导单位' ? 'justify-center p-6 sm:p-8' : 'p-4 sm:p-5'}`}>
                      {cat !== '指导单位' && (
                        <div className="flex h-24 w-full items-center">
                          {partnerLogos[p.id] ? (
                            <PartnerLogo
                              src={p.id === 'pt-stepfun' && en ? stepfunLogoEn : partnerLogos[p.id]}
                              alt={`${en ? p.nameEn : p.name} logo`}
                              align="left"
                              className={`h-24 w-full ${p.id === 'pt-2' ? 'max-w-[560px]' : 'max-w-[240px]'}`}
                            />
                          ) : (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#E4EFFF] text-[#165DFF] flex items-center justify-center shrink-0 text-center">
                              <span className="text-base sm:text-lg font-black leading-tight px-1">{(en ? p.nameEn : p.name).slice(0, 2)}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className={`font-bold text-[#1A2B4D] leading-snug ${cat === '指导单位' ? 'text-xl sm:text-2xl' : 'text-sm'}`}>{en ? p.nameEn : p.name}</div>
                        <p className={`text-[#6B7C9B] leading-relaxed ${cat === '指导单位' ? 'text-sm sm:text-base mt-3' : 'text-[12px] mt-1'}`}>{en ? p.descEn : p.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* 执行架构 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-3.5 h-3.5 text-[#165DFF]" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B7C9B]">
                {tr('执行架构', 'Executive Structure')}
              </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {execGroups.map(g => (
                <div key={g.name} className="doa-card p-5">
                  <div className="font-bold text-[#1A2B4D] text-sm">{en ? g.nameEn : g.name}</div>
                  <p className="text-[12px] text-[#6B7C9B] mt-1">{en ? g.dutyEn : g.duty}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- 媒体合作（6 家） ---------------- */}
      <div className="mt-16">
        <div className="doa-eyebrow mb-3">MEDIA PARTNERS</div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B1B3A] tracking-tight">
          {tr('媒体合作', 'Media Partners')}
        </h2>
        <div className="flex flex-wrap gap-2.5 mt-6">
          {[
            ['原宇宙 Atom Verse', 'Atom Verse'], ['这很容易', 'This Is Easy'], ['特工宇宙', 'Agent Universe'],
            ['赛博禅心', 'Cyber Zen'], ['硅星人', 'Silicon Star'], ['InfoQ', 'InfoQ'],
          ].map(([zh, en], i) => (
            <span key={i} className="doa-card px-5 py-3 text-sm font-bold text-[#1A2B4D]">
              {tr(zh, en)}
            </span>
          ))}
        </div>
      </div>

      {/* ---------------- 生态合作伙伴（持续补充中） ---------------- */}
      <div className="mt-16">
        <div className="doa-eyebrow mb-3">ECOSYSTEM PARTNERS</div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B1B3A] tracking-tight">
          {tr('生态合作伙伴', 'Ecosystem Partners')}
        </h2>
        <p className="text-[13px] text-[#6B7C9B] mt-2">
          {tr('AI 与创客社区联合推广，覆盖全国开发者与高校社群，持续补充中。', 'AI & maker communities co-promoting nationwide — more to come.')}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ecosystemPartners.filter(partner => partner.logo).map(partner => (
            <figure key={partner.name} className="flex min-w-0 flex-col items-center justify-between gap-4 rounded-2xl border border-[#E3ECFA] bg-white p-4 sm:p-5">
              <PartnerLogo src={partner.logo!} alt={`${en ? partner.nameEn : partner.name} logo`} className="h-24 w-full sm:h-28" />
              <figcaption className="w-full break-words text-center text-xs font-semibold leading-relaxed text-[#48597A]">{en ? partner.nameEn : partner.name}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};
