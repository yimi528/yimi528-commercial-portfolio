import React from 'react';
// Exact crops from the supplied event poster; source coordinates: highlights/poster-crops.json.
import competeIllustration from '../../assets/images/highlights/poster-compete.webp';
import exploreIllustration from '../../assets/images/highlights/poster-explore.webp';
import learnIllustration from '../../assets/images/highlights/poster-learn.webp';
import playIllustration from '../../assets/images/highlights/poster-play.webp';
import collaborateIllustration from '../../assets/images/highlights/poster-collaborate.webp';
import { useApp } from '../../context/AppContext';
import { PublishedNotice } from '../sections/PublishedNotice';
import { PeopleSection } from '../sections/PeopleSection';
import officialLogo from '../../assets/images/doai-logo-official.png';
import heroGlobeVideo from '../../assets/video/hero-globe.mp4';
import heroGlobePoster from '../../assets/video/hero-globe-poster.jpg';
import {
  ArrowRight,
  Play,
  FileText,
  Users,
  Calendar,
  Award,
  Ticket,
  ChevronRight,
  MapPin,
  Footprints,
  Compass,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const { setActiveRoute, tr } = useApp();

  const quickNavItems = [
    {
      id: 'register',
      title: '赛事报名', titleEn: 'Contest Entry',
      subtitle: '五大赛道 · 全球征集', subtitleEn: 'Five tracks · Open worldwide',
      icon: FileText,
      iconColor: 'text-[#165DFF]',
      iconBg: 'bg-[#165DFF]/10',
      action: () => setActiveRoute('maker/tracks'),
    },
    {
      id: 'team',
      title: '组队社区', titleEn: 'Community',
      subtitle: '找到你的创意伙伴', subtitleEn: 'Find your creative partners',
      icon: Users,
      iconColor: 'text-[#00C48C]',
      iconBg: 'bg-[#00C48C]/10',
      action: () => setActiveRoute('square'),
    },
    {
      id: 'forum',
      title: '论坛预约', titleEn: 'Forums',
      subtitle: '分论坛排期待公布', subtitleEn: 'Forum programme coming soon',
      icon: Calendar,
      iconColor: 'text-[#FF4D4F]',
      iconBg: 'bg-[#FF4D4F]/10',
      action: () => setActiveRoute('forum'),
    },
    {
      id: 'showcase',
      title: '项目展示', titleEn: 'Showcase',
      subtitle: '入围项目 · 观众投票', subtitleEn: 'Finalists · Audience voting',
      icon: Award,
      iconColor: 'text-[#722ED1]',
      iconBg: 'bg-[#722ED1]/10',
      action: () => setActiveRoute('showcase'),
    },
    {
      id: 'tickets',
      title: '票务预约', titleEn: 'Tickets',
      subtitle: '门票 · 游园 · 市集', subtitleEn: 'Entry · fair · marketplace',
      icon: Ticket,
      iconColor: 'text-[#FA8C16]',
      iconBg: 'bg-[#FA8C16]/10',
      action: () => setActiveRoute('attend'),
    },
  ];

  const highlightCards = [
    {
      id: 'compete', title: '可赛', titleEn: 'Compete', img: competeIllustration,
      subtitle: 'AI 全球创客大赛', subtitleEn: 'Global AI maker contest',
      desc: '自由创意与 FDE 企业命题，带着作品登上路演舞台。',
      descEn: 'Open creation and real enterprise briefs. Bring your project to the pitch stage.',
    },
    {
      id: 'explore', title: '可逛', titleEn: 'Explore', img: exploreIllustration,
      subtitle: '创客游园与市集', subtitleEn: 'Maker fair & market',
      desc: '逛科技展位、发现创客作品，体验长宁味道市集。',
      descEn: 'Discover technology booths, maker projects and the Changning Flavours market.',
    },
    {
      id: 'learn', title: '可学', titleEn: 'Learn', img: learnIllustration,
      subtitle: '主题论坛与分享', subtitleEn: 'Forums & shared ideas',
      desc: '走进主题分会场，与产业专家、开发者交流 AI 实践。',
      descEn: 'Join themed forums and exchange AI practices with industry experts and developers.',
    },
    {
      id: 'play', title: '可玩', titleEn: 'Play', img: playIllustration,
      subtitle: 'AI 互动体验', subtitleEn: 'Hands-on AI experiences',
      desc: '探索 AI 互动装置，领取游园护照、集章兑奖。',
      descEn: 'Try interactive AI installations and collect passport stamps for rewards.',
    },
    {
      id: 'collaborate', title: '可合作', titleEn: 'Collaborate', img: collaborateIllustration,
      subtitle: '产业与创投对接', subtitleEn: 'Industry & investor connections',
      desc: '连接企业、投资人与创客，寻找 POC 订单与合作机会。',
      descEn: 'Meet enterprises, investors and makers to explore POC deals and partnerships.',
    },
  ];

  return (
    <div className="pt-[72px] bg-white text-[#0B1B3A] overflow-hidden">
      {/* =========================================================================
          1. HERO SECTION — full-bleed looping globe film as the backdrop.
          Copy sits over the pale sky on the left; the film's own globe and
          city skyline carry the right side. Poster covers the first paint.
         ========================================================================= */}
      <section className="relative overflow-hidden bg-white text-[#0B1B3A]">
        {/* Background: looping globe film — muted, autoplay, seamless loop.
            Poster (a 2s frame) covers the first paint so there is no flash. */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src={heroGlobeVideo}
          poster={heroGlobePoster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        {/* 白色提亮渐变：左侧文字区对比度更高，右侧保留影片原貌 */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(100deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.42) 38%, rgba(255,255,255,0.10) 68%)',
          }}
        />

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-10 pt-28 sm:pt-32 lg:pt-36 pb-20 sm:pb-28 lg:pb-36">
          <div className="max-w-[620px] space-y-4 lg:space-y-5">
            <div className="doa-rise doa-rise-1 flex items-center gap-2">
              <span className="h-px w-7 bg-[#165DFF]/70" aria-hidden="true" />
              <span className="text-[11px] lg:text-xs font-semibold text-[#165DFF] tracking-[0.28em]">
                {tr('政府支持 × 全球链接 × 产业落地 × 全民参与', 'GOVERNMENT BACKING × GLOBAL REACH × INDUSTRY × EVERYONE')}
              </span>
            </div>

            <h1 className="doa-rise doa-rise-2 leading-[0.98]">
              <span className="block text-[#141B45]">
                <img
                  src={officialLogo}
                  alt="DOAI — Dobe Open AI Makers Conference"
                  className="h-[120px] sm:h-[152px] lg:h-[184px] w-auto max-w-full object-contain object-left"
                  draggable={false}
                />
              </span>
              <span className="block text-[17px] sm:text-[22px] lg:text-[28px] font-black text-[#0B1B3A] tracking-[-0.01em] uppercase leading-[1.2] mt-3">
                DOBE AI Makers
              </span>
              <span className="block text-[17px] sm:text-[22px] lg:text-[28px] font-black text-[#0B1B3A] tracking-[-0.01em] uppercase leading-[1.2]">
                Conference
              </span>
              <span className="block text-[22px] sm:text-[30px] lg:text-[38px] font-bold text-[#1a2b4d] tracking-[-0.02em] leading-[1.15] mt-1.5">
                {tr('DOAI · Dobe AI 全球创客大会', 'DOBE AI Makers Conference 2026')}
              </span>
            </h1>

            <div className="doa-rise doa-rise-3 space-y-1">
              <div className="text-[15px] sm:text-[17px] lg:text-[19px] font-bold text-[#0B1B3A]">
                {tr('政府东风下，一场全球化、产业向、可赛可玩可产出的 AI 创客大会', 'A global, industry-driven AI makers conference under the government\'s support')}
              </div>
              <p className="text-[11px] sm:text-[12px] lg:text-[13px] text-[#5a6b85] leading-[1.7]">
                {tr('以赛事为引擎、市集为体验、论坛为内容，', 'Contest as the engine, market as the experience, forums as the content —')}
                <br />
                {tr('两天后带走项目、订单和人脉。', 'leave with projects, orders and connections in two days.')}
              </p>
            </div>

            <div className="doa-rise doa-rise-4 flex flex-wrap items-center gap-2.5 lg:gap-3 pt-1">
              <button
                type="button"
                onClick={() => setActiveRoute('maker/tracks')}
                className="group px-6 py-2.5 lg:px-7 lg:py-3 text-[12px] lg:text-sm font-semibold text-white bg-[#165DFF] hover:bg-[#1453E6] rounded-full shadow-[0_8px_20px_rgba(22,93,255,0.28)] hover:shadow-[0_12px_28px_rgba(22,93,255,0.34)] transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#165DFF] focus-visible:ring-offset-2 active:scale-[0.97]"
              >
                <span>{tr('报名参赛', 'Enter the Contest')}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveRoute('attend')}
                className="px-5 py-2.5 lg:px-6 lg:py-3 text-[12px] lg:text-sm font-semibold text-[#165DFF] bg-white/85 hover:bg-white border border-[#165DFF] rounded-full backdrop-blur-sm transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#165DFF] focus-visible:ring-offset-2 active:scale-[0.97]"
              >
                <Ticket className="w-3.5 h-3.5 text-[#165DFF]" />
                <span>{tr('报名参会', 'Get Tickets')}</span>
              </button>
            </div>

            {/* ---------- Date / venue ---------- */}
            <div className="doa-rise doa-rise-5 flex flex-wrap items-center gap-x-3 gap-y-2 pt-2">
              <span className="text-[11px] font-mono text-[#55627a]">2026</span>
              <span className="text-lg sm:text-xl font-extrabold font-mono text-[#0B1B3A] tracking-tight">
                {tr(
                  '12.5（周六） —— 12.6（周日） · 共 2 天',
                  'Dec 5 (Sat) — Dec 6 (Sun) · 2 days',
                )}
              </span>
              <span className="h-4 w-px bg-[#111111]/15" aria-hidden="true" />
              <span>
                <span className="block text-[13px] font-semibold text-[#1a2b4d] leading-tight">
                  {tr('上海 · 长宁', 'Shanghai · Changning')}
                </span>
                <span className="block text-[11px] text-[#55627a]">
                  {tr('乐动虹桥', 'LeDong Hongqiao')}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Bottom fade into the next white section */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-20 lg:h-28 pointer-events-none z-10"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, #ffffff 94%)' }}
        />
      </section>



      {/* =========================================================================
          2. FLOATING QUICK NAVIGATION BAR
          五个入口等距、居中、对称排列。
          两条硬约束：
          1) 每行的列数要能被入口数整除，否则会空出格子把整排挤偏——此前写成
             xl:grid-cols-6，5 个入口只占前 5 格，第 6 格永远空着，整排贴左、
             右侧多出 200px 空白，既不等距也不居中。
          2) 换行后末排不满时（5 个入口 2 列排 = 2+2+1，3 列排 = 3+2），用
             flex-wrap + justify-center 让末排自动居中，避免落单入口贴左。
          桌面端 flex-1 + gap-0 + divide-x：每格等宽，分隔线正好落在两格中间，
          内容左右留白严格相等（几何实测 1024—1920 逐档 padΔ = 0）。
         ========================================================================= */}
      <section className="relative z-30 -mt-10 sm:-mt-12 max-w-[1200px] mx-auto px-6 md:px-10">
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-[0_20px_50px_rgba(22,93,255,0.08)] border border-[#EAECEF] flex flex-wrap justify-center gap-4 sm:gap-6 lg:flex-nowrap lg:gap-0">
          {quickNavItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.action}
                className="group relative flex flex-col items-center gap-2 p-2 sm:p-4 text-center transition-all hover:translate-y-[-2px] focus:outline-none min-w-0 basis-[calc(50%_-_0.5rem)] sm:basis-[calc(33.3333%_-_1rem)] lg:basis-0 lg:flex-1 lg:before:absolute lg:before:inset-y-0 lg:before:left-0 lg:before:w-px lg:before:bg-[#F0F2F5] lg:before:content-[''] lg:first:before:hidden"
              >
                <div
                  className={`w-11 h-11 rounded-2xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-[#0B1B3A] group-hover:text-[#165DFF] transition-colors truncate">
                    {tr(item.title, item.titleEn)}
                  </h4>
                  <p className="text-[11px] text-[#888888] mt-0.5 leading-snug line-clamp-2">
                    {tr(item.subtitle, item.subtitleEn)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <PublishedNotice />

      <section id="event-highlights" aria-labelledby="highlights-title" className="py-16 lg:py-20 max-w-[1200px] mx-auto px-6 md:px-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
          <h2 id="highlights-title" className="text-3xl font-extrabold text-[#0B1B3A] tracking-tight shrink-0">
            {tr('活动亮点', 'Event Highlights')}
          </h2>
          <p className="max-w-xl text-sm text-[#6B7C9B] leading-relaxed">
            {tr('可赛、可逛、可学、可玩、可合作。两天相聚乐动虹桥，从创意出发，带走作品、知识与新的连接。', 'Compete, explore, learn, play and collaborate. Two days at LeDong Hongqiao to turn ideas into projects, knowledge and new connections.')}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {highlightCards.map(card => (
            <article
              key={card.id}
              className="flex sm:flex-col text-left bg-white rounded-2xl overflow-hidden border border-[#E3ECFA]"
            >
              <div className="w-28 sm:w-full shrink-0 aspect-square bg-[#F5FAFF]">
                <img src={card.img} alt="" loading="lazy" width="540" height="540" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col flex-1 p-4 lg:p-5">
                <h3 className="text-xl lg:text-2xl font-extrabold text-[#165DFF] leading-tight">{tr(card.title, card.titleEn)}</h3>
                <p className="mt-2 text-xs font-bold text-[#1A2B4D]">{tr(card.subtitle, card.subtitleEn)}</p>
                <p className="mt-2 text-xs text-[#6B7C9B] leading-relaxed">{tr(card.desc, card.descEn)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <PeopleSection />
    </div>
  );
};
