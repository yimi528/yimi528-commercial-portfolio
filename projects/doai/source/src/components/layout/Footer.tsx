import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  const { lang, activeRoute, currentUser, setActiveRoute, openPolicy } = useApp();

  if (activeRoute.startsWith('dashboard') && !currentUser) {
    return (
      <footer className="bg-white text-[#8A96AF]">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-7 border-t border-[#E5EBF4] px-6 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:py-10">
          <div className="shrink-0">
            <div className="text-xl font-bold tracking-tight text-[#0B1B3A]">DOAI<span className="font-normal text-[#165DFF]">2026</span></div>
            <p className="mt-2 text-[11px] leading-relaxed">© 2026 DOAI Organizing Committee & Atomclub Network.</p>
          </div>
          <nav aria-label={lang === 'zh' ? '页脚导航' : 'Footer navigation'} className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs sm:gap-x-4">
            {[
              { zh: '大会与赛事', en: 'Conference', route: 'conference' },
              { zh: '创客社区', en: 'Community', route: 'square' },
              { zh: 'DOAI Forum 分论坛', en: 'DOAI Forum', route: 'forum' },
              { zh: 'DOAI Passport 身份卡', en: 'DOAI Passport', route: 'dashboard' },
            ].map((item, index) => (
              <React.Fragment key={item.route}>
                {index > 0 && <span aria-hidden="true" className="text-[#CFD7E4]">|</span>}
                <button type="button" onClick={() => setActiveRoute(item.route)} className="transition-colors hover:text-[#165DFF]">{lang === 'zh' ? item.zh : item.en}</button>
              </React.Fragment>
            ))}
          </nav>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-white border-t border-[#E8EAED] pt-16 pb-12 text-sm text-[#666666]">
      <div className="max-w-[1200px] mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#E8EAED]">
          {/* Brand & Narrative */}
          <div className="sm:col-span-3 lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-[#0B1B3A]">
                DOAI <span className="font-light text-[#165DFF]">2026</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#666666] max-w-sm">
              {lang === 'zh'
                ? 'DOAI · Dobe AI 全球创客大会官方数字基础设施。连接全球智能创造者，构筑下一代开放式协作网络。'
                : 'DOBE AI MAKERS CONFERENCE 2026 — Official Digital Infrastructure. Connecting decentralized intelligence into an open creative network.'}
            </p>
            <div className="flex flex-col gap-1 pt-2 text-xs text-[#48597A]">
              <a href="mailto:jocelyn@atomesh.cn" className="hover:text-[#165DFF] transition-colors">
                jocelyn@atomesh.cn
              </a>
            </div>
            <div className="flex items-center gap-3 pt-2 text-xs text-[#888888]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00C48C]" />
                {lang === 'zh' ? '全流程免费' : '100% Free'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-[#165DFF]" />
                {lang === 'zh' ? '项目知识产权受保' : 'IP Protected'}
              </span>
            </div>
          </div>

          {/* Nav Column 1: 大会与赛事 */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#0B1B3A] uppercase tracking-wider">
              {lang === 'zh' ? '大会与赛事' : 'Event & Contest'}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => setActiveRoute('conference')}
                  className="hover:text-[#165DFF] transition-colors"
                >
                  {lang === 'zh' ? '大会日程与使命' : 'Schedule & Mission'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveRoute('maker/tracks')}
                  className="hover:text-[#165DFF] transition-colors"
                >
                  {lang === 'zh' ? 'FDE 赛道 · 赛题与赛制' : 'FDE Track · Briefs & Rules'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveRoute('maker/tracks')}
                  className="hover:text-[#165DFF] transition-colors"
                >
                  {lang === 'zh' ? '自由创意赛道 · 赛题与赛制' : 'Free Creation · Briefs & Rules'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveRoute('maker/tracks')}
                  className="hover:text-[#165DFF] transition-colors"
                >
                  {lang === 'zh' ? '赛事申报通道' : 'Contest Submission'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveRoute('partner')}
                  className="hover:text-[#165DFF] transition-colors"
                >
                  {lang === 'zh' ? '招商合作与报价' : 'Partnership & Pricing'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => openPolicy('rules')}
                  className="hover:text-[#165DFF] transition-colors"
                >
                  {lang === 'zh' ? '奖金兑付与合规说明' : 'Prize & Integrity Policy'}
                </button>
              </li>
            </ul>
          </div>

          {/* Nav Column 2: 生态与连接 */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#0B1B3A] uppercase tracking-wider">
              {lang === 'zh' ? '生态与协作' : 'Ecosystem'}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => setActiveRoute('square')}
                  className="hover:text-[#165DFF] transition-colors"
                >
                  {lang === 'zh' ? '创客社区' : 'Maker Community'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveRoute('forum')}
                  className="hover:text-[#165DFF] transition-colors"
                >
                  {lang === 'zh' ? 'DOAI Forum 分论坛' : 'DOAI Forum'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveRoute('dashboard')}
                  className="hover:text-[#165DFF] transition-colors"
                >
                  {lang === 'zh' ? 'DOAI Passport 身份卡' : 'DOAI Passport ID'}
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#888888]">
          <p>© 2026 DOAI Organizing Committee & Atomclub Network. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs">
            <span>{lang === 'zh' ? 'DOAI · Dobe AI 创客大会' : 'DOBE AI MAKERS CONFERENCE 2026'}</span>
            <span aria-hidden="true">|</span>
            <span>{lang === 'zh' ? '2026 年 12 月 5—6 日' : 'December 5–6, 2026'}</span>
            <span aria-hidden="true">|</span>
            <span>{lang === 'zh' ? '上海 · 长宁' : 'Changning, Shanghai'}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
