import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { highlights } from '../../data/showcase';
import { ArrowRight, MapPin } from 'lucide-react';

/**
 * 大会介绍 · 决策页（方案 A）
 *
 * 视觉语言回到站内既有的卡片体系（doa-card / doa-panel / doa-eyebrow）：
 * 浅灰底、白卡、1px 描边、英文眉批、三列等分指标卡、三列功能卡。
 *
 * 这一页只回答三个问题，然后把人送去该去的地方：
 *   1. 这是什么、什么时候、在哪里、要不要钱？  → 报头 + 指标卡
 *   2. 我去能做什么？                          → 六种打开方式
 *   3. 两天怎么安排？                          → 双卡日程
 *
 * 场地导览（15 个点位）在 module/venue，招商报价在 /partner。
 */

interface WayRow {
  id: string;
  label: string;
  labelEn: string;
  line: string;
  lineEn: string;
}

/** 索引行的文案在此收口；数字仍从 showcase.ts 取，避免两处漂移。 */
const WAY_CONFIG: WayRow[] = [
  { id: 'hl-contest', label: '可赛', labelEn: 'Compete', line: '自由创意三条 + FDE 两条企业命题', lineEn: 'Three Free Creation directions + two FDE enterprise briefs' },
  { id: 'hl-browse', label: '可逛', labelEn: 'Explore', line: '60+ 企业展位，40+ 选手作品', lineEn: '60+ company booths, 40+ contestant projects' },
  { id: 'hl-play', label: '可玩', labelEn: 'Play', line: '人机互动、电竞、交友休闲', lineEn: 'Human–AI interaction, esports, lounges' },
  { id: 'hl-learn', label: '可学', labelEn: 'Learn', line: '主题交流与实践分享，具体排期待公布', lineEn: 'Themed discussions and practical insights; programme to be announced' },
  { id: 'hl-collab', label: '可合作', labelEn: 'Deal', line: 'Deep talk 让需求方与能力方坐下谈', lineEn: 'Deep talk puts the demand side and the supply side at one table' },
  { id: 'hl-global', label: '全球化', labelEn: 'Global', line: '全球 TOP 37 高校，港/佛/硅谷联动', lineEn: 'TOP 37 universities worldwide, linked with Hong Kong, Florence and Silicon Valley' },
];

const DAYS = [
  {
    id: 'day1',
    label: 'Day 1',
    date: '12.05 周六',
    dateEn: '12.05 Sat',
    theme: '开幕与社交',
    themeEn: 'Opening & Social',
    rows: [
      { time: '09:00–12:30', title: '签到报到 · 领取物料', titleEn: 'Check-in · collect materials', detailId: 'sch-101' },
      { time: '13:30–14:40', title: '开幕式 · 领导致辞 · 战略发布', titleEn: 'Opening ceremony · remarks · strategy launch', detailId: 'sch-102' },
      { time: '14:40–15:40', title: '圆桌论坛：全球 AI 创客生态', titleEn: 'Roundtable: the global AI maker ecosystem', detailId: 'sch-103' },
      { time: '15:40–16:20', title: 'TOP37 高校签约 ·《长宁倡议》发布', titleEn: 'TOP37 university signing · Changning Initiative', detailId: 'sch-104' },
      { time: '16:20–18:30', title: '自由社交 · 展陈参观 · 合作洽谈', titleEn: 'Open networking · exhibition · partnership talks', detailId: 'sch-105' },
      { time: '18:30–21:30', title: 'After Party · 投资人-创业者速配', titleEn: 'After Party · investor–founder speed matching', detailId: 'sch-106' },
    ],
  },
  {
    id: 'day2',
    label: 'Day 2',
    date: '12.06 周日',
    dateEn: '12.06 Sun',
    theme: '路演主日',
    themeEn: 'Roadshow Day',
    rows: [
      { time: '09:30–18:00', title: '全面开馆 · 市集 / 展商 / 游园护照', titleEn: 'Doors open · market / exhibitors / fair passport', detailId: 'sch-201' },
      { time: '09:30–12:00', title: '决赛路演上半场 · 8+5 分钟', titleEn: 'Finals roadshow, session one · 8 + 5 minutes', detailId: 'sch-202' },
      { time: '09:30–12:00', title: '分论坛上午场 · 海外分会场路演', titleEn: 'Morning sub-forums · overseas venue roadshows', detailId: 'sch-204' },
      { time: '13:30–17:00', title: '决赛路演下半场 · 圆桌 · 分论坛下午场', titleEn: 'Finals roadshow, session two · roundtable · afternoon sub-forums', detailId: 'sch-205' },
      { time: '17:00–18:00', title: '闭幕颁奖 · 落地签约 · 大合影', titleEn: 'Closing & awards · on-the-ground signings · group photo', detailId: 'sch-206' },
    ],
  },
];

/* scrollTo: 'schedule' → 落地后滚动到「两天怎么过」（场地页的「回看日程」用它回来） */
export const ConferenceView: React.FC<{ scrollTo?: string | null }> = ({ scrollTo }) => {
  const { lang, setActiveRoute, tr } = useApp();

  useEffect(() => {
    if (!scrollTo) return;
    const el = document.getElementById(`conf-${scrollTo}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [scrollTo]);

  const en = lang === 'en';

  const wayRows = WAY_CONFIG.map(w => {
    const h = highlights.find(x => x.id === w.id);
    return { ...w, value: h?.figure.value ?? '', unit: en ? (h?.figure.unitEn ?? h?.figure.unit ?? '') : (h?.figure.unit ?? '') };
  });

  const figures = [
    { label: en ? 'Dates' : '大会时间', value: '12.05—06', note: en ? 'Sat – Sun · two days' : '周六 — 周日 · 共 2 天' },
    { label: en ? 'On-site attendance' : '线下人次', value: '2000—4000', note: en ? '5 million+ total reach' : '全网曝光 500 万+' },
    { label: en ? 'Booths' : '现场展位', value: '100+', note: en ? '60+ companies + 40+ contestant projects' : '60+ 企业 + 40+ 选手作品' },
  ];

  const orgs = en
    ? [
        { label: 'Guiding units', value: 'Changning District People’s Government' },
        { label: 'Hosts', value: 'DoBe Group × AtomHub' },
        { label: 'Co-host', value: 'Shanghai Times Youth Science and Technology Innovation Development Center' },
      ]
    : [
        { label: '指导单位', value: '长宁区人民政府' },
        { label: '主办单位', value: '德必集团 × 原子公社 AtomHub' },
        { label: '联合主办', value: '上海市时代青年科创发展中心' },
      ];

  return (
    <div className="bg-[#F7FAFF] pt-[72px] pb-20">
      {/* ================= 报头：眉批 + 主标题 + 导读 + 元信息 ================= */}
      <section className="doa-container pt-10 sm:pt-14">
        <div className="doa-eyebrow mb-3">
          {lang === 'zh' ? '大会介绍' : 'The Conference'}
        </div>

        <h1 className="max-w-4xl text-[30px] sm:text-[40px] lg:text-[46px] font-bold leading-[1.22] tracking-[-0.02em] text-[#0B1B3A]">
          {lang === 'zh'
            ? '从信息互联到智能共生：全球 AI 创作者的新视界'
            : 'From Connectivity to Co-Intelligence: The Horizon of Global AI Creators'}
        </h1>

        <p className="mt-5 max-w-[680px] text-[15px] leading-[1.65] text-[#4B5563]">
          {tr(
            '政府东风下，一场全球化、产业向、可赛可玩可产出的 AI 创客大会。以赛事为引擎、市集为体验、论坛为内容——两天后带走项目、订单和人脉。',
            'A global, industry-driven AI makers conference: contest as the engine, market as the experience, forums as the content.',
          )}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[#6B7C9B]">
          <span className="tabular-nums">
            {en ? '2026.12.05—12.06 · LeDong Hongqiao, Changning, Shanghai' : '2026.12.05—12.06 · 上海 · 长宁 · 乐动虹桥'}
          </span>
          <span aria-hidden="true" className="h-3 w-px bg-[#D3DFF1]" />
          <span className="inline-flex items-center gap-1 text-[#00B487]">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#00B487]" />
            {en ? 'Entry and attendance are free' : '报名与参会全程免费'}
          </span>
        </div>
      </section>

      {/* ================= 指标卡：单张白卡，三列等分，内部竖向分割 ================= */}
      <section className="doa-container mt-10 sm:mt-12">
        <div className="doa-card grid grid-cols-1 sm:grid-cols-3 overflow-hidden">
          {figures.map((f, i) => (
            <div
              key={f.label}
              className={`p-5 sm:p-6 ${i > 0 ? 'border-t sm:border-t-0 sm:border-l border-[#E3ECFA]' : ''}`}
            >
              <div className="text-[11px] font-semibold tracking-[0.08em] text-[#98A6BE]">{f.label}</div>
              <div className="mt-2 text-[24px] sm:text-[27px] font-bold leading-none tabular-nums tracking-tight text-[#0B1B3A]">
                {f.value}
              </div>
              <div className="mt-2 text-[12px] leading-[1.4] text-[#6B7C9B]">{f.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 六种打开方式：三列功能卡 ================= */}
      <section className="doa-container mt-14 sm:mt-16">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <div>
            <div className="doa-eyebrow mb-2">SIX WAYS IN</div>
            <h2 className="text-[20px] sm:text-[26px] font-bold tracking-tight text-[#0B1B3A]">
              {tr('一场大会，六种进来方式', 'One Conference, Six Ways In')}
            </h2>
          </div>
          <p className="text-[13px] text-[#6B7C9B]">
            {tr('六扇门并排开着，检票口是同一个。', 'Six doors, one entrance.')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {wayRows.map(w => (
            <article
              key={w.id}
              className="doa-card flex flex-col p-5 text-left sm:p-6"
            >
              <div className="doa-eyebrow mb-2">{w.labelEn}</div>
              <h3 className="text-[16px] font-bold text-[#0B1B3A]">
                {lang === 'en' ? w.labelEn : w.label}
              </h3>
              <p className="mt-2 flex-1 text-[13px] leading-[1.6] text-[#6B7C9B]">{en ? w.lineEn : w.line}</p>

              {w.value && <div className="mt-4 flex items-baseline justify-between gap-3">
                <span className="text-[22px] font-bold leading-none tabular-nums tracking-tight text-[#0B1B3A]">
                  {w.value}
                  <span className="ml-1 text-[11px] font-normal text-[#98A6BE]">{w.unit}</span>
                </span>
              </div>}
            </article>
          ))}
        </div>
      </section>

      {/* ================= 两日日程：双卡并列，完整保留 11 场 ================= */}
      <section id="conf-schedule" className="doa-container mt-14 scroll-mt-24 sm:mt-16">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <div>
            <div className="doa-eyebrow mb-2">AGENDA</div>
            <h2 className="text-[20px] sm:text-[26px] font-bold tracking-tight text-[#0B1B3A]">
              {tr('两天怎么过', 'The Two Days')}
            </h2>
          </div>
          <p className="text-[13px] text-[#6B7C9B]">
            {tr('两天双会场同步进行，每天两个会场都有活动。', 'Both venues host activities on both days, with programmes running in parallel.')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          {DAYS.map(d => (
            <div key={d.id} className="doa-card p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[#E3ECFA] pb-3">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[13px] font-bold text-[#0B1B3A]">{d.label}</span>
                  <span className="text-[12px] tabular-nums text-[#6B7C9B]">{en ? d.dateEn : d.date}</span>
                </div>
                <span className="text-[12px] font-semibold text-[#165DFF]">{en ? d.themeEn : d.theme}</span>
              </div>

              <ul>
                {d.rows.map(r => (
                  <li key={r.detailId}>
                    <button
                      type="button"
                      onClick={() => setActiveRoute(`detail/schedule/${r.detailId}`)}
                      className="group grid w-full grid-cols-[5.5rem_1fr_auto] items-baseline gap-x-3 border-b border-[#F1F5FB] py-2.5 text-left last:border-b-0 hover:bg-[#F7FAFF] focus:outline-none focus-visible:bg-[#F2F7FF]"
                    >
                      <span className="text-[11.5px] font-semibold tabular-nums text-[#165DFF]">{r.time}</span>
                      <span className="text-[13px] leading-snug text-[#1A2B4D] transition-colors group-hover:text-[#0B1B3A]">
                        {en ? r.titleEn : r.title}
                      </span>
                      <ArrowRight className="h-3 w-3 text-transparent transition-colors group-hover:text-[#165DFF]" />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-[#6B7C9B]">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  {tr('乐动虹桥', 'LeDong Hongqiao')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 场地：一张入口卡，导览在二级页 ================= */}
      <section className="doa-container mt-14 sm:mt-16">
        <div className="doa-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <span className="min-w-0 flex-1">
            <span className="doa-eyebrow mb-2 block">VENUE GUIDE</span>
            <span className="block text-[17px] font-bold text-[#0B1B3A] sm:text-[19px]">
              {tr('双会场空间规划 · 15 个点位逐层看', 'Two venues, fifteen locations')}
            </span>
            <span className="mt-2 block max-w-2xl text-[13px] leading-[1.6] text-[#6B7C9B]">
              {tr(
                '乐动虹桥 1F 展商与主会场、4F—5F 分论坛与人机互动、德必园区海外专场——按楼层看动线。',
                'LeDong 1F for expo and main stage, 4F—5F for forums and interaction, Dobe Park for the overseas programme.',
              )}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setActiveRoute('module/venue')}
            className="doa-btn doa-btn-secondary w-[206px] max-w-full shrink-0 self-start justify-center text-center sm:self-auto"
          >
            {tr('逐层导览', 'Open guide')}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      {/* ================= 招商：浅色面板，报价在 /partner ================= */}
      <section className="doa-container mt-4">
        <div className="doa-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <div className="doa-eyebrow mb-2">PARTNERSHIP</div>
            <div className="text-[16px] font-bold text-[#0B1B3A]">
              {tr('招商合作 · 四层权益', 'Partnership · Four tiers')}
            </div>
            <div className="mt-1.5 text-[13px] leading-relaxed text-[#6B7C9B]">
              {tr(
                '展位免费起，冠名 20 万起；分会场冠名与赛道出题可单独谈。',
                'Booths from free, title sponsorship from ¥200k; session naming and track briefs by arrangement.',
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveRoute('partner')}
            className="doa-btn doa-btn-secondary w-[206px] max-w-full shrink-0 self-start justify-center text-center sm:self-auto"
          >
            {tr('查看合作方案与报价', 'See tiers and pricing')}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      {/* ================= 报名 ================= */}
      <section className="doa-container pt-14 sm:pt-16 text-center">
        <h2 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#0B1B3A]">
          {lang === 'zh' ? '准备好了吗？' : 'Ready to join?'}
        </h2>
        <p className="mt-2 text-[13px] text-[#6B7C9B]">
          {tr(
            '报名、评审与参会全程免费，提交项目申报即可锁定决赛入围评定资格。',
            'Entry, judging and attendance are free. Submit a project to be considered for the finals.',
          )}
        </p>
        <button
          type="button"
          onClick={() => setActiveRoute('maker/tracks')}
          className="doa-btn doa-btn-primary mt-6"
        >
          {tr('立即免费报名 AI 创客大赛', 'Enter the AI Makers Contest')}
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      {/* ================= 主办与背书：属性行列表 ================= */}
      <section className="doa-container mt-12">
        <div className="doa-card divide-y divide-[#E3ECFA] px-5 py-1 sm:px-6">
          {orgs.map(o => (
            <div key={o.label} className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:gap-6">
              <span className="w-24 shrink-0 text-[11px] font-semibold tracking-[0.06em] text-[#98A6BE]">
                {o.label}
              </span>
              <span className="text-[13px] leading-relaxed text-[#1A2B4D]">{o.value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
