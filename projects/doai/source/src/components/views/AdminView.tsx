import { registrationChannels, registrationChannelLabel, validRegistrationChannel } from '../../lib/registrationChannel.ts';
import { AdminAccountsPanel } from './AdminAccountsPanel';
import { ForumManagementPanel } from './ForumManagementPanel';
import { AttendanceReviewPanel } from './AttendanceReviewPanel';
import { BroadcastPanel } from './BroadcastPanel';
import { RecruitmentManagementPanel } from './RecruitmentManagementPanel';
import React, { useEffect, useState } from 'react';
import { CheckinPanel } from './CheckinPanel';
import { useApp } from '../../context/AppContext';
import { readEntrySummary, registrationTrack, registrationTrackLabel } from '../../lib/contestEntry';
import { registrationCSV, registrationMaterials, registrationContact, registrationContactSource, registrationApplicant } from '../../lib/registrationApi';
import {
  Layers,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Search,
  ExternalLink,
  Edit3,
  Sliders,
  ShieldAlert,
  Database,
  FileSpreadsheet,
  AlertCircle,
  LayoutDashboard,
  CalendarDays,
  Ticket,
  ShieldCheck,
  Settings2,
  Megaphone,
  ScanLine,
} from 'lucide-react';
import { Registration, RegistrationStatus } from '../../types';
import { formatPostDate } from '../../lib/time';

export const AdminView: React.FC = () => {
  const {
    updateRegistrationStatus,
    cmsData,
    cmsLoading,
    cmsLoadError,
    reloadCMS,
    updateCMSData,
    forums,
    currentUser,
    lang,
    setLoginModalOpen,
    tr,
  } = useApp();

  const { registrations: loadedRegistrations, registrationsLoading, registrationsError, reloadRegistrations } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState<
    'overview' | 'checkin' | 'submissions' | 'square' | 'forums' | 'tickets' | 'cms' | 'broadcast' | 'admins'
  >('overview');

  const isSuperAdmin = currentUser?.role === 'admin';
  const [channelFilter, setChannelFilter] = useState('all');
  const permittedRegistrations = loadedRegistrations.filter(row => isSuperAdmin || (currentUser?.role === 'channel_operator' && validRegistrationChannel(currentUser.operatorChannel) && row.channel === currentUser.operatorChannel));
  const registrations = permittedRegistrations.filter(row => channelFilter === 'all' || row.channel === channelFilter);

  // Submissions search & filter
  const [submissionFilter, setSubmissionFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected submission modal / detail
  const [selectedSub, setSelectedSub] = useState<Registration | null>(null);
  const [customFeedback, setCustomFeedback] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const reviewPending = React.useRef(false);
  const mounted = React.useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // CMS state form
  const [cmsMakers, setCmsMakers] = useState(cmsData.stats.makers);
  const [cmsFinalists, setCmsFinalists] = useState(cmsData.stats.finalistProjects);
  const [cmsPrize, setCmsPrize] = useState(cmsData.stats.prizePool);
  const [cmsPrizeEn, setCmsPrizeEn] = useState(cmsData.stats.prizePoolEn);
  const [cmsJudges, setCmsJudges] = useState(cmsData.stats.judges);
  const [cmsAnnouncement, setCmsAnnouncement] = useState(cmsData.announcement);
  const [cmsAnnouncementEn, setCmsAnnouncementEn] = useState(cmsData.announcementEn);
  const [cmsSaved, setCmsSaved] = useState(false);
  const [cmsSaving, setCmsSaving] = useState(false);
  const [cmsError, setCmsError] = useState('');
  const cmsDirty = React.useRef(false);
  const cmsPending = React.useRef(false);
  const [cmsDraftRevision, setCmsDraftRevision] = useState(0);
  useEffect(() => {
    if (cmsDirty.current || cmsLoading) return;
    setCmsMakers(cmsData.stats.makers); setCmsFinalists(cmsData.stats.finalistProjects);
    setCmsPrize(cmsData.stats.prizePool); setCmsPrizeEn(cmsData.stats.prizePoolEn); setCmsJudges(cmsData.stats.judges);
    setCmsAnnouncement(cmsData.announcement); setCmsAnnouncementEn(cmsData.announcementEn);
  }, [cmsData, cmsLoading, cmsDraftRevision]);
  const reloadCMSDraft = async () => {
    if (cmsPending.current) return;
    const ok = await reloadCMS();
    if (ok && mounted.current) {
      cmsDirty.current = false;
      setCmsDraftRevision(prev => prev + 1);
      setCmsError(''); setCmsSaved(false);
    }
  };

  const filteredSubmissions = registrations.filter(sub => {
    if (submissionFilter !== 'all' && sub.status !== submissionFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = sub.projectName.toLowerCase().includes(q);
      const matchTeam = sub.teamName.toLowerCase().includes(q);
      const matchMakerId = sub.makerId.toLowerCase().includes(q);
      const affiliation = readEntrySummary(sub.projectSummary).overseas;
      const matchOverseas = affiliation && `${affiliation.countryOrRegion} ${affiliation.university}`.toLowerCase().includes(q);
      if (!matchName && !matchTeam && !matchMakerId && !matchOverseas) return false;
    }
    return true;
  });

  const handleUpdateStatus = async (status: RegistrationStatus) => {
    if (!selectedSub || reviewPending.current) return;
    reviewPending.current = true;
    setReviewSaving(true); setReviewError('');
    const result = await updateRegistrationStatus(selectedSub.id, status, customFeedback.trim());
    if (!mounted.current) return;
    reviewPending.current = false; setReviewSaving(false);
    if (!result.ok) { setReviewError(result.message || '审核未保存，请重试'); return; }
    setSelectedSub(null); setCustomFeedback('');
  };

  const handleSaveCMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cmsPending.current || cmsLoading || cmsLoadError) return;
    cmsPending.current = true;
    setCmsError('');
    setCmsSaved(false);
    setCmsSaving(true);
    const result = await updateCMSData({
      stats: {
        makers: Number(cmsMakers),
        finalistProjects: Number(cmsFinalists),
        prizePool: cmsPrize,
        prizePoolEn: cmsPrizeEn,
        judges: Number(cmsJudges),
      },
      announcement: cmsAnnouncement,
      announcementEn: cmsAnnouncementEn,
    });
    if (!mounted.current) return;
    cmsPending.current = false;
    setCmsSaving(false);
    // 写接口可能是 403（非白名单管理员）或网络失败，必须按返回值分支，不能谎报已发布。
    if (!result.ok) {
      setCmsError(result.message || '保存失败，请重试');
      return;
    }
    setCmsSaved(true);
    cmsDirty.current = false;
    setCmsDraftRevision(prev => prev + 1);
    setTimeout(() => setCmsSaved(false), 2500);
  };

  const adminGroups = [
    { label: tr('报名与现场', 'Registration & on-site'), items: [
      { id: 'overview', label: tr('数据大盘与漏斗', 'Overview'), title: tr('报名数据概览', 'Registration overview'), description: tr('查看当前渠道的报名规模、审核进度与赛道分布。', 'Review registrations, review progress and track distribution.'), icon: LayoutDashboard },
      { id: 'submissions', label: tr('报名评审审核', 'Submissions'), title: tr('赛事报名与评审', 'Contest registrations'), description: tr('查看项目资料，跟进材料提交与评审结果。', 'Review project details, materials and decisions.'), icon: FileSpreadsheet, count: registrations.length },
      { id: 'tickets', label: tr('大会报名与审核', 'Attendance applications'), title: tr('大会报名与审核', 'Attendance applications'), description: tr('查看参会报名，处理媒体与行业观摩申请。', 'Review attendance and media or industry applications.'), icon: Ticket },
      ...(isSuperAdmin ? [{ id: 'checkin', label: tr('验票签到', 'Check-in'), title: tr('现场验票签到', 'On-site check-in'), description: tr('核验参会凭证，确认入场并记录到场情况。', 'Verify attendee passes, confirm entry and record attendance.'), icon: ScanLine }] : []),
    ] },
    ...(isSuperAdmin ? [
      { label: tr('内容与发布', 'Content & publishing'), items: [
        { id: 'cms', label: tr('CMS 首页配置', 'Homepage CMS'), title: tr('首页内容配置', 'Homepage content'), description: tr('维护首页展示的规模信息、奖项文案与公告。', 'Update public figures, awards copy and announcements.'), icon: Settings2 },
        { id: 'forums', label: tr('论坛场次管理', 'Forums'), title: tr('论坛场次管理', 'Forum sessions'), description: tr('管理论坛议题、场次与预约信息。', 'Manage forum topics, sessions and reservations.'), icon: CalendarDays },
        { id: 'square', label: tr('招募帖管理', 'Recruitment posts'), title: tr('招募帖管理', 'Recruitment posts'), description: tr('查看广场上的组队招募，核对内容并处理不当帖子。', 'Review team recruitment posts and manage inappropriate content.'), icon: Layers },
        { id: 'broadcast', label: tr('官方通知', 'Official notices'), title: tr('官方通知', 'Official notices'), description: tr('发布大会重要事项，用户可在消息中心查看。', 'Publish important event updates to the message center.'), icon: Megaphone },
      ] },
      { label: tr('权限管理', 'Access management'), items: [
        { id: 'admins', label: tr('管理员管理', 'Administrators'), title: tr('管理员与渠道权限', 'Administrators & channel access'), description: tr('分配管理角色，为渠道运营指定负责范围。', 'Assign roles and channels to operations accounts.'), icon: ShieldCheck },
      ] },
    ] : []),
  ];
  const currentSection = adminGroups.flatMap(group => group.items).find(item => item.id === activeAdminTab)!;
  const showsRegistrationScope = ['overview', 'submissions', 'tickets'].includes(activeAdminTab);

  const handleExportCSV = () => {
    if (registrationsLoading || registrationsError) return;
    const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(registrationCSV(registrations));
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'DOAI_2026_Contest_Submissions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pt-28 pb-20 max-w-[1200px] mx-auto px-5 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E3ECFA] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1B3A]">{tr('组委会管理中枢', 'Operations console')}</h1>
          <p className="mt-1.5 text-sm text-[#6B7C9B]">{tr('DOAI 2026 · 运营管理', 'DOAI 2026 · Event operations')}</p>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border border-[#E3ECFA] px-3.5 py-2.5">
          <ShieldCheck aria-hidden="true" className="h-4 w-4 text-[#165DFF]" />
          <div className="text-xs"><p className="text-[#6B7C9B]">{tr('当前管理范围', 'Your management scope')}</p><p className="mt-0.5 font-semibold text-[#0B1B3A]">{isSuperAdmin ? tr('总管理员 · 全部渠道', 'Administrator · All channels') : registrationChannelLabel(currentUser?.operatorChannel, lang === 'en')}</p></div>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[192px_minmax(0,1fr)] lg:gap-8">
        <aside className="min-w-0">
          <label className="block lg:hidden text-xs font-semibold text-[#48597A]" htmlFor="admin-section-select">{tr('后台功能', 'Management section')}
            <select id="admin-section-select" value={activeAdminTab} onChange={event => { setActiveAdminTab(event.target.value as typeof activeAdminTab); setSelectedSub(null); }} className="doa-input mt-2 w-full">
              {adminGroups.map(group => <optgroup key={group.label} label={group.label}>{group.items.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</optgroup>)}
            </select>
          </label>
          <nav aria-label={tr('后台功能导航', 'Management navigation')} className="hidden lg:block lg:sticky lg:top-24 space-y-6 border-r border-[#E3ECFA] pr-4">
            {adminGroups.map(group => <div key={group.label}>
              <p className="px-3 mb-2 text-[11px] font-medium text-[#98A6BE]">{group.label}</p>
              <div className="space-y-1">{group.items.map(item => {
                const Icon = item.icon;
                return <button type="button" key={item.id} aria-current={activeAdminTab === item.id ? 'page' : undefined} onClick={() => { setActiveAdminTab(item.id as typeof activeAdminTab); setSelectedSub(null); }} className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#165DFF] ${activeAdminTab === item.id ? 'bg-[#EFF5FF] text-[#165DFF]' : 'text-[#48597A] hover:bg-[#F7FAFF] hover:text-[#0B1B3A]'}`}>
                  <Icon aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="flex-1">{item.label}</span>{'count' in item && <span className="rounded-md bg-[#F2F7FF] px-1.5 py-0.5 text-[10px] tabular-nums text-[#6B7C9B]">{item.count}</span>}
                </button>;
              })}</div>
            </div>)}
          </nav>
        </aside>

        <section className="min-w-0 [&>section]:pt-0" aria-labelledby="admin-section-title">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0"><h2 id="admin-section-title" className="text-xl font-bold tracking-tight text-[#0B1B3A]">{currentSection.title}</h2><p className="mt-1.5 text-[13px] leading-relaxed text-[#6B7C9B]">{currentSection.description}</p></div>
            {showsRegistrationScope && <div className="flex flex-wrap items-end gap-2.5">
              {isSuperAdmin && <label className="text-xs font-medium text-[#6B7C9B]" htmlFor="admin-channel-filter"><span className="sr-only">{tr('筛选报名渠道', 'Filter by channel')}</span><select id="admin-channel-filter" value={channelFilter} onChange={event => { setChannelFilter(event.target.value); setSelectedSub(null); }} className="h-10 w-full sm:w-44 rounded-xl border border-[#E3ECFA] bg-white px-3 text-[13px] text-[#0B1B3A] focus:outline-none focus:border-[#165DFF]"><option value="all">{tr('全部渠道', 'All channels')}</option>{registrationChannels.map(item => <option key={item.id} value={item.id}>{tr(item.zh, item.en)}</option>)}</select></label>}
              {activeAdminTab !== 'tickets' && <button type="button" onClick={handleExportCSV} disabled={registrationsLoading || registrationsError} className="flex h-10 items-center gap-2 rounded-xl border border-[#E3ECFA] bg-white px-3.5 text-[13px] font-medium text-[#48597A] hover:bg-[#F7FAFF] disabled:opacity-50"><Download aria-hidden="true" className="h-4 w-4" />{tr('导出报名数据 (CSV)', 'Export CSV')}</button>}
            </div>}
          </div>

      {/* 0. 扫码核销（会议结论 2026-10-13：后台对活动扫码签到） */}
      {isSuperAdmin && activeAdminTab === 'admins' && <AdminAccountsPanel />}
      {isSuperAdmin && activeAdminTab === 'checkin' && <CheckinPanel />}
      {activeAdminTab === 'tickets' && <AttendanceReviewPanel channelFilter={channelFilter} />}

      {/* 1. Overview & Conversion Funnel */}
      {activeAdminTab === 'overview' && !registrationsLoading && !registrationsError && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { label: '正式提交申报', value: registrations.length },
              { label: '待审核申报', value: registrations.filter(r => r.status === 'submitted' || r.status === 'reviewing').length },
              { label: '待补充材料', value: registrations.filter(r => r.status === 'needs_info').length },
              { label: '入围决赛', value: registrations.filter(r => r.status === 'shortlisted').length },
            ].map(metric => (
              <div key={metric.label} className="p-6 bg-white rounded-2xl border border-[#E8EAED] shadow-xs">
                <div className="text-xs text-[#888888]">{metric.label}</div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-[#165DFF] mt-2">{metric.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[#E8EAED] bg-white p-6">
            <h3 className="text-sm font-bold text-[#0B1B3A] mb-4">{tr('报名渠道分布', 'Registrations by channel')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{registrationChannels.filter(item => isSuperAdmin || item.id === currentUser?.operatorChannel).map(item => <div key={item.id} className="border-l-2 border-[#CFE2FF] pl-3"><p className="text-xs text-[#6B7C9B]">{tr(item.zh, item.en)}</p><p className="mt-1 text-xl font-semibold text-[#165DFF]">{registrations.filter(row => row.channel === item.id).length}</p></div>)}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-2xl border border-[#E8EAED]">
              <h3 className="text-sm font-bold text-[#0B1B3A] mb-4">申报赛道分布比例</h3>
              {registrations.length === 0 ? (
                <p className="text-xs text-[#888888]">暂无报名数据</p>
              ) : (
                <div className="space-y-4 text-xs">
                  {([
                    { track: 'industry', label: 'FDE 赛道 · Real Business Brief', color: '#165DFF' },
                    { track: 'creator', label: '自由创意赛道 (AI Creator)', color: '#00C48C' },
                    { track: 'overseas', label: '海外专场赛道 (Overseas Special)', color: '#7C3AED' },
                  ] as const).map(item => {
                    const count = registrations.filter(r => registrationTrack(r) === item.track).length;
                    const percentage = Math.round(count / registrations.length * 100);
                    return (
                      <div key={item.track}>
                        <div className="flex justify-between mb-1 gap-2">
                          <span>{item.label}</span>
                          <span className="font-mono font-semibold">{percentage}% ({count} 个项目)</span>
                        </div>
                        <div className="w-full bg-[#F7F8FA] h-2.5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: item.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-6 bg-white rounded-2xl border border-[#E8EAED]">
              <h3 className="text-sm font-bold text-[#0B1B3A] mb-2">安全与机审规则说明</h3>
              <ul className="text-xs text-[#666666] space-y-2 list-disc list-inside leading-relaxed">
                <li>机审自动执行：必填项校验、Demo 视频链接 HEAD 可达性测试、查重检测。</li>
                <li>人工评审节点：材料不齐可一键驳回要求「补充材料」，选手可在 3 日内重新提交。</li>
                <li>严格保密原则：后台项目详情禁止对外转发，所有审核操作留有数字审计日志。</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {(activeAdminTab === 'overview' || activeAdminTab === 'submissions') && registrationsLoading && <p role="status" className="pt-8 text-sm text-[#6B7C9B]">正在加载报名记录…</p>}
      {(activeAdminTab === 'overview' || activeAdminTab === 'submissions') && registrationsError && <div role="status" className="pt-8 space-y-3"><p className="text-sm text-[#6B7C9B]">报名记录暂时无法加载，请重试。</p><button type="button" onClick={() => void reloadRegistrations()} className="doa-btn doa-btn-secondary">重新加载报名</button></div>}

      {/* 2. Submissions Review Management */}
      {activeAdminTab === 'submissions' && !registrationsLoading && !registrationsError && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex min-w-0 flex-col items-stretch justify-between gap-4 xl:flex-row xl:items-center">
            <div className="flex min-w-0 max-w-full items-center gap-2 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'all', label: '全部状态' },
                { id: 'submitted', label: '已提交待审' },
                { id: 'reviewing', label: '审核中' },
                { id: 'shortlisted', label: '已入围决赛' },
                { id: 'needs_info', label: '待补充材料' },
                { id: 'rejected', label: '已淘汰驳回' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSubmissionFilter(f.id)}
                  className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    submissionFilter === f.id
                      ? 'bg-[#111111] text-white'
                      : 'bg-[#F7F8FA] text-[#666666] border border-[#E8EAED]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-full shrink-0 xl:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="搜索项目、团队、编号、国家或高校..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Submissions Table */}
          <div className="bg-white rounded-2xl border border-[#E8EAED] overflow-hidden shadow-xs">
            <p className="border-b border-[#E8EAED] px-4 py-2 text-[11px] text-[#6B7C9B] xl:hidden">{tr('左右滑动查看完整报名信息', 'Scroll horizontally to view all registration details')}</p>
            <div className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-[#165DFF]" role="region" aria-label={tr('赛事报名表', 'Contest registrations table')} tabIndex={0}>
              <table className="w-full min-w-[880px] table-fixed text-left text-xs">
                <colgroup><col style={{ width: '18%' }} /><col style={{ width: '24%' }} /><col style={{ width: '18%' }} /><col style={{ width: '16%' }} /><col style={{ width: '12%' }} /><col style={{ width: '12%' }} /></colgroup>
                <thead className="bg-[#F7F8FA] border-b border-[#E8EAED] text-[#666666]">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">Maker ID</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">申报项目与赛道</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">战队与队长</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">作品链接</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">当前状态</th>
                    <th className="sticky right-0 z-10 whitespace-nowrap bg-[#F7F8FA] px-4 py-3 font-semibold text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EAED]">
                  {filteredSubmissions.map(sub => (
                    <tr key={sub.id} className="group align-top hover:bg-[#F7F8FA]/60 transition-colors">
                      <td className="break-all px-4 py-4 font-mono text-[11px] font-semibold leading-relaxed text-[#165DFF]">
                        {sub.makerId}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold leading-relaxed text-[#0B1B3A] [overflow-wrap:anywhere]">
                          {sub.projectName}
                        </div>
                        <div className="text-[11px] text-[#888888]">
                          <span className="block mt-1">{registrationTrackLabel(sub)}</span><time className="mt-0.5 block" dateTime={sub.submittedAt} title={sub.submittedAt}>{formatPostDate(sub.submittedAt)}</time>
                          <span className="mt-1 block text-[#165DFF]">{registrationChannelLabel(sub.channel, lang === 'en')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium leading-relaxed text-[#0B1B3A] [overflow-wrap:anywhere]">{sub.teamName}</div>
                        <div className="text-[11px] text-[#888888]">
                          <span className="mt-1 block [overflow-wrap:anywhere]">{registrationContact(sub).name}</span><span className="block whitespace-nowrap">{registrationContact(sub).phone || '未留存手机号'}</span>
                          <span className="block">{registrationContactSource(sub)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 space-y-1.5">
                        {[
                          { label: 'Demo 视频', url: registrationMaterials(sub).videoUrl },
                          { label: '在线 Demo', url: registrationMaterials(sub).demoUrl },
                          { label: 'GitHub 仓库', url: registrationMaterials(sub).githubUrl },
                          { label: '项目文档', url: registrationMaterials(sub).docUrl },
                        ].map(item => item.url ? <a key={item.label} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 whitespace-nowrap text-[11px] leading-5 text-[#165DFF] hover:underline"><ExternalLink className="w-3 h-3 shrink-0" />{item.label}</a> : <span key={item.label} className="block whitespace-nowrap text-[11px] leading-5 text-[#98A6BE]">{item.label} · 未提交</span>)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-5 ${
                            sub.status === 'shortlisted'
                              ? 'bg-[#00C48C]/10 text-[#00C48C]'
                              : sub.status === 'reviewing'
                              ? 'bg-[#165DFF]/10 text-[#165DFF]'
                              : sub.status === 'needs_info'
                              ? 'bg-[#FF7D00]/10 text-[#FF7D00]'
                              : sub.status === 'submitted'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-red-50 text-red-500'
                          }`}
                        >
                          {sub.status === 'shortlisted'
                            ? '已入围'
                            : sub.status === 'reviewing'
                            ? '审核中'
                            : sub.status === 'needs_info'
                            ? '待补材料'
                            : sub.status === 'submitted'
                            ? '已提交'
                            : '已淘汰'}
                        </span>
                      </td>
                      <td className="sticky right-0 z-10 bg-white px-4 py-4 text-center align-middle group-hover:bg-[#F7FAFF]">
                        <button
                          onClick={() => {
                            setSelectedSub(sub);
                            setCustomFeedback(sub.reviewFeedback || '');
                            setReviewError('');
                          }}
                          className="inline-flex whitespace-nowrap px-3 py-1.5 text-xs font-semibold text-[#165DFF] hover:bg-[#165DFF]/10 rounded-lg transition-colors"
                        >
                          审核评决
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div role="dialog" aria-modal="true" aria-labelledby="review-title" className="relative w-full max-w-lg max-h-[calc(100svh-2rem)] overflow-y-auto break-words bg-white rounded-3xl p-6 shadow-floating border border-[#E8EAED]">
            <h3 id="review-title" className="text-base font-bold text-[#0B1B3A] mb-1">
              评审裁决：{selectedSub.projectName}
            </h3>
            <div className="text-xs text-[#888888] mb-4">
              Maker ID: {selectedSub.makerId} · 战队: {selectedSub.teamName}
            </div>

            <div className="p-3 bg-[#F7F8FA] rounded-xl text-xs space-y-2 mb-4">
              <div><strong>{tr('报名渠道：', 'Registration channel: ')}</strong>{registrationChannelLabel(selectedSub.channel, lang === 'en')}</div>
              <div><strong>申报人联系方式：</strong>{registrationContact(selectedSub).name} · {registrationContact(selectedSub).phone || '未留存手机号'}（{registrationContactSource(selectedSub)}）</div>
              {registrationApplicant(selectedSub) ? <><div><strong>公司/学校/机构组织名称：</strong>{registrationApplicant(selectedSub)!.organization || "未填写"}</div><div><strong>职位/在读年级：</strong>{registrationApplicant(selectedSub)!.position || "未填写"}</div><div><strong>年龄：</strong>{registrationApplicant(selectedSub)!.age ?? "未填写"}</div><div><strong>申报城市：</strong>{registrationApplicant(selectedSub)!.city}</div><div><strong>申报技能：</strong>{registrationApplicant(selectedSub)!.skills.join('、') || '未填写'}</div><div><strong>申报邮箱：</strong>{registrationApplicant(selectedSub)!.email || '未填写'}</div><div className="whitespace-pre-wrap"><strong>个人简介：</strong>{registrationApplicant(selectedSub)!.bio || '未填写'}</div></> : <div>原报名未留存城市与技能资料</div>}
              {readEntrySummary(selectedSub.projectSummary).overseas && <><div><strong>所在国家／地区：</strong>{readEntrySummary(selectedSub.projectSummary).overseas!.countryOrRegion}</div><div><strong>所属高校：</strong>{readEntrySummary(selectedSub.projectSummary).overseas!.university}</div></>}
              <div><strong>申报方向：</strong>{readEntrySummary(selectedSub.projectSummary).entry || '原报名未记录具体方向'}</div>
              <div>
                <strong>项目介绍：</strong>
                <p className="text-[#555555] mt-0.5">{readEntrySummary(selectedSub.projectSummary).summary}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  { label: '查看 Demo 视频', url: registrationMaterials(selectedSub).videoUrl },
                  { label: '查看在线 Demo', url: registrationMaterials(selectedSub).demoUrl },
                  { label: '查看 GitHub 仓库', url: registrationMaterials(selectedSub).githubUrl },
                  { label: '查看项目文档', url: registrationMaterials(selectedSub).docUrl },
                ].map(item => item.url ? <a key={item.label} href={item.url} target="_blank" rel="noopener noreferrer" className="text-[#165DFF] hover:underline flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" />{item.label}</a> : <span key={item.label} className="text-[#98A6BE]">{item.label.replace('查看', '')} · 未提交</span>)}
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="review-feedback" className="block text-xs font-semibold text-[#0B1B3A] mb-1">
                评委反馈意见 / 补充材料要求说明
              </label>
              <textarea id="review-feedback" maxLength={2000} disabled={reviewSaving}
                rows={3}
                value={customFeedback}
                onChange={e => setCustomFeedback(e.target.value)}
                placeholder="请输入反馈说明（选手端将在个人中心实时可见并同步站内信）..."
                className="w-full px-3 py-2 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-xs"
              />
            </div>

            {reviewError && <p role="alert" className="mb-4 text-sm text-red-600">{reviewError}</p>}
            {reviewSaving && <p role="status" className="mb-4 text-sm text-[#165DFF]">正在保存审核…</p>}
            {/* Decision Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#E8EAED]">
              <button
                type="button" disabled={reviewSaving}
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2 text-xs font-semibold text-[#666666]"
              >
                取消
              </button>
              <button
                type="button" disabled={reviewSaving}
                onClick={() => handleUpdateStatus('rejected')}
                className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl"
              >
                淘汰驳回
              </button>
              <button
                type="button" disabled={reviewSaving}
                onClick={() => handleUpdateStatus('needs_info')}
                className="px-4 py-2 text-xs font-semibold text-[#FF7D00] bg-[#FF7D00]/10 hover:bg-[#FF7D00]/20 rounded-xl"
              >
                要求补材料
              </button>
              <button
                type="button" disabled={reviewSaving}
                onClick={() => handleUpdateStatus('shortlisted')}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#00C48C] hover:bg-[#00B07E] rounded-xl"
              >
                初审通过 · 入围决赛
              </button>
            </div>
          </div>
        </div>
      )}

      {isSuperAdmin && activeAdminTab === 'square' && <RecruitmentManagementPanel key={currentUser?.id} />}

      {isSuperAdmin && activeAdminTab === 'forums' && <ForumManagementPanel />}

      {/* Homepage content uses one form; its save and conflict behavior is unchanged. */}
      {isSuperAdmin && activeAdminTab === 'cms' && (
        <div className="overflow-hidden rounded-2xl border border-[#E3ECFA] bg-white">
          {cmsLoading && <p role="status" className="px-6 pt-6 text-sm text-[#6B7C9B]">{tr('正在读取当前配置…', 'Loading settings…')}</p>}
          {cmsLoadError && <div role="status" className="m-6 space-y-3"><p className="text-sm text-red-600">{tr('当前配置无法读取，暂时不能保存。', 'Settings could not be loaded. Saving is unavailable.')}</p><button type="button" onClick={() => void reloadCMSDraft()} className="doa-btn doa-btn-secondary">{tr('重新加载配置', 'Reload settings')}</button></div>}
          {cmsError && <div role="alert" className="mx-6 mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><p>{cmsError}</p><button type="button" onClick={() => void reloadCMSDraft()} className="mt-3 text-xs font-semibold underline underline-offset-4">{tr('加载服务器当前值（替换草稿）', 'Reload saved settings (replace draft)')}</button></div>}

          <form onSubmit={handleSaveCMS} aria-label="首页配置">
            <fieldset disabled={cmsSaving || cmsLoading || cmsLoadError} onChange={() => { cmsDirty.current = true; setCmsSaved(false); }} className="min-w-0">
              <div className="px-5 py-6 sm:px-7 sm:py-7">
                <section aria-labelledby="cms-figures-title">
                  <h3 id="cms-figures-title" className="text-sm font-semibold text-[#0B1B3A]">{tr('公示规模', 'Public figures')}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#6B7C9B]">{tr('这些数字用于首页展示；实际报名和审核进度请查看报名数据。', 'These figures appear on the homepage. Actual registrations are shown in the registration overview.')}</p>
                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <label htmlFor="cms-makers" className="block text-xs font-medium text-[#48597A]">{tr('创客规模（公示值）', 'Makers (public figure)')}<input type="number" required min={0} max={1000000} step={1} id="cms-makers" value={cmsMakers} onChange={event => setCmsMakers(Number(event.target.value))} className="doa-input mt-2 w-full tabular-nums" /></label>
                    <label htmlFor="cms-finalists" className="block text-xs font-medium text-[#48597A]">{tr('决赛项目规模（公示值）', 'Finalist projects (public figure)')}<input type="number" required min={0} max={1000000} step={1} id="cms-finalists" value={cmsFinalists} onChange={event => setCmsFinalists(Number(event.target.value))} className="doa-input mt-2 w-full tabular-nums" /></label>
                    <label htmlFor="cms-judges" className="block text-xs font-medium text-[#48597A]">{tr('评委规模（公示值）', 'Judges (public figure)')}<input type="number" required min={0} max={1000000} step={1} id="cms-judges" value={cmsJudges} onChange={event => setCmsJudges(Number(event.target.value))} className="doa-input mt-2 w-full tabular-nums" /></label>
                  </div>
                </section>
                <div className="my-7 border-t border-[#E3ECFA]" />
                <div className="grid grid-cols-1 gap-7 md:grid-cols-2 md:gap-6">
                  <section aria-labelledby="cms-chinese-title" className="min-w-0 space-y-5">
                    <h3 id="cms-chinese-title" className="text-sm font-semibold text-[#0B1B3A]">{tr('中文内容', 'Chinese content')}</h3>
                    <label htmlFor="cms-prize" className="block text-xs font-medium text-[#48597A]">{tr('奖项奖励文案', 'Awards copy')}<input id="cms-prize" maxLength={32} value={cmsPrize} onChange={event => setCmsPrize(event.target.value)} className="doa-input mt-2 w-full" /></label>
                    <label htmlFor="cms-announcement" className="block text-xs font-medium text-[#48597A]">{tr('首页公告（中文）', 'Homepage announcement (Chinese)')}<textarea rows={4} maxLength={500} id="cms-announcement" value={cmsAnnouncement} onChange={event => setCmsAnnouncement(event.target.value)} className="doa-input mt-2 w-full resize-y leading-relaxed" /></label>
                  </section>
                  <section aria-labelledby="cms-english-title" className="min-w-0 space-y-5">
                    <h3 id="cms-english-title" className="text-sm font-semibold text-[#0B1B3A]">{tr('英文内容', 'English content')}</h3>
                    <label htmlFor="cms-prize-en" className="block text-xs font-medium text-[#48597A]">{tr('奖项奖励文案（英文）', 'Awards copy (English)')}<input id="cms-prize-en" maxLength={32} value={cmsPrizeEn} onChange={event => setCmsPrizeEn(event.target.value)} className="doa-input mt-2 w-full" /></label>
                    <label htmlFor="cms-announcement-en" className="block text-xs font-medium text-[#48597A]">{tr('首页公告（英文）', 'Homepage announcement (English)')}<textarea id="cms-announcement-en" maxLength={500} rows={4} value={cmsAnnouncementEn} onChange={event => setCmsAnnouncementEn(event.target.value)} className="doa-input mt-2 w-full resize-y leading-relaxed" /></label>
                  </section>
                </div>
              </div>
              <div className="flex flex-col gap-4 border-t border-[#E3ECFA] bg-[#F7FAFF] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <p role="status" className={`flex items-center gap-2 text-xs leading-relaxed ${cmsSaved ? 'text-emerald-700' : 'text-[#6B7C9B]'}`}>
                  {cmsSaved && <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />}
                  {cmsSaved ? tr('已保存，官网首页已更新', 'Saved. The homepage is updated.') : cmsDirty.current ? tr('有未保存的修改', 'You have unsaved changes') : tr('保存后，内容将更新到官网首页。', 'Saved changes appear on the homepage.')}
                </p>
                <button type="submit" className="doa-btn doa-btn-primary shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">{cmsSaving ? tr('保存中…', 'Saving…') : tr('保存并发布', 'Save and publish')}</button>
              </div>
            </fieldset>
          </form>
        </div>
      )}

      {/* Keep the draft while switching management sections; isolate it by account. */}
      {isSuperAdmin && <div hidden={activeAdminTab !== 'broadcast'}>
        <BroadcastPanel key={currentUser.id} active={activeAdminTab === 'broadcast'} />
      </div>}
        </section>
      </div>
    </div>
  );
};
