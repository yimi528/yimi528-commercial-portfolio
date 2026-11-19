import { canManageRegistrations, registrationAccessKey } from '../../lib/registrationChannel.ts';
import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../common/Avatar';
import { CommunityQrCode } from './CommunityQrCode';
import officialLogo from '../../assets/images/doai-logo-official.png';
import { Bell, ChevronDown, ShieldCheck, LogOut, User as UserIcon, X, Menu } from 'lucide-react';
import { parseRoute } from '../router/RouterView';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    activeRoute,
    setActiveRoute,
    setLoginModalOpen,
    authLoading,
    logout,
    unreadCount,
    setNotificationDrawerOpen,
    lang,
    setLang,
  } = useApp();

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    if (!accountMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setAccountMenuOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKeyDown); };
  }, [accountMenuOpen]);

  // Every dropdown entry resolves to a distinct destination: either a scoped
  // sub-route (parent/child) or a detail page. Nothing collapses onto a shared
  // coarse route any more, so a click always changes what you see.
  //
  // `route` is where the section button itself lands; `children` are the
  // deep-links inside its dropdown.
  interface MenuItem {
    key: string;
    label: string;
    labelEn?: string;
    hasDropdown: boolean;
    route?: string;
    children?: { label: string; labelEn?: string; route: string }[];
  }

  const menuItems: MenuItem[] = [
    { key: 'home', label: '首页', labelEn: 'Home', hasDropdown: false },
    {
      key: 'conference',
      label: '大会介绍', labelEn: 'Conference',
      hasDropdown: false,
      route: 'conference',
    },
    {
      key: 'maker',
      label: '赛事中心', labelEn: 'Contest',
      hasDropdown: false,
      route: 'maker',
    },
    {
      key: 'square',
      label: '创客社区', labelEn: 'Community',
      hasDropdown: false,
      route: 'square',
    },
    { key: 'dashboard', label: '我的 DOAI', labelEn: 'My DOAI', hasDropdown: false },
  ];


  // Which nav section each module page belongs to, for active-state highlighting.
  const MODULE_PARENT: Record<string, string> = {
    vision: 'conference',
    venue: 'conference',
    industry: 'maker',
    creator: 'maker',
    cards: 'square',
  };

  // 中 / EN language toggle (site i18n). Many marketing pages remain zh-first,
  // but the switch drives every view that consumes the translation table.
  const LangToggle: React.FC = () => (
    <button
      type="button"
      onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
      aria-label={lang === 'zh' ? 'Switch to English' : '切换为中文'}
      className="flex items-center h-9 px-2.5 rounded-full border border-[#E3ECFA] text-[12px] font-bold text-[#48597A] hover:text-[#165DFF] hover:border-[#A9CCFF] transition-colors"
    >
      <span className={lang === 'zh' ? 'text-[#165DFF]' : ''}>{lang === 'zh' ? '中' : 'ZH'}</span>
      <span className="mx-1 text-[#C0CBDD]">/</span>
      <span className={lang === 'zh' ? '' : 'text-[#165DFF]'}>EN</span>
    </button>
  );

  // Resolve which top-level nav item should light up for the current route.
  // Sub-routes stay under their parent; detail routes map to their section;
  // the agenda page is the landing page of 活动体验.
  const activeNavKey = (route: string): string => {
    const parts = String(route || 'home').split('/');
    let base = parts[0];
    if (base === 'detail') {
      base =
        { team: 'square', enterprise: 'maker', recruit: 'square', talent: 'square', schedule: 'conference', project: 'maker', forum: 'conference' }[
          parts[1]
        ] || 'home';
    } else if (base === 'module') {
      // Each module page belongs to the nav section it was listed under.
      base = MODULE_PARENT[parts[1]] || 'home';
    } else if (base === 'rules' || base === 'register' || base === 'track') {
      // 报名页仍属「赛事中心」这一栏
      base = 'maker';
    } else if (base === 'news' || base === 'attend' || base === 'forum') {
      base = 'conference';
    }
    return base;
  };

  const currentNav = activeNavKey(activeRoute);
  // Rules/register are maker-section pages that keep the 赛事中心 tab lit up,
  // but they are NOT the maker route itself — clicking the tab from there must
  // return to the section, not just scroll in place.
  const isSectionRoot = currentNav === parseRoute(activeRoute).base;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#F0F2F5] transition-all">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 h-[72px] flex items-center justify-between">
          {/* Left Brand Logo */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                setActiveRoute('home');
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2.5 text-left focus:outline-none group"
              aria-label={lang === 'zh' ? 'DOAi 首页' : 'DOAi home'}
            >
              {/* 官方 Logo（用户提供的组合标 PNG，透明底，已裁掉四周透明边） */}
              <img
                src={officialLogo}
                alt="DOAI — Dobe Open AI Makers Conference"
                  className="h-[48px] lg:h-[60px] w-auto max-w-[96px] sm:max-w-none object-contain transition-opacity group-hover:opacity-70"
                draggable={false}
              />
            </button>
          </div>

          {/* Center Navigation Menu */}
          <nav className="hidden lg:flex items-center gap-7 text-[15px] font-medium text-[#333333]">
            {menuItems.map(item => {
              // A sub-route like "maker/industry" should still light up "maker",
              // and a detail route lights up the section it belongs to.
              const isActive = currentNav === item.key;
              return (
                <div
                  key={item.key}
                  className="relative py-6"
                  onMouseEnter={() => item.hasDropdown && setActiveDropdown(item.key)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button
                    onClick={() => {
                      const target = item.route || item.key;
                      if (!item.hasDropdown) {
                        setActiveRoute(target);
                        return;
                      }
                      // A section button should land on the section itself, at
                      // the top — not deep-jump to its first sub-item, which
                      // reads as "nothing happened". On a member page of the
                      // section (e.g. /rules) it must still switch route even
                      // though the tab is already highlighted.
                      if (isActive && isSectionRoot) {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else {
                        setActiveRoute(target);
                      }
                    }}
                    className={`flex items-center gap-1 transition-colors hover:text-[#165DFF] focus:outline-none ${
                      isActive ? 'text-[#165DFF] font-semibold' : 'text-[#333333]'
                    }`}
                  >
                    <span>{lang === 'en' && item.labelEn ? item.labelEn : item.label}</span>
                    {item.hasDropdown && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#999999] transition-transform duration-200 ${
                          activeDropdown === item.key ? 'rotate-180 text-[#165DFF]' : ''
                        }`}
                      />
                    )}
                  </button>

                  {/* Active Blue Bottom Underline Indicator (exact screenshot style) */}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#165DFF] rounded-t-full" />
                  )}

                  {/* Dropdown Menu */}
                  {item.hasDropdown && activeDropdown === item.key && item.children && (
                    <div className="absolute top-[64px] left-1/2 -translate-x-1/2 w-48 bg-white border border-[#E8EAED] rounded-2xl shadow-floating p-2 z-50 animate-in fade-in duration-100">
                      {item.children.map((child, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => {
                            setActiveRoute(child.route);
                            setActiveDropdown(null);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-medium text-[#444444] hover:text-[#165DFF] hover:bg-[#F7F8FA] rounded-xl transition-colors"
                        >
                          {lang === 'en' && child.labelEn ? child.labelEn : child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Right controls — language toggle + notifications.
              Sign-in and the register CTA live inside their own sections now
              (我的 DOAI handles auth, 大会报名 / 赛事报名 handle sign-up). */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:block"><LangToggle /></div>
            <button
              type="button"
              onClick={() => setNotificationDrawerOpen(true)}
              aria-label={lang === 'zh' ? '通知' : 'Notifications'}
              title={lang === 'zh' ? '通知' : 'Notifications'}
              className="relative w-9 h-9 flex items-center justify-center text-[#555555] hover:text-[#165DFF] hover:bg-[#F2F7FF] rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#165DFF]"
            >
              <Bell className="w-4 h-4" />
              {currentUser && unreadCount > 0 && <span className="absolute top-0 right-0 min-w-4 h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] leading-4 font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>

            {/* 账号入口（会议结论）：登录态点头像跳「我的 DOAI」；未登录显示登录按钮 */}
            {currentUser ? (
              <div ref={accountMenuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setAccountMenuOpen(open => !open)}
                aria-label={lang === 'zh' ? '账户菜单' : 'Account menu'}
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                title={currentUser.name}
                className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#E3ECFA] hover:border-[#A9CCFF] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#165DFF] shrink-0"
              >
                <Avatar
                  src={currentUser.avatar}
                  name={currentUser.name}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </button>
              {accountMenuOpen && <div role="menu" className="absolute right-0 top-12 z-[60] w-44 rounded-2xl border border-[#E3ECFA] bg-white p-1.5 shadow-[0_16px_40px_rgba(11,27,58,0.15)]">
                <div className="px-3 py-2 text-xs font-semibold text-[#0B1B3A] truncate border-b border-[#EFF2F7] mb-1">{currentUser.name}</div>
                <button role="menuitem" type="button" onClick={() => { setActiveRoute('dashboard/settings'); setAccountMenuOpen(false); setMobileMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-[#333] rounded-xl hover:bg-[#F2F7FF] hover:text-[#165DFF]"><UserIcon className="w-4 h-4" />{lang === 'zh' ? '个人信息' : 'Profile'}</button>
                {canManageRegistrations(currentUser) && <button role="menuitem" type="button" onClick={() => { setActiveRoute('admin'); setAccountMenuOpen(false); setMobileMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-[#333] rounded-xl hover:bg-[#F2F7FF] hover:text-[#165DFF]"><ShieldCheck className="w-4 h-4" />{lang === 'zh' ? '运营管理' : 'Administration'}</button>}
                <button role="menuitem" type="button" onClick={() => { setAccountMenuOpen(false); void logout(); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-red-600 rounded-xl hover:bg-red-50"><LogOut className="w-4 h-4" />{lang === 'zh' ? '退出登录' : 'Sign out'}</button>
              </div>}
              </div>
            ) : authLoading ? <div className="w-9 h-9 shrink-0" /> : (
              <button
                type="button"
                onClick={() => setLoginModalOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#165DFF] hover:bg-[#1453E6] rounded-full transition-colors shrink-0"
              >
                {lang === 'zh' ? '登录' : 'Sign in'}
              </button>
            )}

            <CommunityQrCode lang={lang} />

            {/* Mobile menu trigger — the desktop nav is hidden below lg, so
                without this there is no site navigation on phones at all. */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(v => !v)}
              aria-expanded={mobileMenuOpen}
              aria-controls="doai-mobile-menu"
              aria-label={mobileMenuOpen ? (lang === 'zh' ? '关闭菜单' : 'Close menu') : (lang === 'zh' ? '打开菜单' : 'Open menu')}
              className="lg:hidden ml-1 w-10 h-10 -mr-1 rounded-xl flex items-center justify-center text-[#0B1B3A] hover:bg-[#F2F7FF] active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#165DFF]"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- Mobile navigation panel ---------------- */}
      {mobileMenuOpen && (
        <>
          {/* Scrim closes the panel on an outside tap. */}
          <div
            className="fixed inset-0 top-[72px] z-40 bg-[#0B1B3A]/25 backdrop-blur-[2px] lg:hidden animate-in fade-in duration-150"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <nav
            id="doai-mobile-menu"
            aria-label={lang === 'zh' ? '移动端导航' : 'Mobile navigation'}
            className="fixed left-0 right-0 top-[72px] z-40 max-h-[calc(100vh-72px)] overflow-y-auto bg-white border-b border-[#E3ECFA] shadow-[0_20px_50px_rgba(11,27,58,0.12)] lg:hidden animate-in slide-in-from-top-2 duration-200"
          >
            <div className="px-5 py-4 divide-y divide-[#EFF5FF]">
              {menuItems.map(item => {
                const active = currentNav === item.key;
                return (
                  <div key={item.key} className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (item.hasDropdown) {
                          // Always expand first — a single tap must never
                          // navigate away, or the sub-items are unreachable
                          // on touch. A second tap navigates to the section.
                          if (activeDropdown !== item.key) {
                            setActiveDropdown(item.key);
                          } else {
                            setActiveRoute(item.route || item.key);
                            setActiveDropdown(null);
                            setMobileMenuOpen(false);
                          }
                        } else {
                          setActiveRoute(item.route || item.key);
                          setMobileMenuOpen(false);
                        }
                      }}
                      aria-expanded={item.hasDropdown ? activeDropdown === item.key : undefined}
                      className={`w-full flex items-center justify-between py-3 text-left text-[15px] font-semibold transition-colors ${
                        active ? 'text-[#165DFF]' : 'text-[#0B1B3A]'
                      }`}
                    >
                      <span>{lang === 'en' && item.labelEn ? item.labelEn : item.label}</span>
                      {item.hasDropdown && (
                        <ChevronDown
                          className={`w-4 h-4 text-[#98A6BE] transition-transform duration-200 ${
                            activeDropdown === item.key ? 'rotate-180 text-[#165DFF]' : ''
                          }`}
                        />
                      )}
                    </button>

                    {item.hasDropdown && activeDropdown === item.key && item.children && (
                      <div className="pb-2 pl-3 space-y-1 animate-in slide-in-from-top-1 duration-150">
                        {item.children.map((child, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setActiveRoute(child.route);
                              setActiveDropdown(null);
                              setMobileMenuOpen(false);
                            }}
                            className="block w-full text-left px-3 py-2.5 text-[14px] text-[#48597A] hover:text-[#165DFF] rounded-lg hover:bg-[#F2F7FF] transition-colors min-h-[44px] flex items-center"
                          >
                            {lang === 'en' && child.labelEn ? child.labelEn : child.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Language switch sits at the bottom for thumb reach; the
                  register CTAs now live inside their own sections. */}
              <div className="pt-4 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#0B1B3A]">{lang === 'en' ? 'Language' : '语言 / Language'}</span>
                  <LangToggle />
                </div>
              </div>
            </div>
          </nav>
        </>
      )}

    </>
  );
};
