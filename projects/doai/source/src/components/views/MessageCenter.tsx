/**
 * 铃铛通知：站内通知的统一收件箱。
 *
 * 同步范围（2026-10-19 会议确认）：
 *   赛事审核（报名回执 / 入围结果）· 组队动态（收到申请可确认/拒绝、申请结果）
 *   论坛票务核销（预约成功 / 凭证 / 现场核销）· 名片与关注 · 官方公告与全员站内信
 * 组队申请类通知内嵌「确认加入 / 婉拒」按钮，处理后与「我的战队」数据同步。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { apiBase } from '../../lib/api';
import { normalizeRoute } from '../../lib/routes';
import { NotificationItem } from '../../types';
import {
  Award,
  Users,
  Ticket,
  CreditCard,
  Megaphone,
  Video,
  CheckCheck,
  RefreshCw,
  Check,
  X,
  ChevronRight,
  Inbox,
} from 'lucide-react';

type FilterKey = 'all' | 'review' | 'team' | 'forum' | 'card' | 'community' | 'system';

const TYPE_META: Record<NotificationItem['type'], { label: string; color: string; bg: string; icon: React.FC<{ className?: string }> }> = {
  review: { label: '赛事审核', color: '#165DFF', bg: 'bg-[#165DFF]/10', icon: Award },
  team: { label: '组队', color: '#722ED1', bg: 'bg-[#722ED1]/10', icon: Users },
  forum: { label: '票务核销', color: '#00B487', bg: 'bg-[#00B487]/10', icon: Ticket },
  card: { label: '名片', color: '#FF8A1F', bg: 'bg-[#FF8A1F]/10', icon: CreditCard },
  community: { label: '招募', color: '#165DFF', bg: 'bg-[#165DFF]/10', icon: Users },
  system: { label: '公告', color: '#48597A', bg: 'bg-[#F0F2F5]', icon: Megaphone },
  live: { label: '直播', color: '#FF4D4F', bg: 'bg-[#FF4D4F]/10', icon: Video },
};

export const MessageCenter: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const {
    currentUser,
    notifications,
    notificationsLoading,
    notificationsError,
    reloadNotifications,
    reloadRecruitments,
    reloadTickets,
    markNotificationRead,
    markAllNotificationsRead,
    handleTeamApplicationAction,
    setActiveRoute,
    tr,
  } = useApp();
  const me = currentUser;
  const [filter, setFilter] = useState<FilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [flash, setFlash] = useState('');
  const [flashFailed, setFlashFailed] = useState(false);
  const [busyApp, setBusyApp] = useState<string | null>(null);
  const actionPending = useRef(false);
  const [reading, setReading] = useState(false);
  const readingRef = useRef(false);
  const refreshingRef = useRef(false);
  const revisionRef = useRef(0);
  const accountRef = useRef(me?.id);
  accountRef.current = me?.id;
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    setFlash(''); setBusyApp(null); setReading(false); setRefreshing(false);
    actionPending.current = false; readingRef.current = false; refreshingRef.current = false;
    return () => { mountedRef.current = false; ++revisionRef.current; };
  }, [me?.id]);
  useEffect(() => {
    if (!flash || flashFailed) return;
    const timer = window.setTimeout(() => setFlash(''), 3000);
    return () => window.clearTimeout(timer);
  }, [flash, flashFailed]);

  /* 只显示与当前用户相关的通知：本人专属 + 全员公告（旧数据缺省视为公告） */
  const mine = useMemo(
    () => notifications.filter(n => !n.toUserId || n.toUserId === 'all' || n.toUserId === me?.id),
    [notifications, me?.id],
  );
  const unread = mine.filter(n => !n.read).length;

  const shown = useMemo(
    () =>
      mine.filter(n => {
        if (filter === 'all') return true;
        if (filter === 'system') return n.type === 'system' || n.type === 'live';
        return n.type === filter;
      }),
    [mine, filter],
  );

  const refresh = () => {
    if (!me || refreshingRef.current || readingRef.current) return;
    const uid = me.id, revision = ++revisionRef.current;
    const isCurrent = () => mountedRef.current && accountRef.current === uid && revisionRef.current === revision;
    refreshingRef.current = true;
    setRefreshing(true);
    setFlash('');
    reloadNotifications()
      .then(ok => { if (!ok) throw new Error('Notifications unavailable'); })
      .catch(() => { if (isCurrent()) { setFlashFailed(true); setFlash(tr('消息刷新失败，请重试。', 'Messages could not be refreshed. Please retry.')); } })
      .finally(() => { if (isCurrent()) { refreshingRef.current = false; setRefreshing(false); } });
  };

  const handleRead = async (id?: string) => {
    if (!me || notificationsLoading || notificationsError || actionPending.current || readingRef.current || refreshingRef.current) return;
    readingRef.current = true;
    const uid = me.id, revision = ++revisionRef.current;
    setReading(true);
    const ok = id ? await markNotificationRead(id) : await markAllNotificationsRead();
    if (mountedRef.current && accountRef.current === uid && revisionRef.current === revision) {
      if (!ok) { setFlashFailed(true); setFlash(tr('已读状态未保存，请重试。', 'Read status was not saved. Please retry.')); }
      else setFlash('');
      setReading(false);
      readingRef.current = false;
    }
  };

  const handleAction = async (n: NotificationItem, action: 'accept' | 'decline') => {
    if (!n.applicationId || actionPending.current || readingRef.current || refreshingRef.current) return;
    actionPending.current = true;
    const uid = me?.id, revision = ++revisionRef.current;
    setBusyApp(n.applicationId);
    const d = await handleTeamApplicationAction(n.applicationId, action, n.applicationKind);
    if (!mountedRef.current || accountRef.current !== uid || revisionRef.current !== revision) return;
    setFlashFailed(!d.ok);
    setFlash(d.ok ? (action === 'accept' ? tr('已确认加入，对方已收到通知', 'Accepted. The applicant has been notified.') : tr('已婉拒该申请', 'Application declined.')) : d.message || tr('操作失败', 'Action failed'));
    setBusyApp(null);
    actionPending.current = false;
  };

  const openNotice = (n: NotificationItem) => {
    if (!n.read) void handleRead(n.id);
    if (n.link) {
      const route = normalizeRoute(n.link, apiBase);
      if (route.startsWith('detail/recruit/')) void reloadRecruitments();
      if (route === 'dashboard' || route.startsWith('dashboard/passport')) void reloadTickets();
      setActiveRoute(n.link);
      onNavigate?.();
    }
  };

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: tr('全部', 'All') },
    { key: 'review', label: tr('赛事审核', 'Review') },
    { key: 'team', label: tr('组队', 'Team') },
    { key: 'forum', label: tr('票务核销', 'Tickets') },
    { key: 'card', label: tr('名片', 'Cards') },
    { key: 'community', label: tr('招募', 'Recruiting') },
    { key: 'system', label: tr('公告', 'Notices') },
  ];

  return (
    <div className="space-y-5">
      {/* 头部：统计 + 操作 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[#888888] mt-0.5">
            {notificationsLoading ? tr('正在读取消息…', 'Loading messages…') : notificationsError ? tr('消息暂不可用', 'Messages unavailable') : tr(`共 ${mine.length} 条消息，${unread} 条未读`, `${mine.length} messages, ${unread} unread`)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={refreshing || notificationsLoading || reading || busyApp !== null || !me}
            className="px-4 py-2 text-xs font-semibold text-[#666666] hover:text-[#0B1B3A] bg-white border border-[#E8EAED] rounded-full transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {tr('刷新', 'Refresh')}
          </button>
          <button
            onClick={() => void handleRead()}
            disabled={unread === 0 || reading || refreshing || busyApp !== null || notificationsLoading || notificationsError}
            className="px-4 py-2 text-xs font-semibold text-[#165DFF] hover:bg-[#165DFF]/5 border border-[#165DFF]/40 rounded-full transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            {tr('当前消息全部已读', 'Mark current messages read')}
          </button>
        </div>
      </div>
      <p className="text-[11px] text-[#888888]">{tr('仅标记当前已加载的消息，新到消息不受影响。', 'Only loaded messages are marked read. New arrivals stay unread.')}</p>

      {flash && (
        <div role="status" className={`p-3 rounded-xl text-xs font-medium ${flashFailed ? 'bg-red-50 text-red-600' : 'bg-[#00C48C]/10 text-[#00876A]'}`}>{flash}</div>
      )}

      {/* 分类筛选 */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === f.key
                ? 'bg-[#165DFF] text-white'
                : 'bg-white text-[#666666] border border-[#E8EAED] hover:text-[#0B1B3A]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 通知列表 */}
      {notificationsLoading ? (
        <p role="status" className="py-8 text-center text-sm text-[#6B7C9B]">{tr('正在读取消息…', 'Loading messages…')}</p>
      ) : !me ? <p className="py-8 text-center text-sm text-[#6B7C9B]">{tr('登录后查看通知', 'Sign in to view notifications')}</p> : notificationsError ? (
        <div role="status" className="doa-panel p-6 text-center space-y-3"><p className="text-sm text-[#6B7C9B]">{tr('消息暂时无法加载，请重试。', 'Messages could not be loaded. Please retry.')}</p><button type="button" onClick={refresh} className="doa-btn doa-btn-secondary">{tr('重新加载消息', 'Reload messages')}</button></div>
      ) : shown.length === 0 ? (
        <div className="doa-card p-8 text-center">
          <Inbox className="w-10 h-10 text-[#C0CBDD] mx-auto mb-3" />
          <p className="text-sm text-[#98A6BE]">{tr('该分类下暂无消息', 'Nothing here yet')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map(n => {
            const meta = TYPE_META[n.type] || TYPE_META.system;
            const Icon = meta.icon;
            const actionable =
              n.type === 'team' && !!n.applicationId && !n.handled && n.applicationStatus !== 'accepted' && n.applicationStatus !== 'declined';
            const handledLabel =
              n.applicationStatus === 'accepted' ? tr('已确认加入', 'Accepted') : n.applicationStatus === 'declined' ? tr('已婉拒', 'Declined') : '';
            return (
              <div
                key={n.id}
                className={`doa-card p-4 flex gap-3 transition-colors ${!n.read ? 'border-l-[3px] border-l-[#165DFF]' : 'border-l-[3px] border-l-transparent opacity-80'}`}
              >
                <span className={`w-10 h-10 rounded-xl ${meta.bg} shrink-0 flex items-center justify-center`} style={{ color: meta.color }}>
                  <Icon className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <h4 className={`text-sm break-words text-[#0B1B3A] ${n.read ? 'font-semibold' : 'font-bold'}`}>
                      {!n.read && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#165DFF] mr-1.5 align-middle" aria-label="未读" />}
                      {tr(n.title, n.titleEn ?? n.title)}
                    </h4>
                    <span className="text-[11px] text-[#98A6BE] font-mono shrink-0">{n.time}</span>
                  </div>
                  <p className="text-xs break-words text-[#666666] leading-relaxed mt-1">{tr(n.content, n.contentEn ?? n.content)}</p>

                  {/* 组队申请：消息中心内直接确认 / 拒绝 */}
                  {actionable && (
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <button
                        onClick={() => handleAction(n, 'accept')}
                        disabled={busyApp !== null || reading || refreshing}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-[#00C48C] hover:bg-[#009B71] rounded-full transition-colors disabled:opacity-40 flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {tr('确认加入', 'Accept')}
                      </button>
                      <button
                        onClick={() => handleAction(n, 'decline')}
                        disabled={busyApp !== null || reading || refreshing}
                        className="px-4 py-1.5 text-xs font-semibold text-[#666666] bg-white border border-[#E8EAED] hover:text-red-500 hover:border-red-200 rounded-full transition-colors disabled:opacity-40 flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        {tr('婉拒', 'Decline')}
                      </button>
                      <span className="text-[11px] text-[#98A6BE]">{tr('处理后申请人将收到结果通知', 'The applicant will be notified')}</span>
                    </div>
                  )}
                  {handledLabel && (
                    <span
                      className={`inline-block mt-2 px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        n.applicationStatus === 'accepted' ? 'text-[#00876A] bg-[#00C48C]/10' : 'text-[#888888] bg-[#F0F2F5]'
                      }`}
                    >
                      {handledLabel}
                    </span>
                  )}

                  {!n.read && !n.link && (
                    <button
                      onClick={() => void handleRead(n.id)}
                      disabled={reading || refreshing || busyApp !== null || notificationsLoading || notificationsError}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#165DFF] hover:underline disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {tr('标为已读', 'Mark as read')}
                    </button>
                  )}
                  {n.link && (
                    <button
                      onClick={() => openNotice(n)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#165DFF] hover:underline"
                    >
                      {tr('查看详情', 'View')}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
