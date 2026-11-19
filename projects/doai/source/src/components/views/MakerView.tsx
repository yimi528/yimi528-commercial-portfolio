import React, { useEffect } from 'react';
import { creatorDirections } from '../../data/creatorTrack';
import { CreatorCriteria } from '../contest/CreatorCriteria';
import { ContestAwards } from '../contest/ContestAwards';
import { useApp } from '../../context/AppContext';
import { registrationAvailability } from '../../lib/contestRegistration';
import {
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  MapPin,
  CalendarDays
} from 'lucide-react';

// Temporarily hide the detailed programme until the agenda is confirmed.
const SHOW_CONTEST_PROGRAMME = false;

/* scrollTo: 'tracks' → 落地后平滑滚动到赛道设置 */
export const MakerView: React.FC<{ scrollTo?: string | null }> = ({ scrollTo }) => {
  useEffect(() => {
    if (!scrollTo) return;
    const el = document.getElementById(`maker-${scrollTo}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [scrollTo]);
  const { lang, setActiveRoute, tr } = useApp();


  // 两天大会赛程，照抄《对外招商方案》两日日程
  const DAYS = [
    {
      day: 'Day 1',
      date: '12.05',
      venue: tr('乐动虹桥', 'LeDong Hongqiao'),
      theme: tr('开幕 + 社交', 'Opening + Social'),
      items: [
        { time: '09:00—12:30', name: tr('签到报到', 'Check-in'), desc: tr('领取物料 · 自由交流', 'Collect your kit and meet fellow makers') },
        { highlight: true, time: '13:30', name: tr('开幕式 · 领导致辞 · 战略发布', 'Opening Ceremony'), desc: tr('政府与主办方代表致辞，大会战略发布', 'Opening remarks and strategic launch') },
        { time: '14:40', name: tr('圆桌论坛：全球 AI 创客生态', 'Panel: Global AI Maker Ecosystem'), desc: tr('海外专家连线 + 投资人 + 创客代表', 'Overseas experts, investors and makers') },
        { time: '15:40', name: tr('TOP37 高校签约 · 《长宁倡议》发布', 'TOP37 University Signing & Changning Initiative'), desc: tr('与海内外高校现场签约，发布《长宁倡议》', 'University agreements and the Changning Initiative') },
        { time: '16:20', name: tr('自由社交 · 展陈参观 · 合作洽谈', 'Social & Expo'), desc: tr('自由交流、展陈参观与合作洽谈', 'Open networking, expo visiting and deal-making') },
        { time: '18:30', name: tr('After Party · 投资人-创业者速配', 'After Party · Founder-Investor Matching'), desc: tr('创客社交之夜，投资人与创业者深度对接', 'Party night with founder-investor speed matching') },
      ],
    },
    {
      day: 'Day 2',
      date: '12.06',
      venue: tr('乐动虹桥', 'LeDong Hongqiao'),
      theme: tr('展览 + 路演主日', 'Expo + Finals Day'),
      items: [
        { time: '09:30', name: tr('全面开馆', 'Doors Open'), desc: tr('市集 / 展商 / 互动 / 游园护照', 'Market, exhibitors, interactive zones, fairground passport') },
        { highlight: true, time: '09:30—12:00', name: tr('决赛路演上半场', 'Finals · First Half'), desc: tr('8 分钟路演 + 5 分钟答辩；分论坛上午场 · 海外分会场路演同步进行', '8-min pitch + 5-min Q&A; forums and overseas venues run in parallel') },
        { time: '12:00—13:30', name: tr('午餐时段', 'Lunch Break'), desc: tr('长宁味道市集人流高峰', 'Peak hours at the Changning food market') },
        { highlight: true, time: '13:30—17:00', name: tr('决赛路演下半场', 'Finals · Second Half'), desc: tr('圆桌讨论 · 分论坛下午场并行', 'Panels and afternoon forums run in parallel') },
        { highlight: true, time: '17:00—18:00', name: tr('闭幕颁奖', 'Closing & Awards'), desc: tr('赛事颁奖 · 落地签约 · 大会总结 · 大合影', 'Awards, on-site deal signing, wrap-up and group photo') },
      ],
    },
  ];

  return (
    <div className="pt-24 pb-24">
      {/* 1. Header Banner */}
      <section className="max-w-[1200px] mx-auto px-6 sm:px-8 py-12">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#165DFF] tracking-wider uppercase">
            <span>DOAI 2026 AI MAKER CONTEST</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#0B1B3A] tracking-tight leading-tight">
            {lang === 'zh'
              ? 'AI 创客大赛：探索下一代智能应用'
              : 'AI Maker Contest: Forging Next-Gen Intelligent Applications'}
          </h1>
          <p className="text-base text-[#666666] leading-relaxed">
            {lang === 'zh'
              ? '面向全球极客与商业探索者的全开放式 AI 赛事，设自由创意赛道与 FDE 赛道，均已开放报名。1000+ 全球开发者，入围 20—30 个项目线下路演；各赛道最佳创客奖 18,888 元，另设四个独立奖项各 8,888 元；每项均含 DobeHub 全球办公权益与十亿 Tokens，现场签约 POC 订单，全链路免费参赛。'
              : 'An open AI contest with Free Creation and FDE tracks. Both tracks are open for registration. 1000+ developers worldwide, 20–30 finalists on stage, ¥18,888 Best Maker Awards and four independent ¥8,888 awards, each with DobeHub global workspace benefits and 1 billion tokens, plus on-site POC deals. Free to enter.'}
          </p>

          <div className="pt-4 flex items-center gap-4">
            <button
              onClick={() => {
                if (scrollTo === 'tracks') {
                  document.getElementById('maker-tracks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                  setActiveRoute('maker/tracks');
                }
              }}
              className="px-8 py-3.5 text-sm font-semibold text-white bg-[#165DFF] hover:bg-[#1453E6] rounded-full transition-all shadow-md inline-flex items-center gap-2"
            >
              <span>{tr('选择赛道并报名', 'Choose a Track & Register')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveRoute('square')}
              className="px-6 py-3.5 text-sm font-semibold text-[#0B1B3A] hover:text-[#165DFF] bg-white border border-[#E8EAED] rounded-full transition-all"
            >
              {tr('去组队广场找队友', 'Find Teammates')}
            </button>
          </div>
        </div>
      </section>

      {/* 2. Track overview */}
      <section id="maker-tracks" className="scroll-mt-24 max-w-[1200px] mx-auto px-6 sm:px-8 py-12">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-[#0B1B3A]">{tr('两大赛道设置', 'Two Tracks')}</h2>
          <p className="text-xs text-[#666666] mt-1">
            {tr('自由创意赛道设 3 条技术方向，FDE 赛道设 2 条真实企业命题。', 'Free Creation offers three technical directions, FDE offers two real corporate briefs.')}
          </p>
          <p className="text-sm font-semibold text-[#165DFF] mt-3">{tr(registrationAvailability.zh, registrationAvailability.en)}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Industry Track Card */}
          <a
            href={`${import.meta.env.BASE_URL}track/industry`}
            onClick={event => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              setActiveRoute('track/industry');
            }}
            id="maker-industry"
            className="bg-[#F7F8FA] rounded-3xl p-8 lg:p-6 border border-[#E8EAED] flex flex-col min-w-0 scroll-mt-28 hover:border-[#165DFF] transition-colors focus-visible:outline-2 focus-visible:outline-[#165DFF]"
          >
            <div className="space-y-4 pb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#165DFF]/10 text-[#165DFF] flex items-center justify-center">
                <Cpu className="w-6 h-6" />
              </div>
              <span className="inline-flex rounded-full bg-[#165DFF]/10 px-3 py-1 text-xs font-semibold text-[#165DFF]">{tr('报名开放中', 'Registration open')}</span>
              <h3 className="text-2xl font-bold text-[#0B1B3A]">
                {tr('FDE 赛道 · 真实企业命题', 'FDE Track · Real Business Briefs')}
              </h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                {tr('由两家战略合作方发布真实业务命题，参赛团队定向解题；现场签约 POC 订单，获奖项目优先获得企业采购订单与深度合作机会。', 'Two strategic partners publish real business briefs and teams solve them directly. POC contracts are signed on site, and winning projects get priority on corporate purchase orders and deeper partnerships.')}
              </p>

              <div className="pt-2 space-y-2">
                <div className="text-xs font-semibold text-[#0B1B3A]">{tr('命题方向：', 'Directions:')}</div>
                <ul className="text-xs text-[#555555] space-y-1.5 list-disc list-inside">
                  <li>{tr('飞书深诺：广告素材侵权风险快速筛查工具', 'Feishu Shennuo: Ad Creative Copyright Risk Screening')}</li>
                  <li>{tr('上服集团：海派定制服饰 AI 需求解构与可视化 Agent', 'SF Group: Bespoke Fashion Requirements and Visualization Agent')}</li>
                  
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-[#E8EAED] mt-auto">
              <span className="text-xs text-[#888888]">{tr('重点考量：商业可行性与商业落地闭环', 'Focus: business viability & closed loop')}</span>
              <span className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#165DFF]">{tr('查看赛题与赛制', 'View briefs & rules')} <ArrowRight className="w-4 h-4" /></span>
            </div>

          </a>

          {/* Creator Track Card */}
          <a
            href={`${import.meta.env.BASE_URL}track/creator`}
            onClick={event => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              setActiveRoute('track/creator');
            }}
            id="maker-creator"
            className="bg-[#F7F8FA] rounded-3xl p-8 lg:p-6 border border-[#E8EAED] flex flex-col min-w-0 scroll-mt-28 hover:border-[#165DFF] transition-colors focus-visible:outline-2 focus-visible:outline-[#165DFF]"
          >
            <div className="space-y-4 pb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#00C48C]/10 text-[#00C48C] flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <span className="inline-flex rounded-full bg-[#00C48C]/10 px-3 py-1 text-xs font-semibold text-[#008C64]">{tr('报名开放中', 'Registration open')}</span>
              <h3 className="text-2xl font-bold text-[#0B1B3A]">
                {tr('自由创意赛道', 'Free Creation Track')}
              </h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                {tr('面向全球 AI 创业者、开发者、硬件工程师与设计师开放，从真实需求出发，用现有 AI 能力做出可体验、可落地的产品与服务。三条平行赛道独立评审、独立颁奖。', 'Open to AI founders, developers, hardware engineers and designers worldwide. Use existing AI capabilities to build usable, practical products and services for real needs. The three tracks are judged and awarded independently.')}
              </p>

              <div className="pt-2 space-y-2">
                <div className="text-xs font-semibold text-[#0B1B3A]">{tr('赛道方向：', 'Directions:')}</div>
                <ul className="text-xs text-[#555555] space-y-1.5 list-disc list-inside">
                  {creatorDirections.map(direction => (
                    <li key={direction.title}>{tr(`${direction.title}：${direction.tagline}`, `${direction.titleEn}: ${direction.taglineEn}`)}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-[#E8EAED] mt-auto">
              <span className="text-xs text-[#888888]">{tr('重点考量：创意、落地与商业潜力', 'Focus: creativity, practical delivery and commercial potential')}</span>
              <span className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#008C64]">{tr('查看赛道并报名', 'Explore & register')} <ArrowRight className="w-4 h-4" /></span>
            </div>

          </a>


        </div>
      </section>

      {/* Two-day conference programme */}
      {SHOW_CONTEST_PROGRAMME && <section id="maker-timeline" className="scroll-mt-24 bg-[#F2F6FC] border-y border-[#E3ECFA] my-8">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 py-10 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
            <div>
              <h2 className="text-2xl font-bold text-[#0B1B3A]">{tr('赛事流程与关键节点', 'Contest Timeline')}</h2>
              <p className="text-sm text-[#48597A] mt-2">
                {tr('从开幕相聚，到决赛登场。两天精彩，一览即知。', 'From the opening gathering to the final pitch. Your two-day programme at a glance.')}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#165DFF] shrink-0">
              <CalendarDays className="w-4 h-4" aria-hidden="true" />
              <span>{tr('2026 年 12 月 5—6 日', 'December 5–6, 2026')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {DAYS.map((day, dayIndex) => (
              <article key={day.day} aria-labelledby={`programme-day-${dayIndex}`} className="overflow-hidden rounded-2xl border border-[#D5E1F1] bg-white">
                <header className={`px-5 sm:px-6 py-5 text-white ${dayIndex === 0 ? 'bg-[#165DFF]' : 'bg-[#0B1B3A]'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white/75">{day.day}</p>
                      <h3 id={`programme-day-${dayIndex}`} className="text-2xl font-bold mt-1 tracking-tight">{day.theme}</h3>
                    </div>
                    <span className="text-[42px] sm:text-5xl leading-none font-bold tracking-tight tabular-nums">{day.date}</span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/20 flex items-center gap-2 text-sm text-white/90">
                    <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{day.venue}</span>
                  </div>
                </header>

                <ol className="px-4 sm:px-5 py-2">
                  {day.items.map(item => {
                    const highlighted = 'highlight' in item && item.highlight;
                    return (
                      <li key={item.time + item.name} className="relative grid grid-cols-[84px_minmax(0,1fr)] sm:grid-cols-[98px_minmax(0,1fr)] gap-3 sm:gap-4 py-4 border-b border-[#E7EDF5] last:border-b-0">
                        <div className="relative pr-3 border-r border-[#DCE6F4]">
                          <time className={`block text-xs font-semibold tabular-nums leading-5 whitespace-nowrap ${highlighted ? 'text-[#165DFF]' : 'text-[#48597A]'}`}>{item.time}</time>
                          <span aria-hidden="true" className={`absolute -right-[4px] top-1.5 h-[7px] w-[7px] rounded-full ring-[3px] ring-white ${highlighted ? 'bg-[#165DFF]' : 'bg-[#B4C6DF]'}`} />
                        </div>
                        <div className={`min-w-0 ${highlighted ? 'bg-[#EFF5FF] rounded-lg px-3 py-2 -my-1' : 'py-1'}`}>
                          {highlighted && <span className="block text-[10px] font-semibold text-[#165DFF] mb-1">{tr('重点环节', 'Programme highlight')}</span>}
                          <h4 className="text-sm font-bold text-[#0B1B3A] leading-relaxed">{item.name}</h4>
                          <p className="text-xs text-[#5B6B83] leading-relaxed mt-1">{item.desc}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </article>
            ))}
          </div>
          <div className="mt-5 flex items-start gap-2 text-xs text-[#5B6B83] leading-relaxed">
            <Layers className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p>{tr('第二天设有并行活动：决赛路演、分论坛、海外分会场及市集展览，可按兴趣安排参与。', 'Day 2 runs in parallel: finals, forums, overseas venues and the expo market. Plan your visit around your interests.')}</p>
          </div>
        </div>
      </section>}

      {/* 4. Track-specific judging criteria */}
      <section id="maker-scoring" className="scroll-mt-24 max-w-[1200px] mx-auto px-6 sm:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#0B1B3A]">{tr('评审维度', 'Judging Criteria')}</h2>
          <p className="text-xs text-[#666666] mt-1">
            {tr('自由创意三条赛道统一采用 100 分制；FDE 赛道按企业命题标准评审', 'The three Free Creation tracks use a 100-point system; FDE follows each corporate brief’s criteria.')}
          </p>
        </div>

        <div className="doa-card p-7">
          <h3 className="mb-4 text-base font-bold text-[#0B1B3A]">{tr('自由创意赛道', 'Free Creation Track')}</h3>
          <CreatorCriteria />
          <p className="mt-5 border-t border-[#E3ECFA] pt-4 text-[13px] leading-relaxed text-[#6B7C9B]">
            {tr('FDE 赛道按各企业命题的评审标准执行，具体维度与权重见对应赛题。', 'FDE follows each corporate brief’s criteria. See the relevant brief for dimensions and weights.')}
          </p>
        </div>
      </section>

      {/* 5. Award Showcase (Apple Design Award style) */}
      <section id="maker-awards" className="scroll-mt-24 max-w-[1200px] mx-auto px-6 sm:px-8 py-16">
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-[#0B1B3A]">{tr('奖项体系', 'Awards')}</h2>
          <p className="text-xs text-[#666666] mt-2">
            {tr('各赛道最佳创客奖 + 四个独立奖项', 'Best Maker Award in each track + four independent awards')}
          </p>
        </div>
        <ContestAwards />

        <div className="doa-panel p-7 mt-6">
          <h3 className="font-bold text-[#0B1B3A] text-base mb-4">{tr('评审机制', 'Jury')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[#98A6BE] font-semibold mb-2.5">
                {tr('评审团构成（12—15 名）', 'Jury Composition (12–15)')}
              </div>
              <ul className="space-y-2">
                {[
                  { g: '政府产业代表', gEn: 'Government', c: '2—3 名', cEn: '2–3' },
                  { g: '产业企业代表', gEn: 'Industry', c: '4 名', cEn: '4' },
                  { g: '资深投资人', gEn: 'Investors', c: '3—4 名', cEn: '3–4' },
                  { g: '技术专家（含海外）', gEn: 'Tech experts (intl.)', c: '2—3 名', cEn: '2–3' },
                  { g: '主办方代表', gEn: 'Organizers', c: '2 名', cEn: '2' },
                ].map((row, i) => (
                  <li key={i} className="flex items-center justify-between text-[13px] py-1.5 border-b border-[#E3ECFA] last:border-0">
                    <span className="text-[#48597A]">{tr(row.g, row.gEn)}</span>
                    <span className="font-semibold text-[#1A2B4D]">{tr(row.c, row.cEn)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[#98A6BE] font-semibold mb-2.5">
                {tr('按赛道评审', 'Judging by track')}
              </div>
              <p className="text-[13px] leading-relaxed text-[#48597A]">
                {tr('自由创意赛道综合衡量技术创新、商业价值、创新想法、完成度与长期发展；FDE 赛道按各企业命题标准评审。', 'Free Creation balances technical innovation, commercial value, original ideas, completeness and long-term development. FDE follows each corporate brief’s criteria.')}
              </p>
              <p className="text-[12px] text-[#6B7C9B] leading-relaxed mt-4">
                {tr('决赛评审团由政府代表、产业专家、投资人、技术专家组成，现场统分并公布获奖名单。', 'The finals jury combines government representatives, industry experts, investors and technologists; scores are tallied on site and winners announced live.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Rules & Integrity Box */}
      <section id="maker-rules" className="scroll-mt-24 max-w-[1200px] mx-auto px-6 sm:px-8 pt-8">
        <div className="bg-[#F7F8FA] rounded-2xl p-6 sm:p-8 border border-[#E8EAED] text-xs text-[#666666] space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#0B1B3A]">
            <ShieldCheck className="w-4 h-4 text-[#00C48C]" />
            <span>{tr('赛事诚信公约与法律声明', 'Integrity Pledge & Legal Notice')}</span>
          </div>
          <p>
            {tr('1.', '1.')} <strong className="text-[#0B1B3A]">{tr('全程免费', 'Free to enter')}</strong>{tr('：报名及评审不收取任何费用。任何声称可代办入围或收取辅导费用的行为均为诈骗，请创客提高警惕。', ': no entry or judging fees of any kind. Anyone claiming they can guarantee shortlisting or charging coaching fees is committing fraud — please stay alert.')}
          </p>
          <p>
            {tr('2.', '2.')} <strong className="text-[#0B1B3A]">{tr('知识产权归属', 'IP ownership')}</strong>{tr('：所有参赛项目的完整知识产权严格属于参赛者个人或团队所有，未经团队书面授权，组委会绝不公开发布或商用。', ': full IP in every entry belongs strictly to the individual or team. Without written authorisation the organiser will never publish or commercialise it.')}
          </p>
          <p>
            {tr('3.', '3.')} <strong className="text-[#0B1B3A]">{tr('个税代扣代缴与兑付', 'Tax withholding & payout')}</strong>{tr('：所有奖金均为税前金额，组委会将依据相关税法代扣代缴 20% 偶然所得个人所得税，赛后 30 个工作日内拨付至获奖人账户。', ': all prizes are gross amounts. The organiser withholds 20% incidental-income tax as required by law and pays winners within 30 working days after the event.')}
          </p>
        </div>
      </section>
    </div>
  );
};
