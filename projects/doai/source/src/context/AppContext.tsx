import { canManageRegistrations, registrationAccessKey, validRegistrationChannel } from '../lib/registrationChannel.ts';
import React, { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react';
import { AUTH_CHANGE_EVENT, actorSnapshot, authSessionEpoch, beginAuthTransition, bindDoaiActor, currentAuthToken, explicitlySignedOut, announceAuthChange, identityProofFor, type IdentityProof, ANONYMOUS_ACTOR, PENDING_ACTOR } from '../lib/authSession';
import { normalizeCMSConfig, readCMSResponse } from '../lib/cmsConfig';
import { readBrowserValue, writeBrowserValue } from '../lib/browserStorage';
import { ApiError, apiRequest } from '../lib/api';
import { getAtomclubUser, logoutAtomclub, syncAtomclubProfile, toDoaiUser, hasPendingAtomclubLogin, confirmAtomclubLogin } from '../lib/atomclubAuth';
import {
  Language,
  User,
  DigitalTicket,
  Registration,
  RecruitmentPost,
  TalentProfile,
  ForumSession,
  NotificationItem,
  CMSData,
  ExchangeCard,
  TrackType
} from '../types';
import { translations } from '../utils/i18n';
import { loadPublishedForums } from '../lib/forumCatalogueApi';
import { contestBriefs } from '../data/community';
import { useRemoteList } from '../lib/useRemoteList';
import { readCardExchange, loadExchangeCards, loadNotifications, saveNotificationReads } from '../lib/socialApi';
import { loadRegistrations, newestRegistrationFirst } from '../lib/registrationApi';
import { saveRegistration, type RegistrationReceipt, type RegistrationDraft } from '../lib/registrationRequest';
import { loadRecruitments, loadTalents, newestRecruitmentFirst, validRecruitment } from '../lib/communityApi';
import { normalizeRoute } from '../lib/routes';
import { forumRules } from '../lib/forumSchedule';
import { loadForumStatistics } from '../lib/forumStatsApi';
import { loadForumBookmarks, saveForumBookmark, newestBookmarkFirst, type ForumBookmark } from '../lib/forumBookmarksApi';
import { validAttendanceTicket } from '../lib/attendanceApi';
import { savePrivacySettings, type PrivacySettings } from '../lib/profileApi';
import { checkinCode, type CheckinRecord } from '../lib/checkinApi';

interface AppContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof translations['zh'];
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  authLoading: boolean;
  registrationDraftEpoch: number;
  refreshAtomclubUser: () => Promise<void>;
  syncAtomclubUser: () => Promise<void>;
  logout: () => Promise<void>;
  activeRoute: string;
  setActiveRoute: (route: string) => void;
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  notificationDrawerOpen: boolean;
  setNotificationDrawerOpen: (open: boolean) => void;
  policyModalOpen: boolean;
  setPolicyModalOpen: (open: boolean) => void;
  policyType: 'terms' | 'privacy' | 'rules';
  openPolicy: (type: 'terms' | 'privacy' | 'rules') => void;
  registrations: Registration[];
  registrationsLoading: boolean;
  registrationsError: boolean;
  reloadRegistrations: () => Promise<boolean>;
  setRegistrations: React.Dispatch<React.SetStateAction<Registration[]>>;
  recruitments: RecruitmentPost[];
  recruitmentsLoading: boolean;
  recruitmentsError: boolean;
  recruitmentLikePending: string[];
  recruitmentApplyPending: string[];
  recruitmentRevision: number;
  talents: TalentProfile[];
  forums: ForumSession[];
  forumsLoading: boolean;
  forumsError: boolean;
  reloadForums: () => Promise<boolean>;
  forumBookmarks: ForumBookmark[];
  forumBookmarksLoading: boolean;
  forumBookmarksError: boolean;
  forumBookmarkPending: string[];
  reloadForumBookmarks: () => Promise<boolean>;
  setForumBookmark: (id: string, saved: boolean) => Promise<{ ok: boolean; message?: string }>;
  forumStatsLoading: boolean;
  forumStatsError: boolean;
  reloadForumStats: () => Promise<boolean>;
  tickets: DigitalTicket[];
  ticketsLoading: boolean;
  ticketsError: boolean;
  reloadTickets: () => Promise<void>;
  forumPending: string[];
  issueAttendanceTicket: (ticket: Omit<DigitalTicket, 'id' | 'qrCode'> & { bookingKey: string }) => Promise<DigitalTicket>;
  setTickets: React.Dispatch<React.SetStateAction<DigitalTicket[]>>;
  notifications: NotificationItem[];
  notificationsLoading: boolean;
  notificationsError: boolean;
  reloadNotifications: () => Promise<boolean>;
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  cmsData: CMSData;
  cmsLoading: boolean;
  cmsPublished: boolean;
  cmsLoadError: boolean;
  reloadCMS: () => Promise<boolean>;
  updateCMSData: (data: Partial<CMSData>) => Promise<{ ok: boolean; message?: string }>;
  exchangedCards: ExchangeCard[];
  cardsLoading: boolean;
  cardsError: boolean;
  reloadCards: () => Promise<boolean>;
  addExchangedCard: (card: ExchangeCard) => void;
  exchangeCardWith: (user: { id: string; name: string; roleTitle?: string; avatar?: string; skills?: string[]; city?: string }) => Promise<{ ok: boolean; message?: string }>;
  pushNotification: (n: { type: NotificationItem['type']; title: string; content: string; toUserId?: string; applicationId?: string; link?: string }) => void;
  handleTeamApplicationAction: (applicationId: string, action: 'accept' | 'decline', kind?: 'application' | 'invitation') => Promise<{ ok: boolean; message?: string }>;
  teamRevision: number;
  notifyTeamChanged: () => void;
  unreadCount: number;
  markAllNotificationsRead: () => Promise<boolean>;
  markNotificationRead: (id: string) => Promise<boolean>;
  submitRegistration: (data: RegistrationDraft) => Promise<RegistrationReceipt>;
  updateRegistrationStatus: (id: string, status: Registration['status'], feedback?: string) => Promise<{ ok: boolean; message?: string }>;
  submitWork: (id: string, submission: { videoUrl: string; demoUrl: string; githubUrl: string; docUrl?: string }) => Promise<void>;
  toggleLikeRecruit: (id: string, liked?: boolean) => Promise<boolean>;
  toggleLikeTalent: (id: string) => void;
  reloadRecruitments: () => Promise<boolean>;
  publishRecruitment: (input: {
    title: string;
    summary: string;
    track: TrackType;
    stage: 'idea' | 'prototype' | 'demo';
    city: string;
    neededRoles: string[];
    skills: string[];
    isRemote: boolean;
  }) => Promise<{ ok: boolean; message?: string }>;
  applyToRecruitment: (id: string, message: string) => Promise<{ ok: boolean; message?: string }>;
  delistRecruitment: (id: string) => Promise<{ ok: boolean; message?: string }>;
  bookForum: (id: string) => Promise<boolean>;
  cancelForum: (id: string) => Promise<boolean>;
  saveProfile: (patch: Partial<PrivacySettings>) => Promise<void>;
  profileBusy: boolean;
  tr: (zh: string, en?: string) => string;
  checkInTicket: (ticketId: string) => Promise<CheckinRecord>;
}

// Figures follow the official plan (《对外招商方案》2026.10):
// 1000+ 全球开发者、20—30 个入围项目、各赛道最佳创客奖 18,888 元、投资机构与评委 12—20 家。
const registrationDeadline = contestBriefs[0].deadline.slice(5).replace('-', '/');
const initialCMS: CMSData = {
  stats: {
    makers: 1000,
    finalistProjects: 30,
    prizePool: '最佳创客奖 ¥18,888',
    prizePoolEn: 'Best Maker ¥18,888',
    judges: 20,
  },
  announcement: `DOAI · Dobe AI 全球创客大会报名进行中，${registrationDeadline} 截止；12/6 乐动虹桥决赛路演。`,
  announcementEn: `DOAI registration is open and closes ${registrationDeadline}; finals on 12/6 at LeDong Hongqiao.`,
  streamUrl: '',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    return readBrowserValue('doai_lang') === 'en' ? 'en' : 'zh';
  });

  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authReadError, setAuthReadError] = useState(false);
  const authVersion = React.useRef(0);
  const registrationDraftEpoch = React.useRef(0);
  const logoutRequest = React.useRef<Promise<void> | null>(null);
  const profileRequests = React.useRef(new Set<string>());
  const [profileBusyOwner, setProfileBusyOwner] = useState<string | null>(null);
  const beginProfileRequest = React.useCallback(() => {
    const key = `${accountVersion.current}:${accountIdRef.current || 'anonymous'}`;
    if (profileRequests.current.has(key)) throw new Error('资料正在读取或保存，请稍后重试');
    profileRequests.current.add(key); setProfileBusyOwner(key);
    return () => {
      profileRequests.current.delete(key);
      setProfileBusyOwner(previous => previous === key ? null : previous);
    };
  }, []);

  const setCurrentUser = React.useCallback((user: User | null) => {
    ++authVersion.current;
    setOperationError('');
    setAuthReadError(false);
    if (accountIdRef.current !== user?.id || accountRoleRef.current !== registrationAccessKey(user)) {
      if (accountIdRef.current && accountIdRef.current !== user?.id) { ++registrationDraftEpoch.current; setNotificationDrawerOpen(false); }
      accountIdRef.current = user?.id;
      accountRoleRef.current = registrationAccessKey(user);
      ++accountVersion.current;
      registrationList.reset();
      recruitmentList.reset();
      talentList.reset();
      setRecruitmentLikePending([]);
      setRecruitmentApplyPending([]);
      ++ticketRequestId.current;
      ticketChanges.current.clear();
      setTickets([]);
      notificationList.reset();
      cardList.reset();
      bookmarkList.reset();
      setForumBookmarkPending([]);
      setForumPending([]);
    }
    setCurrentUserState(user);
    setAuthLoading(false);
  }, []);
  const refreshAtomclubUser = React.useCallback(async () => {
    if (logoutRequest.current) { await logoutRequest.current; return; }
    const finish = beginProfileRequest();
    const version = ++authVersion.current;
    setAuthLoading(true);
    try {
      const user = await (hasPendingAtomclubLogin() ? confirmAtomclubLogin() : getAtomclubUser());
      if (version === authVersion.current) {
        const fresh = toDoaiUser(user);
        if (accountIdRef.current && accountIdRef.current !== fresh.id) beginAuthTransition('recheck');
        setCurrentUserState(fresh);
        setAuthReadError(false);
      }
    } catch (error) {
      if (version === authVersion.current && error instanceof ApiError && error.status === 401) {
        setCurrentUser(null); setNotificationDrawerOpen(false); setLoginModalOpen(true);
        setOperationError('登录已过期，请重新登录后继续。');
      }
      if (version === authVersion.current && !(error instanceof ApiError && error.status === 401)) setAuthReadError(true);
      throw error;
    } finally {
      finish();
      if (version === authVersion.current) setAuthLoading(false);
    }
  }, []);
  const syncAtomclubUser = async () => {
    const uid = currentUser?.id;
    if (!uid) { setLoginModalOpen(true); return; }
    if (logoutRequest.current) { await logoutRequest.current; return; }
    const finish = beginProfileRequest();
    const version = ++authVersion.current;
    try {
      const user = await syncAtomclubProfile(uid);
      if (version === authVersion.current && accountIdRef.current === uid) setCurrentUserState(previous => ({ ...toDoaiUser(user), registrationChannelsEnabled: previous?.id === uid && previous.registrationChannelsEnabled === true }));
    } catch (error) {
      if (version === authVersion.current && error instanceof ApiError && error.status === 401) {
        setCurrentUser(null); setNotificationDrawerOpen(false); setLoginModalOpen(true);
        setOperationError('登录已过期，请重新登录后继续。');
      }
      throw error;
    } finally { finish(); }
  };
  useEffect(() => {
    if (explicitlySignedOut()) {
      setAuthLoading(false);
      setOperationError(sessionLanguage.current === 'en'
        ? 'Your previous sign-out was not confirmed. Retry sign-out when connected.'
        : '上次退出尚未确认，请在网络恢复后重试退出。');
      return;
    }
    if (hasPendingAtomclubLogin()) { setAuthReadError(true); setAuthLoading(false); return; }
    const version = ++authVersion.current;
    getAtomclubUser().then(user => {
      if (version === authVersion.current) { setCurrentUserState(toDoaiUser(user)); setAuthLoading(false); }
    }).catch(error => {
      if (version === authVersion.current) { setCurrentUserState(null); setAuthReadError(!(error instanceof ApiError && error.status === 401)); }
    }).finally(() => {
      if (version === authVersion.current) setAuthLoading(false);
    });
    return () => { if (version === authVersion.current) ++authVersion.current; };
  }, []);
  const logout = (): Promise<void> => {
    if (logoutRequest.current) return logoutRequest.current;
    setCurrentUser(null);
    setNotifications([]); setExchangedCards([]); setNotificationDrawerOpen(false); setLoginModalOpen(false); setActiveRoute('home');
    const version = authVersion.current;
    const request = (async () => {
      try { await logoutAtomclub(); }
      catch {
        if (authVersion.current === version) setOperationError(sessionLanguage.current === 'en'
          ? 'Signed out on this page. Server session cleanup was not confirmed; check again when the connection is restored.'
          : '已退出当前页面；服务器会话清理未确认，请在网络恢复后再次确认。');
      }
    })();
    logoutRequest.current = request;
    void request.finally(() => { if (logoutRequest.current === request) logoutRequest.current = null; });
    return request;
  };

  // ---- URL 路由同步：/admin、/forum 等直链可直接打开对应页面 ----
  // 部署在子路径（如 /doai/）时，前端路由需要带上该前缀
  const BASE_PATH = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const KNOWN_ROUTE_BASES = [
    'home', 'conference', 'maker', 'register', 'square', 'forum', 'live',
    'dashboard', 'admin', 'rules', 'news', 'attend', 'tickets', 'showcase', 'track', 'module', 'detail', 'partner',
  ];
  const routeFromLocation = (): string => {
    if (typeof window === 'undefined') return 'home';
    let p = window.location.pathname.replace(/\/+$/, '') || '/';
    if (BASE_PATH !== '/' && p.startsWith(BASE_PATH)) p = p.slice(BASE_PATH.length) || '/';
    if (p === '/') return 'home';
    const base = p.slice(1).split('/')[0];
    return KNOWN_ROUTE_BASES.includes(base) ? normalizeRoute(p.slice(1)) : 'home';
  };
  const [activeRoute, setActiveRouteState] = useState<string>(routeFromLocation);
  const setActiveRoute = (route: string) => {
    route = normalizeRoute(route, BASE_PATH);
    const reselecting = activeRoute === route;
    setActiveRouteState(route);
    if (typeof window === 'undefined') return;
    const path = (route === 'home' ? '' : `/${route}`) || '';
    const full = (BASE_PATH === '/' ? '' : BASE_PATH) + (route === 'home' ? '/' : path);
    if (window.location.pathname !== full) {
      window.history.pushState({}, '', full);
    }
    if (reselecting) {
      const [base, sub] = route.split('/');
      const anchor = sub && (base === 'maker' || base === 'conference') ? document.getElementById(`${base}-${sub}`) : null;
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      if (anchor) anchor.scrollIntoView({ behavior, block: 'start' });
      else window.scrollTo({ top: 0, behavior });
    }
  };
  useEffect(() => {
    const onPop = () => setActiveRouteState(routeFromLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policyType, setPolicyType] = useState<'terms' | 'privacy' | 'rules'>('terms');


  const [operationError, setOperationError] = useState('');
  const reportError = (e: unknown) => setOperationError(e instanceof Error ? e.message : '操作失败，请重试');
  const accountIdRef = React.useRef(currentUser?.id);
  const accountRoleRef = React.useRef(registrationAccessKey(currentUser));
  const accountVersion = React.useRef(0);
  if (accountIdRef.current !== currentUser?.id || accountRoleRef.current !== registrationAccessKey(currentUser)) {
    if (accountIdRef.current && accountIdRef.current !== currentUser?.id) ++registrationDraftEpoch.current;
    accountIdRef.current = currentUser?.id;
    accountRoleRef.current = registrationAccessKey(currentUser);
    ++accountVersion.current;
  }
  const resourceOwner = currentUser ? `${accountVersion.current}:${currentUser.id}` : null;
  const profileBusy = Boolean(resourceOwner && profileBusyOwner === resourceOwner);
  const registrationList = useRemoteList(resourceOwner, loadRegistrations, newestRegistrationFirst);
  const { items: registrations, setItems: setRegistrations, reload: reloadRegistrations } = registrationList;
  const registrationsLoading = authLoading || registrationList.loading;
  const registrationsError = registrationList.error;
  // 招募帖 / 达人名片 / 首页配置都来自主站 DoaiModule：招募帖与达人 GET 公开、
  // 写操作由会话推导身份；首页配置读公开、写仅限 DOAI 管理员白名单。
  const communityOwner = authLoading ? null : resourceOwner || 'public';
  const recruitmentList = useRemoteList(communityOwner, loadRecruitments, newestRecruitmentFirst);
  const { items: recruitments, setItems: setRecruitments } = recruitmentList;
  const [recruitmentRevision, setRecruitmentRevision] = useState(0);
  const reloadRecruitments = React.useCallback(() => {
    setRecruitmentRevision(prev => prev + 1);
    return recruitmentList.reload();
  }, [recruitmentList.reload]);
  const recruitmentsLoading = authLoading || recruitmentList.loading;
  const recruitmentsError = recruitmentList.error;
  const talentList = useRemoteList(communityOwner, loadTalents);
  const { items: talents, setItems: setTalents } = talentList;
  const [recruitmentLikePending, setRecruitmentLikePending] = useState<string[]>([]);
  const [recruitmentApplyPending, setRecruitmentApplyPending] = useState<string[]>([]);
  const communityRequests = React.useRef(new Map<string, Promise<{ ok: boolean; message?: string }>>());
  const forumCatalogue = useRemoteList('doai-2026-forums', loadPublishedForums);
  const { reload: reloadForums, loading: forumsLoading, error: forumsError } = forumCatalogue;
  useEffect(() => {
    const refresh = () => { void reloadForums(); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [reloadForums]);
  const fetchBookmarks = React.useCallback(async () => {
    const uid = currentUser?.id || '', version = accountVersion.current, session = authVersion.current;
    try { return await loadForumBookmarks(uid); }
    catch (error) {
      if (accountIdRef.current === uid && accountVersion.current === version && authVersion.current === session && error instanceof ApiError && (error.status === 401 || error.code === 'SESSION_CHANGED')) {
        setCurrentUser(null); setNotificationDrawerOpen(false); setLoginModalOpen(true);
        setOperationError('登录状态已变化，请重新登录后继续。');
      }
      throw error;
    }
  }, [currentUser?.id]);
  const bookmarkList = useRemoteList(resourceOwner, fetchBookmarks, newestBookmarkFirst);
  const { items: forumBookmarks, reload: reloadForumBookmarks } = bookmarkList;
  const forumBookmarksLoading = authLoading || bookmarkList.loading;
  const forumBookmarksError = bookmarkList.error;
  const [forumBookmarkPending, setForumBookmarkPending] = useState<string[]>([]);
  const bookmarkRequests = React.useRef(new Map<string, Promise<{ ok: boolean; message?: string }>>());
  useEffect(() => { setForumBookmarkPending([]); }, [resourceOwner]);
  const forumStats = useRemoteList('doai-2026-forum-statistics', loadForumStatistics);
  const reloadForumStats = forumStats.reload;
  const forumStatsLoading = forumStats.loading;
  const forumStatsError = forumStats.error || (!forumStats.loading && forumCatalogue.items.some(f => !forumStats.items.some(row => row.id === f.id)));

  const [tickets, setTickets] = useState<DigitalTicket[]>([]);
  const forums = forumCatalogue.items.map(forum => ({ ...forum, isBooked: tickets.some(t => t.type === 'forum' && t.bookingKey === `forum:${forum.id}` && ['claimed', 'checked_in'].includes(t.status)), bookedCount: forumStats.items.find(row => row.id === forum.id)?.bookedCount ?? 0, checkedInCount: forumStats.items.find(row => row.id === forum.id)?.checkedInCount ?? 0 }));
  const [ticketLoad, setTicketLoad] = useState<{ userId: string | null; status: 'loading' | 'ready' | 'error' }>({ userId: null, status: 'ready' });
  const ticketRequestId = React.useRef(0);
  const ticketRevision = React.useRef(0);
  const ticketChanges = React.useRef(new Map<string, { revision: number; ticket: DigitalTicket | null }>());
  const rememberTicketChange = (id: string, ticket: DigitalTicket | null) => {
    ticketChanges.current.set(id, { revision: ++ticketRevision.current, ticket });
  };
  const ticketsLoading = authLoading || Boolean(currentUser && (ticketLoad.userId !== currentUser.id || ticketLoad.status === 'loading'));
  const ticketsError = ticketLoad.userId === currentUser?.id && ticketLoad.status === 'error';
  const [forumPending, setForumPending] = useState<string[]>([]);
  const forumRequests = React.useRef(new Map<string, Promise<boolean>>());
  const reloadTickets = React.useCallback(async () => {
    const uid = currentUser?.id;
    const requestId = ++ticketRequestId.current;
    if (!uid) return;
    const version = accountVersion.current;
    const revision = ticketRevision.current;
    const isCurrent = () => accountIdRef.current === uid && accountVersion.current === version && ticketRequestId.current === requestId;
    setTicketLoad({ userId: uid, status: 'loading' });
    try {
      const data = await apiRequest<{ tickets: DigitalTicket[] }>('/api/tickets');
      if (!Array.isArray(data.tickets)) throw new Error('Invalid tickets response');
      if (!isCurrent()) return;
      // A list requested before a successful issue/cancellation must retain that
      // mutation, while still restoring the user's other existing passes.
      const merged = new Map(data.tickets.map(ticket => [ticket.id, ticket]));
      for (const [id, change] of ticketChanges.current) {
        if (change.revision <= revision) continue;
        if (change.ticket) merged.set(id, change.ticket);
        else merged.delete(id);
      }
      const rows = [...merged.values()];
      setTickets(rows);
      setTicketLoad({ userId: uid, status: 'ready' });
    } catch {
      if (isCurrent()) setTicketLoad({ userId: uid, status: 'error' });
    }
  }, [currentUser?.id, currentUser?.role]);
  const notificationList = useRemoteList(resourceOwner, loadNotifications);
  const { items: notifications, setItems: setNotifications, reload: reloadNotifications } = notificationList;
  const notificationsLoading = authLoading || notificationList.loading;
  const notificationsError = notificationList.error;
  // initialCMS 只作兜底：后端还没有写过配置时保持官方口径，不显示空白指标。
  const [cmsData, setCmsData] = useState<CMSData>(initialCMS);
  const [cmsLoading, setCmsLoading] = useState(true);
  const [cmsPublished, setCmsPublished] = useState(false);
  const [cmsLoadError, setCmsLoadError] = useState(false);
  const cmsRequest = React.useRef(0);
  const cmsVersion = React.useRef<string | null>(null);
  const reloadCMS = React.useCallback(async () => {
    const request = ++cmsRequest.current;
    setCmsLoading(true);
    setCmsLoadError(false);
    try {
      const result = readCMSResponse(await apiRequest<unknown>('/api/site-config'));
      if (request !== cmsRequest.current) return false;
      cmsVersion.current = result.updatedAt;
      setCmsData(result.config || initialCMS);
      setCmsPublished(result.config !== null);
      return true;
    } catch {
      if (request === cmsRequest.current) setCmsLoadError(true);
      return false;
    } finally { if (request === cmsRequest.current) setCmsLoading(false); }
  }, []);
  const cardList = useRemoteList(resourceOwner, loadExchangeCards);
  const { items: exchangedCards, setItems: setExchangedCards, reload: reloadCards, loading: cardsLoading, error: cardsError } = cardList;
  const exchangeRequests = React.useRef(new Map<string, Promise<{ ok: boolean; message?: string }>>());
  const applicationRequests = React.useRef(new Map<string, Promise<{ ok: boolean; message?: string }>>());
  const [teamRevision, setTeamRevision] = useState(0);
  const notifyTeamChanged = React.useCallback(() => setTeamRevision(prev => prev + 1), []);

  useEffect(() => { void reloadCMS(); }, [reloadCMS]);
  useEffect(() => { setRecruitmentLikePending([]); setRecruitmentApplyPending([]); }, [communityOwner]);

  const setLang = (newLang: Language) => {
    const next = newLang === 'en' ? 'en' : 'zh';
    setLangState(next);
    writeBrowserValue('doai_lang', next);
  };

  useEffect(() => { document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'; }, [lang]);

  const openPolicy = (type: 'terms' | 'privacy' | 'rules') => {
    setPolicyType(type);
    setPolicyModalOpen(true);
  };

  const updateCMSData = async (data: Partial<CMSData>) => {
    if (currentUser?.role !== 'admin') return { ok: false, message: '需要管理员权限' };
    if (cmsLoading || cmsLoadError) return { ok: false, message: '请先成功读取当前配置，再保存修改' };
    const uid = currentUser.id, version = accountVersion.current;
    // 首页配置写接口只允许 DOAI_ADMIN_USER_IDS 白名单；成功落库后才更新界面，
    // 失败必须把原因交回调用方，不能再「本地改完就当已发布」。
    const merged: CMSData = {
      ...cmsData,
      ...data,
      stats: { ...cmsData.stats, ...(data.stats || {}) },
    };
    try {
      const submitted = normalizeCMSConfig(merged);
      const expectedUpdatedAt = cmsVersion.current;
      const result = readCMSResponse(await apiRequest<unknown>('/api/site-config', { config: submitted, expectedUpdatedAt }));
      if (!result.config || JSON.stringify(result.config) !== JSON.stringify(submitted)) throw new Error('配置保存结果未确认，请重新读取后重试');
      if (expectedUpdatedAt && Date.parse(result.updatedAt!) <= Date.parse(expectedUpdatedAt)) throw new Error('配置保存版本未更新，请重新读取后重试');
      if (accountIdRef.current !== uid || accountVersion.current !== version) return { ok: false, message: '账号已切换，请重新操作' };
      if (cmsVersion.current && Date.parse(cmsVersion.current) > Date.parse(result.updatedAt!)) return { ok: false, message: '配置已被更新，请重新读取当前内容' };
      ++cmsRequest.current;
      cmsVersion.current = result.updatedAt;
      setCmsData(result.config);
      setCmsPublished(true);
      setCmsLoading(false);
      setCmsLoadError(false);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : '保存失败，请重试' };
    }
  };

  const addExchangedCard = (card: ExchangeCard) => {
    setExchangedCards(prev => [card, ...prev]);
  };

  /* ---- 消息中心 / 名片社交：站内通知写入（后端落库 + 本地即时插入） ---- */
  const pushNotification = async (n: { type: NotificationItem['type']; title: string; content: string; toUserId?: string; applicationId?: string; link?: string }) => {
    if (currentUser?.role !== 'admin') return;
    const uid = currentUser.id, version = accountVersion.current;
    try {
      const result = await apiRequest<{ notification: NotificationItem }>('/api/notifications', {
        to: n.toUserId ?? uid, type: n.type, title: n.title, content: n.content, applicationId: n.applicationId, link: n.link,
      });
      if (!result.notification?.id) throw new Error('通知未发送，请重试');
      if (accountIdRef.current === uid && accountVersion.current === version) setNotifications(prev => [result.notification, ...prev.filter(item => item.id !== result.notification.id)]);
    } catch (error) { if (accountIdRef.current === uid && accountVersion.current === version) reportError(error); }
  };

  /* 名片交换（双向）：我换对方 → 双方名片盒各存一张，对方收到站内通知 */
  const exchangeCardWith = (user: { id: string; name: string; roleTitle?: string; avatar?: string; skills?: string[]; city?: string }): Promise<{ ok: boolean; message?: string }> => {
    if (!currentUser) return Promise.resolve({ ok: false, message: '请先登录' });
    const uid = currentUser.id, version = accountVersion.current;
    const key = `${version}:${uid}:${user.id}`;
    const existing = exchangeRequests.current.get(key);
    if (existing) return existing;
    const request = (async () => {
      try {
        const data = await apiRequest<{ ok: boolean; exchange: { id: string; to: Record<string, unknown>; at: string; direction?: 'in' | 'out' } }>('/api/cards', { toUserId: user.id });
        if (accountIdRef.current !== uid || accountVersion.current !== version) return { ok: false, message: '账号已切换' };
        const card = readCardExchange(data, uid, user.id);
        setExchangedCards(prev => [card, ...prev.filter(item => item.id !== card.id)]);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : '交换失败，请重试' };
      } finally { exchangeRequests.current.delete(key); }
    })();
    exchangeRequests.current.set(key, request);
    return request;
  };

  /* 消息中心内直接确认 / 拒绝组队申请（单段别名端点） */
  const handleTeamApplicationAction = (applicationId: string, action: 'accept' | 'decline', kind: 'application' | 'invitation' = 'application'): Promise<{ ok: boolean; message?: string }> => {
    if (!currentUser) return Promise.resolve({ ok: false, message: '请先登录' });
    const uid = currentUser.id, version = accountVersion.current;
    const key = `${version}:${uid}:${kind}:${applicationId}`;
    const existing = applicationRequests.current.get(key);
    if (existing) return existing;
    const request = (async () => {
      try {
        const result = await apiRequest<{ ok: boolean }>(kind === 'invitation' ? '/api/team-invitation-action' : '/api/team-application-action', { id: applicationId, action });
        if (result.ok !== true) throw new Error('操作未完成，请重试');
        if (accountIdRef.current !== uid || accountVersion.current !== version) return { ok: false, message: '账号已切换' };
        setNotifications(prev => prev.map(n => n.applicationId === applicationId
          ? { ...n, handled: true, applicationStatus: action === 'accept' ? 'accepted' : 'declined' } : n));
        setTeamRevision(prev => prev + 1);
        return { ok: true };
      } catch (error) { return { ok: false, message: error instanceof Error ? error.message : '操作失败，请重试' }; }
      finally { applicationRequests.current.delete(key); }
    })();
    applicationRequests.current.set(key, request);
    return request;
  };

  /* 登录态 / 身份切换：仅加载接口返回的个人数据。 */
  useEffect(() => {
    const uid = currentUser?.id;
    setTickets([]);
    ticketChanges.current.clear();
    setForumPending([]);
    if (!uid) {
      ++ticketRequestId.current;
      setTicketLoad({ userId: null, status: 'ready' });
      return;
    }
    void reloadTickets();
  }, [currentUser?.id, reloadTickets]);

  const isMyNotification = (n: NotificationItem) => !n.toUserId || n.toUserId === 'all' || n.toUserId === currentUser?.id;
  const unreadCount = notifications.filter(n => isMyNotification(n) && !n.read).length;

  const markAllNotificationsRead = async () => {
    if (!currentUser) return false;
    const uid = currentUser.id, version = accountVersion.current;
    const ids = notifications.filter(n => isMyNotification(n) && !n.read).map(n => n.id);
    try {
      const confirmed = new Set(await saveNotificationReads(uid, ids));
      if (accountIdRef.current !== uid || accountVersion.current !== version) return false;
      setNotifications(prev => prev.map(n => confirmed.has(n.id) ? { ...n, read: true } : n));
      return true;
    } catch (error) { if (accountIdRef.current === uid && accountVersion.current === version) reportError(error); return false; }
  };

  const markNotificationRead = async (id: string) => {
    if (!currentUser) return false;
    const uid = currentUser.id, version = accountVersion.current;
    try {
      const confirmed = new Set(await saveNotificationReads(uid!, [id]));
      if (accountIdRef.current !== uid || accountVersion.current !== version) return false;
      setNotifications(prev => prev.map(n => confirmed.has(n.id) ? { ...n, read: true } : n));
      return true;
    } catch (error) { if (accountIdRef.current === uid && accountVersion.current === version) reportError(error); return false; }
  };


  const submitWork = async (id: string, submission: { videoUrl: string; demoUrl: string; githubUrl: string; docUrl?: string }) => {
    const uid = currentUser?.id, version = accountVersion.current;
    const result = await apiRequest<{ submission: Registration['submission'] }>('/api/registration-work', { id, ...submission });
    if (!result.submission?.videoUrl || (['videoUrl', 'demoUrl', 'githubUrl', 'docUrl'] as const).some(key => (result.submission?.[key] ?? '') !== (submission[key] ?? ''))) throw new Error('作品链接保存未确认，请保留内容后重试');
    if (accountIdRef.current !== uid || accountVersion.current !== version) throw new Error('账号已切换，请重新操作');
    setRegistrations(prev => prev.map(r => r.id === id ? { ...r, submission: result.submission } : r));
  };

  const submitRegistration = async (data: RegistrationDraft) => {
    const uid = currentUser?.id, version = accountVersion.current;
    if (!uid) throw new Error('请先登录');
    const result = await saveRegistration(data, uid, () => accountIdRef.current === uid && accountVersion.current === version);
    if (accountIdRef.current !== uid || accountVersion.current !== version) throw new Error('账号已切换，请重新操作');
    if (accountIdRef.current === uid) {
      if (result.registration.teamId) setTeamRevision(prev => prev + 1);
      rememberTicketChange(result.ticket.id, result.ticket);
      setRegistrations(prev => [result.registration, ...prev.filter(item => item.id !== result.registration.id)]);
      setTickets(prev => [result.ticket, ...prev.filter(item => item.id !== result.ticket.id)]);
    }
    return result;
  };

  const updateRegistrationStatus = async (id: string, status: Registration['status'], feedback?: string) => {
    if (!canManageRegistrations(currentUser)) return { ok: false, message: '需要管理员权限' };
    const uid = currentUser.id, version = accountVersion.current;
    try {
      const result = await apiRequest<{ registration: Registration }>('/api/registration-status', { id, status, feedback });
      if (result.registration?.id !== id || result.registration.status !== status) throw new Error('审核结果未保存，请重试');
      if (accountIdRef.current !== uid || accountVersion.current !== version) return { ok: false, message: '账号已切换' };
      setRegistrations(prev => prev.map(item => item.id === id ? result.registration : item));
      return { ok: true };
    } catch (error) { return { ok: false, message: error instanceof Error ? error.message : '审核结果未保存，请重试' }; }
  };

  const runCommunityRequest = (kind: string, id: string, action: (isCurrent: () => boolean) => Promise<void>): Promise<{ ok: boolean; message?: string }> => {
    if (!currentUser) { setLoginModalOpen(true); return Promise.resolve({ ok: false, message: '请先登录' }); }
    const uid = currentUser.id, version = accountVersion.current;
    const key = `${version}:${uid}:${kind}:${id}`;
    const existing = communityRequests.current.get(key);
    if (existing) return existing;
    const isCurrent = () => accountIdRef.current === uid && accountVersion.current === version;
    if (kind === 'like') setRecruitmentLikePending(prev => [...prev, id]);
    if (kind === 'apply') setRecruitmentApplyPending(prev => [...prev, id]);
    const request = (async () => {
      try {
        await action(isCurrent);
        return isCurrent() ? { ok: true } : { ok: false, message: '账号已切换，请重新操作' };
      } catch (error) {
        if (isCurrent() && (kind === 'like' || kind === 'talent-like')) reportError(error);
        return { ok: false, message: error instanceof Error ? error.message : '操作失败，请重试' };
      } finally {
        communityRequests.current.delete(key);
        if (isCurrent()) {
          if (kind === 'like') setRecruitmentLikePending(prev => prev.filter(item => item !== id));
          if (kind === 'apply') setRecruitmentApplyPending(prev => prev.filter(item => item !== id));
        }
      }
    })();
    communityRequests.current.set(key, request);
    return request;
  };

  const toggleLikeRecruit = async (id: string, liked?: boolean) => (await runCommunityRequest('like', id, async isCurrent => {
    const result = await apiRequest<{ hasLiked: boolean; likes: number }>(`/api/recruitments/${encodeURIComponent(id)}/like`, { liked: liked ?? !recruitments.find(item => item.id === id)?.hasLiked });
    if (typeof result.hasLiked !== 'boolean' || !Number.isInteger(result.likes) || result.likes < 0) throw new Error('点赞结果未确认，请重试');
    if (isCurrent()) setRecruitments(prev => prev.map(item => item.id === id ? { ...item, hasLiked: result.hasLiked, likes: result.likes } : item));
    if (isCurrent() && !recruitments.some(item => item.id === id)) await recruitmentList.reload();
  })).ok;

  const toggleLikeTalent = (id: string) => {
    void runCommunityRequest('talent-like', id, async isCurrent => {
      const result = await apiRequest<{ hasLiked: boolean; likes: number }>(`/api/talents/${encodeURIComponent(id)}/like`, { liked: !talents.find(item => item.id === id)?.hasLiked });
      if (typeof result.hasLiked !== 'boolean' || !Number.isInteger(result.likes) || result.likes < 0) throw new Error('点赞结果未确认，请重试');
      if (isCurrent()) setTalents(prev => prev.map(item => item.id === id ? { ...item, hasLiked: result.hasLiked, likes: result.likes } : item));
    });
  };

  const publishRecruitment = (input: {
    title: string; summary: string; track: TrackType; stage: 'idea' | 'prototype' | 'demo';
    city: string; neededRoles: string[]; skills: string[]; isRemote: boolean;
  }) => runCommunityRequest('publish', '', async isCurrent => {
    const result = await apiRequest<{ recruitment: RecruitmentPost }>('/api/recruitments', input);
    if (!validRecruitment(result.recruitment)) throw new Error('发布结果未确认，请重试');
    if (isCurrent()) setRecruitments(prev => [result.recruitment, ...prev.filter(item => item.id !== result.recruitment.id)]);
  });

  const applyToRecruitment = (id: string, message: string) => runCommunityRequest('apply', id, async isCurrent => {
    const result = await apiRequest<{ hasApplied: boolean; applicationsCount: number; applicationStatus?: RecruitmentPost['applicationStatus'] }>(`/api/recruitments/${encodeURIComponent(id)}/apply`, { message });
    if (result.hasApplied !== true || !Number.isInteger(result.applicationsCount) || result.applicationsCount < 1) throw new Error('申请结果未确认，请重试');
    if (isCurrent()) setRecruitments(prev => prev.map(item => item.id === id ? { ...item, hasApplied: true, applicationStatus: result.applicationStatus || 'pending', applicationsCount: result.applicationsCount } : item));
    if (isCurrent() && !recruitments.some(item => item.id === id)) await recruitmentList.reload();
  });

  const delistRecruitment = (id: string) => runCommunityRequest('delete', id, async isCurrent => {
    const result = await apiRequest<{ ok: boolean }>(`/api/recruitments/${encodeURIComponent(id)}`, undefined, 'DELETE');
    if (result.ok !== true) throw new Error('下架未完成，请重试');
    if (isCurrent()) setRecruitments(prev => prev.filter(item => item.id !== id));
  });

  const setForumBookmark = (id: string, saved: boolean): Promise<{ ok: boolean; message?: string }> => {
    if (!currentUser) { setLoginModalOpen(true); return Promise.resolve({ ok: false, message: '请先登录' }); }
    const uid = currentUser.id, version = accountVersion.current, session = authVersion.current, key = `${version}:${uid}:${id}`;
    const existing = bookmarkRequests.current.get(key);
    if (existing) return existing;
    if (forumBookmarksLoading || forumBookmarksError) return Promise.resolve({ ok: false, message: '请先成功读取收藏，再重试' });
    const isCurrent = () => accountIdRef.current === uid && accountVersion.current === version;
    setForumBookmarkPending(previous => [...previous, id]);
    const request = (async () => {
      try {
        const bookmark = await saveForumBookmark(uid, id, saved);
        if (!isCurrent()) return { ok: false, message: '账号已切换' };
        bookmarkList.setItems(previous => bookmark ? [bookmark, ...previous.filter(row => row.id !== id)] : previous.filter(row => row.id !== id));
        return { ok: true };
      } catch (error) {
        if (isCurrent() && authVersion.current === session && error instanceof ApiError && error.status === 401) {
          setCurrentUser(null); setNotificationDrawerOpen(false); setLoginModalOpen(true);
          setOperationError('登录已过期，请重新登录后继续。');
        }
        return { ok: false, message: error instanceof Error ? error.message : '收藏未保存，请重试' };
      } finally {
        bookmarkRequests.current.delete(key);
        if (isCurrent()) setForumBookmarkPending(previous => previous.filter(value => value !== id));
      }
    })();
    bookmarkRequests.current.set(key, request); return request;
  };

  // One request per account and session, shared by list/detail booking buttons.
  const withForumRequest = (id: string, action: (isCurrent: () => boolean) => Promise<void>): Promise<boolean> => {
    if (authLoading) return Promise.resolve(false);
    if (!currentUser) { setLoginModalOpen(true); return Promise.resolve(false); }
    if (ticketsLoading || ticketsError) return Promise.resolve(false);
    const uid = currentUser.id, version = accountVersion.current;
    const key = `${version}:${uid}:${id}`;
    const existing = forumRequests.current.get(key);
    if (existing) return existing;
    const isCurrent = () => accountIdRef.current === uid && accountVersion.current === version;
    setForumPending(prev => [...prev, id]);
    const request = (async () => {
      try {
        await action(isCurrent);
        return isCurrent();
      } catch (error) {
        if (isCurrent()) reportError(error);
        return false;
      } finally {
        forumRequests.current.delete(key);
        if (isCurrent()) setForumPending(prev => prev.filter(item => item !== id));
      }
    })();
    forumRequests.current.set(key, request);
    return request;
  };

  const bookForum = (id: string): Promise<boolean> => withForumRequest(id, async isCurrent => {
    const session = forums.find(f => f.id === id);
    if (!session || session.isBooked) return;
    if (!forumRules(id, Date.now(), session)?.bookingOpen) throw new Error(lang === 'zh' ? '该分论坛已结束或尚未公布，不能预约。' : 'This forum has ended or is not yet announced.');
    const result = await apiRequest<{ ticket: DigitalTicket }>('/api/tickets', {
      type: 'forum', bookingKey: `forum:${id}`, title: session.title,
      titleEn: session.titleEn, sessionTime: `${session.date} ${session.time}`, venue: session.venue,
    });
    if (!result.ticket?.id || result.ticket.type !== 'forum' || result.ticket.bookingKey !== `forum:${id}`) {
      throw new Error(lang === 'zh' ? '预约凭证未生成，请重试' : 'No booking pass was issued. Please retry.');
    }
    void reloadForumStats();
    if (!isCurrent()) return;
    rememberTicketChange(result.ticket.id, result.ticket);
    setTickets(prev => [result.ticket, ...prev.filter(t => t.id !== result.ticket.id)]);
  });

  const cancelForum = (id: string): Promise<boolean> => withForumRequest(id, async isCurrent => {
    const ticket = tickets.find(t => t.type === 'forum' && t.bookingKey === `forum:${id}`);
    if (!ticket) throw new Error(lang === 'zh' ? '未找到预约凭证，请重新加载票据。' : 'Booking pass not found. Please reload your passes.');
    if (ticket.status !== 'claimed') throw new Error(lang === 'zh' ? '已核销或无效的凭证不能取消。' : 'Checked-in or invalid passes cannot be cancelled.');
    if (!forumRules(id, Date.now(), ticket)?.cancellationOpen) throw new Error(lang === 'zh' ? '已进入开场前 48 小时，不能自助取消，请联系组委会。' : 'Self-service cancellation closes 48 hours before the start. Contact the organisers.');
    const result = await apiRequest<{ ok: boolean }>(`/api/tickets/${encodeURIComponent(ticket.id)}`, undefined, 'DELETE');
    if (result.ok !== true) throw new Error(lang === 'zh' ? '取消预约未完成，请重试' : 'Cancellation failed. Please retry.');
    void reloadForumStats();
    if (!isCurrent()) return;
    rememberTicketChange(ticket.id, null);
    setTickets(prev => prev.filter(t => t.id !== ticket.id));
  });

  const issueAttendanceTicket = async (input: Omit<DigitalTicket, 'id' | 'qrCode'> & { bookingKey: string }) => {
    const uid = currentUser?.id, version = accountVersion.current;
    if (!uid) throw new Error(lang === 'zh' ? '请先登录' : 'Please sign in first');
    if (input.channel !== undefined && !validRegistrationChannel(input.channel)) throw new Error('请选择报名渠道');
    if (input.channel !== undefined) {
      const capabilities = await apiRequest<{ channelPolicy?: string }>('/api/doai/me');
      if (accountIdRef.current !== uid || accountVersion.current !== version) throw new Error('账号已切换，请重新报名');
      if (capabilities.channelPolicy !== 'scoped-v1') throw new Error('报名渠道服务尚未就绪，请保留资料后稍后重试');
    }
    const result = await apiRequest<{ ticket: DigitalTicket }>('/api/tickets', input);
    if (input.channel !== undefined && result.ticket?.channel !== input.channel) throw new Error('报名渠道保存未确认，请在我的凭证中核对');
    if (!validAttendanceTicket(result.ticket) || result.ticket.bookingKey !== input.bookingKey || (result.ticket.ownerUserId && result.ticket.ownerUserId !== uid)) throw new Error(lang === 'zh' ? '入场凭证未生成，请重试' : 'No entry pass was issued. Please retry.');
    if (accountIdRef.current !== uid || accountVersion.current !== version) throw new Error(lang === 'zh' ? '账号已切换，请重新报名' : 'Your account changed. Please register again.');
    rememberTicketChange(result.ticket.id, result.ticket);
    setTickets(prev => [result.ticket, ...prev.filter(ticket => ticket.id !== result.ticket.id)]);
    return result.ticket;
  };

  const checkinRequests = React.useRef(new Map<string, Promise<CheckinRecord>>());
  const checkInTicket = (ticketId: string): Promise<CheckinRecord> => {
    const uid = currentUser?.id, version = accountVersion.current;
    const ticket = tickets.find(item => item.id === ticketId);
    if (!uid || currentUser?.role !== 'admin' || !ticket) return Promise.reject(new Error('需要管理员权限及有效凭证'));
    const key = `${version}:${uid}:${ticketId}`;
    const pending = checkinRequests.current.get(key);
    if (pending) return pending;
    const isCurrent = () => accountIdRef.current === uid && accountVersion.current === version;
    const request = (async () => {
      try {
        const record = await checkinCode(ticket.qrCode, '主入口');
        void reloadForumStats();
        if (!isCurrent()) throw new Error('账号已切换，请重新读取凭证');
        const checked: DigitalTicket = { ...ticket, status: 'checked_in', checkedInAt: record.time };
        rememberTicketChange(ticketId, checked);
        setTickets(prev => prev.map(item => item.id === ticketId ? checked : item));
        void reloadNotifications();
        return record;
      } catch (error) {
        // A conflict does not prove this specific pass has been checked in.
        if (isCurrent() && error instanceof ApiError && error.status === 409) { void reloadTickets(); void reloadForumStats(); }
        throw error;
      } finally { checkinRequests.current.delete(key); }
    })();
    checkinRequests.current.set(key, request);
    return request;
  };

  const saveProfile = async (patch: Partial<PrivacySettings>): Promise<void> => {
    const uid = currentUser?.id, version = accountVersion.current;
    if (!uid) { setLoginModalOpen(true); throw new Error('请先登录'); }
    const finish = beginProfileRequest();
    const isCurrent = () => accountIdRef.current === uid && accountVersion.current === version;
    try {
      const saved = await savePrivacySettings(uid, patch);
      if (!isCurrent()) throw new Error('账号已切换，请重新读取隐私设置');
      setCurrentUserState(previous => previous ? { ...previous, ...saved, privacyReady: true } : previous);
    } catch (error) {
      if (isCurrent() && error instanceof ApiError && error.status === 401) {
        setCurrentUser(null); setNotificationDrawerOpen(false); setLoginModalOpen(true);
        setOperationError('登录已过期，请重新登录后继续。');
      }
      throw error;
    } finally { finish(); }
  };

  const verifiedIdentity = React.useRef<IdentityProof | undefined>(undefined);
  useLayoutEffect(() => {
    if (authLoading) { bindDoaiActor(PENDING_ACTOR); return; }
    if (!currentUser) { verifiedIdentity.current = undefined; bindDoaiActor(ANONYMOUS_ACTOR); return; }
    const proof = identityProofFor(currentUser);
    if (proof) verifiedIdentity.current = proof;
    if (verifiedIdentity.current?.actor === currentUser.id) bindDoaiActor(currentUser.id, verifiedIdentity.current.token);
    else bindDoaiActor(PENDING_ACTOR);
  }, [currentUser, authLoading, loginModalOpen]);
  const recovery = React.useRef<{ token: string | null; epoch: number } | null>(null);
  const currentUserRef = React.useRef(currentUser); currentUserRef.current = currentUser;
  const sessionLanguage = React.useRef(lang); sessionLanguage.current = lang;
  const authLoadingRef = React.useRef(authLoading); authLoadingRef.current = authLoading;
  const interactiveLogin = React.useRef(loginModalOpen); interactiveLogin.current = loginModalOpen;
  useEffect(() => {
    let alive = true, focusProbe = false;
    const recover = (kind: 'login' | 'logout' | 'recheck' | 'expired', remote: boolean, eventEpoch?: number) => {
      const token = currentAuthToken(), snapshot = actorSnapshot();
      if (remote && kind === 'logout' && token) kind = 'login';
      if (kind !== 'logout' && kind !== 'expired' && hasPendingAtomclubLogin()) {
        setCurrentUser(null); setAuthReadError(true); setAuthLoading(false); return;
      }
      if (kind === 'login' && recovery.current?.token === token && snapshot.actor === PENDING_ACTOR && (eventEpoch === undefined || eventEpoch === recovery.current.epoch)) return;
      if (remote && kind === 'login' && token && currentUserRef.current && snapshot.actor === currentUserRef.current.id && snapshot.token === token) return;
      if ((kind === 'logout' || kind === 'expired') && !currentUserRef.current && explicitlySignedOut() && !authLoadingRef.current) return;
      const epoch = eventEpoch ?? beginAuthTransition(kind);
      setCurrentUser(null); setNotificationDrawerOpen(false); setLoginModalOpen(kind === 'expired');
      logoutRequest.current = null;
      if (kind === 'logout' || kind === 'expired') {
        recovery.current = null; setAuthLoading(false);
        if (kind === 'expired') setOperationError(sessionLanguage.current === 'en' ? 'Your sign-in has expired. Please sign in again.' : '登录已过期，请重新登录后继续。');
        return;
      }
      setAuthLoading(true);
      const version = authVersion.current;
      recovery.current = { token, epoch };
      if (!remote) setOperationError(sessionLanguage.current === 'en' ? 'Your sign-in changed. Confirm the account before continuing.' : '登录状态已变化，请确认账号后继续。');
      getAtomclubUser().then(user => {
        if (!alive || authVersion.current !== version || authSessionEpoch() !== epoch) return;
        setCurrentUserState(toDoaiUser(user));
        setAuthReadError(false);
        setAuthLoading(false);
        if (kind === 'recheck' && !remote) announceAuthChange('login');
      }).catch(error => {
        if (!alive || authVersion.current !== version || authSessionEpoch() !== epoch) return;
        setCurrentUserState(null);
        setAuthReadError(!(error instanceof ApiError && (error.status === 401 || error.code === 'SESSION_CHANGED')));
        if (error instanceof ApiError && (error.status === 401 || error.code === 'SESSION_CHANGED')) setLoginModalOpen(true);
      }).finally(() => {
        if (recovery.current?.epoch === epoch) recovery.current = null;
        if (alive && authVersion.current === version && authSessionEpoch() === epoch) setAuthLoading(false);
      });
    };
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (typeof detail?.epoch === 'number' && detail.epoch !== authSessionEpoch()) return;
      if (detail && ['login','logout','recheck','expired'].includes(detail.kind)) recover(detail.kind, detail.remote === true, detail.epoch);
    };
    const onFocus = () => {
      if (hasPendingAtomclubLogin()) return;
      if (document.visibilityState === 'hidden' || authLoadingRef.current || interactiveLogin.current || recovery.current || focusProbe) return;
      const snapshot = actorSnapshot(), token = currentAuthToken();
      if (token !== snapshot.token) { recover(token ? 'login' : 'logout', true); return; }
      if (explicitlySignedOut()) return;
      const version = authVersion.current, epoch = authSessionEpoch();
      focusProbe = true;
      getAtomclubUser().then(user => {
        if (!alive || version !== authVersion.current || epoch !== authSessionEpoch()) return;
        const fresh = toDoaiUser(user), previous = currentUserRef.current;
        if (!previous || previous.id !== fresh.id) { beginAuthTransition('recheck'); setCurrentUser(fresh); }
        else if (registrationAccessKey(previous) !== registrationAccessKey(fresh) || previous.registrationChannelsEnabled !== fresh.registrationChannelsEnabled) {
          setCurrentUserState(value => value?.id === fresh.id ? { ...value, role: fresh.role, operatorChannel: fresh.operatorChannel, registrationChannelsEnabled: fresh.registrationChannelsEnabled } : value);
        }
      }).catch(error => {
        if (!alive || version !== authVersion.current || epoch !== authSessionEpoch()) return;
        if (error instanceof ApiError && error.status === 401 && currentUserRef.current) recover('expired', false);
        else if (error instanceof ApiError && error.code === 'SESSION_CHANGED') recover('recheck', false);
      }).finally(() => { focusProbe = false; });
    };
    window.addEventListener(AUTH_CHANGE_EVENT, onChange); window.addEventListener('focus', onFocus); document.addEventListener('visibilitychange', onFocus);
    return () => { alive = false; bindDoaiActor(null); window.removeEventListener(AUTH_CHANGE_EVENT, onChange); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus); };
  }, []);

  const tr = (zh: string, en?: string) => (lang === 'zh' ? zh : (en ?? zh));

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        t: translations[lang],
        currentUser,
        setCurrentUser,
        authLoading,
        registrationDraftEpoch: registrationDraftEpoch.current,
        refreshAtomclubUser,
        syncAtomclubUser,
        logout,
        activeRoute,
        setActiveRoute,
        loginModalOpen,
        setLoginModalOpen,
        notificationDrawerOpen,
        setNotificationDrawerOpen,
        policyModalOpen,
        setPolicyModalOpen,
        policyType,
        openPolicy,
        registrations,
        registrationsLoading,
        registrationsError,
        reloadRegistrations,
        setRegistrations,
        recruitments,
        recruitmentsLoading,
        recruitmentsError,
        recruitmentLikePending,
        recruitmentApplyPending,
        recruitmentRevision,
        talents,
        forums,
        forumsLoading,
        forumsError,
        reloadForums,
        forumBookmarks,
        forumBookmarksLoading,
        forumBookmarksError,
        forumBookmarkPending,
        reloadForumBookmarks,
        setForumBookmark,
        forumStatsLoading,
        forumStatsError,
        reloadForumStats,
        tickets,
        ticketsLoading,
        ticketsError,
        reloadTickets,
        forumPending,
        issueAttendanceTicket,
        setTickets,
        notifications,
        notificationsLoading,
        notificationsError,
        reloadNotifications,
        setNotifications,
        cmsData,
        cmsLoading,
        cmsPublished,
        cmsLoadError,
        reloadCMS,
        updateCMSData,
        exchangedCards,
        cardsLoading,
        cardsError,
        reloadCards,
        addExchangedCard,
        exchangeCardWith,
        pushNotification,
        handleTeamApplicationAction,
        teamRevision,
        notifyTeamChanged,
        unreadCount,
        markAllNotificationsRead,
        markNotificationRead,
        submitRegistration,
        updateRegistrationStatus,
        submitWork,
        toggleLikeRecruit,
        toggleLikeTalent,
        reloadRecruitments,
        publishRecruitment,
        applyToRecruitment,
        delistRecruitment,
        bookForum,
        cancelForum,
        saveProfile,
        profileBusy,
        tr,
        checkInTicket,
      }}
    >
      {authReadError && !operationError && <div role="alert" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] max-w-lg rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 shadow-lg">
        {tr('账号状态暂时无法确认，请重新读取账号。', 'Your account status could not be confirmed. Please retry.')}
        <button type="button" disabled={authLoading} onClick={() => void refreshAtomclubUser().catch(() => {})} className="ml-4 underline disabled:opacity-50">{authLoading ? tr('读取中…', 'Checking…') : tr('重新读取账号', 'Retry account confirmation')}</button>
      </div>}
      {operationError && <div role="alert" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] max-w-lg rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 shadow-lg">{operationError}{!currentUser && readBrowserValue('doai_logout_pending') === '1' && <button type="button" className="ml-4 underline" onClick={() => void logout()}>{tr('重试退出', 'Retry sign-out')}</button>}<button type="button" className="ml-4 underline" onClick={() => setOperationError('')}>{tr('关闭', 'Close')}</button></div>}
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
