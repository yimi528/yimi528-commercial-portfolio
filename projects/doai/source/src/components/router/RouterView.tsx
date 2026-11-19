import { canManageRegistrations, registrationAccessKey } from '../../lib/registrationChannel.ts';
/**
 * Route table + resolution helpers.
 *
 * Routes are plain strings so they can travel through the existing context
 * (`setActiveRoute`). A route is either a top-level view or a scoped sub-route
 * written as `parent/child` (e.g. `maker/industry`), which lets the navbar
 * deep-link into a specific tab of a page.
 */
import React, { lazy, Suspense, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { HomeView } from '../views/HomeView';
const ConferenceView = lazy(() => import('../views/ConferenceView').then(module => ({ default: module.ConferenceView })));
const PartnerView = lazy(() => import('../views/PartnerView').then(module => ({ default: module.PartnerView })));
const TrackDetailView = lazy(() => import('../views/TrackDetailView').then(module => ({ default: module.TrackDetailView })));
const MakerView = lazy(() => import('../views/MakerView').then(module => ({ default: module.MakerView })));
const RegisterView = lazy(() => import('../views/RegisterView').then(module => ({ default: module.RegisterView })));
const SquareView = lazy(() => import('../views/SquareView').then(module => ({ default: module.SquareView })));
const ForumView = lazy(() => import('../views/ForumView').then(module => ({ default: module.ForumView })));
const DashboardView = lazy(() => import('../views/DashboardView').then(module => ({ default: module.DashboardView })));
const AdminView = lazy(() => import('../views/AdminView').then(module => ({ default: module.AdminView })));
const ForumDetailView = lazy(() => import('../views/ForumDetailView').then(module => ({ default: module.ForumDetailView })));
const RecruitDetailView = lazy(() => import('../views/RecruitDetailView').then(module => ({ default: module.RecruitDetailView })));
const ProjectDetailView = lazy(() => import('../views/ProjectDetailView').then(module => ({ default: module.ProjectDetailView })));
const ScheduleDetailView = lazy(() => import('../views/ScheduleDetailView').then(module => ({ default: module.ScheduleDetailView })));
const ModuleView = lazy(() => import('../detail/ModuleView').then(module => ({ default: module.ModuleView })));
const NewsView = lazy(() => import('../detail/NewsView').then(module => ({ default: module.NewsView })));
const AttendView = lazy(() => import('../detail/AttendView').then(module => ({ default: module.AttendView })));
const EnterpriseCaseView = lazy(() => import('../views/EnterpriseCaseView').then(module => ({ default: module.EnterpriseCaseView })));
const TeamDetailView = lazy(() => import('../views/TeamDetailView').then(module => ({ default: module.TeamDetailView })));
const ShowcaseView = lazy(() => import('../views/ShowcaseView').then(module => ({ default: module.ShowcaseView })));

/** The top-level segments that map to a full page. */
export const TOP_LEVEL = [
  'home',
  'conference',
  'maker',
  'register',
  'square',
  'forum',
  'live',
  'dashboard',
  'admin',
] as const;

export type TopLevel = (typeof TOP_LEVEL)[number];

/** Split "maker/industry" into ["maker", "industry"]. */
export function parseRoute(route: string): { base: string; sub: string | null } {
  const [base, ...rest] = String(route || 'home').split('/');
  return { base: base || 'home', sub: rest.length ? rest.join('/') : null };
}

/** Which top-level nav item should light up for a given route. */
export function navKeyForRoute(route: string): string {
  return parseRoute(route).base;
}

/** Human title for a route, used by the detail pages' back links and <title>. */
export function routeTitle(route: string, lang: 'zh' | 'en' = 'zh'): string {
  const zh: Record<string, string> = {
    home: '首页',
    conference: '大会介绍',
    maker: '赛事中心',
    register: '项目申报',
    showcase: '项目展示',
    attend: '报名参会',
    tickets: '报名参会',
    track: '赛道详情',
    square: '创客社区',
    forum: 'DOAI Forum',
    live: '直播中心',
    dashboard: '我的 DOAI',
    admin: '运营管理',
  };
  const en: Record<string, string> = {
    home: 'Home',
    conference: 'Conference',
    maker: 'Contest',
    register: 'Submit Project',
    showcase: 'Project Showcase',
    attend: 'Attend',
    tickets: 'Attend',
    track: 'Track',
    square: 'Community',
    forum: 'DOAI Forum',
    live: 'Live',
    dashboard: 'My DOAI',
    admin: 'Admin',
  };
  const table = lang === 'en' ? en : zh;
  return table[parseRoute(route).base] || 'DOAI 2026';
}

const HiddenLiveRedirect: React.FC = () => {
  const { setActiveRoute } = useApp();
  useEffect(() => setActiveRoute('home'), [setActiveRoute]);
  return <HomeView />;
};

/**
 * 「赛题与赛制」已并入 FDE / 自由创意各自的赛道详情。
 * 旧链接与外部收藏的 /rules 落到赛事中心，由用户选择赛道进入，
 * 而不是留一个空页或 404。
 */
const LegacyRulesRedirect: React.FC = () => {
  const { setActiveRoute } = useApp();
  useEffect(() => setActiveRoute('maker/tracks'), [setActiveRoute]);
  return <MakerView scrollTo="tracks" />;
};

const RouterContent: React.FC = () => {
  const { activeRoute, currentUser, authLoading, lang, registrationDraftEpoch } = useApp();
  const { base, sub } = parseRoute(activeRoute);

  // Navbar sub-modules each get their own page: module/<id>
  // 第三段是可选的楼层深链（如 module/venue/4f），交给页面自己落到对应楼层。
  if (base === 'module') {
    const [, id, anchor] = String(activeRoute).split('/');
    return <ModuleView id={id} sub={anchor} />;
  }

  // Standalone module pages modelled on the GOAI reference site.
  if (base === 'rules') return <LegacyRulesRedirect />;
  if (base === 'news') return <NewsView />;
  if (base === 'attend' || base === 'tickets') return <AttendView />;
  if (base === 'showcase') return <ShowcaseView />;

  // 赛道详情页（参考 GOAI：申报赛道 → 赛道详情 → 报名）
  if (base === 'track') return <TrackDetailView key={sub} track={sub ?? undefined} />;

  // Detail routes are encoded as `detail/<kind>/<id>`.
  if (base === 'detail') {
    const [, kind, id] = String(activeRoute).split('/');
    switch (kind) {
      case 'enterprise':
        return <EnterpriseCaseView />;
      case 'team':
        return <TeamDetailView key={id} id={id} />;
      case 'forum':
        return <ForumDetailView id={id} />;
      case 'recruit':
        return <RecruitDetailView id={id} />;
      case 'project':
        return <ProjectDetailView id={id} />;
      case 'schedule':
        return <ScheduleDetailView id={id} />;
      default:
        return <HomeView />;
    }
  }

  switch (base) {
    case 'conference':
      // conference/schedule → 落地后滚到日程区块（场地页的「回看两天日程」）
      return <ConferenceView scrollTo={sub} />;
    case 'partner':
      return <PartnerView />;
    case 'maker':
      // maker/tracks → 赛事总览并定位到五大赛道设置
      return <MakerView scrollTo={sub} />;
    case 'register':
      return <RegisterView key={registrationDraftEpoch} />;
    case 'square':
      return <SquareView />;
    case 'forum':
      return <ForumView />;
    case 'live':
      return <HiddenLiveRedirect />;
    case 'dashboard':
      return <DashboardView key={currentUser?.id || 'anonymous'} />;
    case 'admin':
      return authLoading ? <div className="p-24">{lang === 'zh' ? '正在确认权限…' : 'Checking permissions…'}</div> : canManageRegistrations(currentUser) ? <Suspense fallback={<div className="p-24">{lang === 'zh' ? '正在加载…' : 'Loading…'}</div>}><AdminView key={`${currentUser.id}:${registrationAccessKey(currentUser)}`} /></Suspense> : <div className="p-24">{lang === 'zh' ? '此页面需要 DOAI 管理员权限。' : 'This page requires DOAI admin access.'}</div>;
    case 'home':
    default:
      return <HomeView />;
  }
};

/**
 * 页面级错误边界：任何视图在渲染期抛错时只让这一块降级成可读提示，
 * 导航栏与页脚仍然可用，用户不会对着白屏无路可走。
 * 报名子路由共用实例以保留草稿；错误状态仍随完整路由重置。
 */
export const RouterView: React.FC = () => {
  const { activeRoute, lang } = useApp();
  const boundaryKey = parseRoute(activeRoute).base === 'register' ? 'register' : activeRoute;
  return (
    <ErrorBoundary key={boundaryKey} resetKey={activeRoute} label={routeTitle(activeRoute, lang)} lang={lang}>
      <RouterContent />
    </ErrorBoundary>
  );
};
