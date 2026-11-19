import React, { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { CardWall } from '../sections/CardWall';
import { CommunityTeams } from '../sections/CommunityTeams';
import { Avatar } from '../common/Avatar';
import {
  Users,
  Search,
  Plus,
  Heart,
  Share2,
  CheckCircle2,
  MapPin,
  Clock,
  Briefcase,
  X,
  Send,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { RecruitmentPost, TrackType } from '../../types';
import { formatPostDate } from '../../lib/time';
import { useCommunityBrowse, useCommunityScroll } from '../../lib/communityBrowse';
import { recruitmentTags } from '../../lib/communityApi';


export const SquareView: React.FC = () => {
  const {
    lang,
    t,
    tr,
    recruitments,
    recruitmentsLoading,
    recruitmentsError,
    recruitmentLikePending,
    recruitmentApplyPending,
    reloadRecruitments,
    currentUser,
    setLoginModalOpen,
    toggleLikeRecruit,
    publishRecruitment,
    applyToRecruitment,
    setNotificationDrawerOpen,
    setActiveRoute,
    activeRoute,
  } = useApp();

  const [section, setSection] = useCommunityBrowse<'teams' | 'projects' | 'makers'>('section', 'teams', currentUser?.id);
  // Explicit hall links override a previously saved projects/makers tab.
  useEffect(() => {
    if (activeRoute === 'square/teams') setSection('teams');
  }, [activeRoute, currentUser?.id]);
  const [searchTerm, setSearchTerm] = useCommunityBrowse('searchTerm', '', currentUser?.id);
  const [selectedTrack, setSelectedTrack] = useCommunityBrowse('selectedTrack', 'all', currentUser?.id);
  const [selectedRole, setSelectedRole] = useCommunityBrowse('selectedRole', 'all', currentUser?.id);
  const [selectedCity, setSelectedCity] = useCommunityBrowse('selectedCity', 'all', currentUser?.id);

  useCommunityScroll(`${currentUser?.id || 'anonymous'}:projects`, !recruitmentsLoading, section === 'projects');

  // Modal State: Publish Recruitment
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newTrack, setNewTrack] = useState<TrackType>('creator');
  const [newRoles, setNewRoles] = useState('');
  const [newSkills, setNewSkills] = useState('');
  const [newStage, setNewStage] = useState<'idea' | 'prototype' | 'demo'>('prototype');
  const [newCity, setNewCity] = useState('');
  const [remoteChoice, setRemoteChoice] = useState<boolean | null>(null);
  const selectedRemote = remoteChoice ?? /远程|remote|线上|online/i.test(newCity);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  // Modal State: Apply to Join
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyingRecruit, setApplyingRecruit] = useState<RecruitmentPost | null>(null);
  const [applyMessage, setApplyMessage] = useState('');
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');

  const publishingRef = useRef(false);
  const applyingRef = useRef(false);
  const mounted = useRef(true);
  const account = useRef(currentUser?.id);
  account.current = currentUser?.id;
  const [dialogOwner, setDialogOwner] = useState<string | null>(null);
  const selectedRecruit = recruitments.find(item => item.id === applyingRecruit?.id) || applyingRecruit;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!recruitmentsLoading) void reloadRecruitments();
  }, [reloadRecruitments]);
  useEffect(() => {
    publishingRef.current = false; applyingRef.current = false;
    setPublishModalOpen(false); setApplyModalOpen(false); setApplyingRecruit(null); setDialogOwner(null);
    setPublishing(false); setApplying(false); setAppliedSuccess(false); setPublishError(''); setApplyError('');
    setNewTitle(''); setNewSummary(''); setNewRoles(''); setNewSkills(''); setNewCity(''); setApplyMessage('');
    setNewTrack('creator'); setNewStage('prototype');
    setRemoteChoice(null);
  }, [currentUser?.id]);

  // Filtered Recruitments
  const filteredRecruitments = recruitments.filter(item => {
    if (selectedTrack !== 'all' && item.track !== selectedTrack) return false;
    if (selectedCity !== 'all' && !item.city.includes(selectedCity)) return false;
    if (selectedRole !== 'all' && !item.neededRoles.some(r => r.includes(selectedRole))) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSummary = item.summary.toLowerCase().includes(q);
      const matchSkills = item.skills.some(s => s.toLowerCase().includes(q));
      if (!matchTitle && !matchSummary && !matchSkills) return false;
    }
    return true;
  });

  const handlePublishSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) { setLoginModalOpen(true); return; }
    if (publishingRef.current) return;
    setPublishError('');
    let neededRoles: string[], skills: string[];
    try {
      neededRoles = recruitmentTags(newRoles, lang === 'en');
      skills = recruitmentTags(newSkills, lang === 'en');
      if (!newTitle.trim() || !newSummary.trim() || !newCity.trim() || !neededRoles.length) throw new Error(tr('请完整填写标题、介绍、角色与城市', 'Complete the title, description, roles and city.'));
    } catch (error) { setPublishError(error instanceof Error ? error.message : '请检查招募内容'); return; }
    const uid = currentUser.id;
    publishingRef.current = true; setPublishing(true);
    const result = await publishRecruitment({ title: newTitle.trim(), summary: newSummary.trim(), track: newTrack,
      neededRoles, skills, stage: newStage, city: newCity.trim(), isRemote: selectedRemote });
    if (!mounted.current || account.current !== uid) return;
    publishingRef.current = false; setPublishing(false);
    if (!result.ok) { setPublishError(result.message || tr('发布失败，请重试', 'Publishing failed. Please retry.')); return; }
    setPublishModalOpen(false);
    setNewTitle(''); setNewSummary(''); setNewRoles(''); setNewSkills(''); setNewCity(''); setNewTrack('creator'); setNewStage('prototype');
    setRemoteChoice(null);
  };

  const handleOpenApply = (recruit: RecruitmentPost) => {
    if (!currentUser) {
      setLoginModalOpen(true);
      return;
    }
    if (recruit.leader.id === currentUser.id) { setActiveRoute(`detail/recruit/${recruit.id}`); return; }
    setDialogOwner(currentUser.id); setPublishModalOpen(false);
    if (recruit.hasApplied) {
      setApplyError('');
      setApplyingRecruit(recruit);
      setAppliedSuccess(true);
      setApplyModalOpen(true);
      return;
    }
    setApplyingRecruit(recruit);
    setApplyMessage(
      lang === 'zh'
        ? `你好，我是 ${currentUser.name}${currentUser.skills.length ? `，熟悉 ${currentUser.skills.slice(0, 2).join('/')}` : ''}，希望参与您的项目合作！`
        : `Hi, I'm ${currentUser.name}. I have hands-on experience in ${currentUser.skills.slice(0, 2).join(' / ') || 'this area'} and would love to join your team.`,
    );
    setApplyModalOpen(true);
    setAppliedSuccess(false);
    setApplyError('');
  };

  const handleConfirmApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingRecruit || !currentUser || applyingRef.current) return;
    if (!applyMessage.trim()) { setApplyError(tr('请填写申请留言', 'Please add an introduction.')); return; }
    const uid = currentUser.id;
    applyingRef.current = true;
    setApplyError('');
    setApplying(true);
    const result = await applyToRecruitment(applyingRecruit.id, applyMessage.trim());
    if (!mounted.current || account.current !== uid) return;
    applyingRef.current = false;
    setApplying(false);
    if (!result.ok) {
      setApplyError(result.message || tr('申请失败，请重试', 'Your application could not be sent. Please try again.'));
      return;
    }
    setAppliedSuccess(true);
  };

  return (
    <div className="pt-24 pb-24">
      {/* Top Banner & Header */}
      <section className="max-w-[1200px] mx-auto px-6 sm:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#E8EAED]">
          <div>
            <div className="text-xs font-semibold text-[#165DFF] tracking-wider uppercase mb-1">
              DOAI CREATOR NETWORK
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#0B1B3A]">
              {tr('组队广场', 'Team Square')}
            </h1>
            <p className="text-xs text-[#666666] mt-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00C48C]" />
              <span>{tr('严格遵循项目保密原则：报名项目不公开展示，社区展示战队信息、合规招募需求与人才经历', 'Projects stay confidential. The community shows teams, recruitment needs and maker profiles.')}</span>
            </p>
            {/* 招募帖与申请都已落主站数据库，这里只说明发布/申请的真实去向。 */}
            <p className="text-[11px] text-[#666666] mt-1.5 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-[#165DFF]" />
              <span>{tr('找参赛队伍请浏览社区战队；找项目合作请查看合作招募；认识伙伴请浏览创客名片。', 'Browse teams to compete, project posts to collaborate, and maker cards to meet people.')}</span>
            </p>
          </div>

          {section === 'projects' && <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (!currentUser) {
                  setLoginModalOpen(true);
                } else {
                  setSection('projects'); setDialogOwner(currentUser.id); setApplyModalOpen(false); setPublishModalOpen(true);
                }
              }}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-[#165DFF] hover:bg-[#1453E6] rounded-full transition-all shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t.square.postRecruitBtn}</span>
            </button>
          </div>}
        </div>

        <nav aria-label={tr('社区内容', 'Community sections')} className="mt-7 flex flex-wrap gap-3">{([['teams', '社区战队', 'Teams'], ['projects', '项目合作招募', 'Project collaboration'], ['makers', '创客名片墙', 'Maker cards']] as const).map(([value, zh, en]) => <button key={value} type="button" aria-pressed={section === value} onClick={() => setSection(value)} className={`rounded-full px-5 py-2.5 text-sm font-semibold ${section === value ? 'bg-[#165DFF] text-white' : 'border border-[#D5E1F1] text-[#48597A]'}`}>{tr(zh, en)}</button>)}</nav>
        <div hidden={section !== 'teams'}><CommunityTeams active={section === 'teams'} /></div>
        <div hidden={section !== 'projects'} className="mt-8">
        <h2 className="text-xl font-bold text-[#0B1B3A]">{tr('项目合作招募', 'Project Collaboration')}</h2><p className="mt-2 text-xs leading-6 text-[#6B7C9B]">{tr('围绕项目方向寻找合作伙伴。申请用于联系发起人，不会自动加入赛事战队；正式入队请前往「社区战队」。', 'Connect with project founders. Applying starts a conversation; official team membership is managed in Teams.')}</p>

        {/* Tab Switcher & Search Bar */}
        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Tabs */}

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t.square.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-xs focus:outline-none focus:bg-white focus:border-[#165DFF] transition-all"
            />
          </div>
        </div>

        {/* Filter Chips Bar (Clean interactive buttons with instant filtering) */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs py-2">
          <span className="text-[#888888] text-[11px] mr-1">{tr('赛道方向', 'Track')}:</span>
          {['all', 'industry', 'creator'].map(track => (
            <button
              key={track}
              onClick={() => setSelectedTrack(track)}
              className={`px-3 py-1 rounded-full font-medium transition-colors ${
                selectedTrack === track
                  ? 'bg-[#165DFF] text-white'
                  : 'bg-[#F7F8FA] text-[#666666] hover:text-[#0B1B3A] border border-[#E8EAED]'
              }`}
            >
              {track === 'all' ? tr('全部赛道', 'All') : track === 'industry' ? tr('FDE 赛道', 'Industry') : tr('自由创意赛道', 'Creator')}
            </button>
          ))}

          <span className="text-[#888888] text-[11px] ml-3 mr-1">{tr('角色方向', 'Role')}:</span>
          {[['all', 'All'], ['算法', 'Algo'], ['前端', 'Frontend'], ['后端', 'Backend'], ['硬件', 'Hardware'], ['产品', 'Product']].map(([role, roleEn]) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-3 py-1 rounded-full font-medium transition-colors ${
                selectedRole === role
                  ? 'bg-[#165DFF] text-white'
                  : 'bg-[#F7F8FA] text-[#666666] hover:text-[#0B1B3A] border border-[#E8EAED]'
              }`}
            >
              {role === 'all' ? tr('全部角色', 'All') : tr(role, roleEn)}
            </button>
          ))}

          <span className="text-[#888888] text-[11px] ml-3 mr-1">{tr('城市分布', 'City')}:</span>
          {[['all', 'All'], ['深圳', 'Shenzhen'], ['北京', 'Beijing'], ['上海', 'Shanghai'], ['杭州', 'Hangzhou']].map(([city, cityEn]) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-3 py-1 rounded-full font-medium transition-colors ${
                selectedCity === city
                  ? 'bg-[#165DFF] text-white'
                  : 'bg-[#F7F8FA] text-[#666666] hover:text-[#0B1B3A] border border-[#E8EAED]'
              }`}
            >
              {city === 'all' ? tr('全域', 'All') : tr(city, cityEn)}
            </button>
          ))}
        </div>
        </div>
      </section>

      {/* Main Grid Content */}
      <section hidden={section !== 'projects'} className="max-w-[1200px] mx-auto px-6 sm:px-8 pt-4">
        {recruitmentsLoading && <p role="status" className="py-8 text-center text-xs text-[#888888]">{tr('正在加载招募帖…', 'Loading posts…')}</p>}
        {recruitmentsError && <div role="status" className="py-8 text-center space-y-3">
          <p className="text-sm text-[#48597A]">{tr('招募帖暂时无法加载，请稍后重试。', 'Posts could not be loaded. Please try again.')}</p>
          {recruitments.length > 0 && <p className="text-xs text-[#98A6BE]">{tr('已成功读取或发布的帖子仍保留在下方。', 'Previously loaded or successfully published posts remain below.')}</p>}
          <button type="button" onClick={() => void reloadRecruitments()} className="doa-btn doa-btn-ghost">{tr('重新加载', 'Retry')}</button>
        </div>}
        {!recruitmentsLoading && !recruitmentsError && filteredRecruitments.length === 0 && <div className="py-16 text-center space-y-2">
          <Users className="w-8 h-8 text-[#C3CDDD] mx-auto" />
          <p className="text-sm font-semibold text-[#0B1B3A]">{tr('还没有符合条件的招募帖', 'No posts match the filters yet')}</p>
          <p className="text-xs text-[#888888]">{tr('换个筛选条件，或者发布第一条招募需求。', 'Try another filter, or publish the first post.')}</p>
        </div>}
        {filteredRecruitments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecruitments.map(item => (
              <div
                key={item.id}
                className="doa-card doa-card-hover p-6 sm:p-7 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between text-xs text-[#888888] mb-3">
                    <span className="font-bold text-[#165DFF]">
                      {item.track === 'industry'
                        ? tr('FDE 赛道 · 真实企业命题', 'FDE track · real business briefs')
                        : tr('自由创意赛道 · AI Creator', 'Free Creation track · AI Creator')}
                    </span>
                    <span className="font-mono text-[11px]">{formatPostDate(item.createdAt)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveRoute(`detail/recruit/${item.id}`)}
                    className="block w-full min-w-0 text-left mb-2"
                  >
                    <h3 className="text-lg font-bold text-[#0B1B3A] hover:text-[#165DFF] transition-colors break-words">
                      {item.title}
                    </h3>
                  </button>
                  <p className="text-xs text-[#666666] leading-relaxed line-clamp-3 mb-5">
                    {item.summary}
                  </p>

                  {/* Needed Roles */}
                  <div className="space-y-2 mb-5">
                    <div className="text-[11px] font-semibold text-[#0B1B3A]">{tr('急需角色：', 'Roles needed:')}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.neededRoles.map(role => (
                        <span
                          key={role}
                          className="px-2.5 py-1 text-xs rounded-lg bg-[#F7F8FA] border border-[#E8EAED] text-[#0B1B3A] font-medium max-w-full break-all"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Tech stack */}
                  <div className="text-xs text-[#888888] flex items-center gap-1.5 flex-wrap">
                    <span>{tr('技术偏好:', 'Stack:')}</span>
                    {item.skills.map((skill, sIdx) => (
                      <span key={skill} className="text-[#555555] max-w-full break-all">
                        {skill}
                        {sIdx < item.skills.length - 1 ? ' · ' : ''}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-5 mt-6 border-t border-[#F0F2F5] flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar src={item.leader.avatar} name={item.leader.name} className="w-8 h-8 rounded-full border border-[#E8EAED]" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#0B1B3A] truncate" title={item.leader.name}>{item.leader.name}</div>
                      <div className="text-[11px] text-[#888888] flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{item.city}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => void toggleLikeRecruit(item.id)}
                      disabled={recruitmentLikePending.includes(item.id)}
                      aria-pressed={Boolean(item.hasLiked)}
                      aria-label={item.hasLiked ? tr('取消心动', 'Unlike post') : tr('心动', 'Like post')}
                      className={`p-2 rounded-full border transition-colors ${
                        item.hasLiked
                          ? 'text-rose-500 border-rose-200 bg-rose-50'
                          : 'text-[#888888] border-[#E8EAED] hover:bg-[#F7F8FA]'
                      }`}
                      title={tr('点赞 / 关注', 'Like / Follow')}
                    >
                      <Heart className={`w-3.5 h-3.5 ${item.hasLiked ? 'fill-current' : ''}`} />
                    </button>

                    <button
                      onClick={() => handleOpenApply(item)}
                      disabled={item.hasApplied || item.status !== 'open' || item.leader.id === currentUser?.id || recruitmentApplyPending.includes(item.id)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#165DFF] hover:bg-[#1453E6] rounded-full transition-colors shadow-xs disabled:bg-[#C3CDDD] disabled:hover:bg-[#C3CDDD] disabled:cursor-not-allowed"
                    >
                      {item.leader.id === currentUser?.id ? tr('我的招募', 'Your post') : item.status !== 'open' ? tr('已停止招募', 'Closed') : item.hasApplied ? item.applicationStatus === 'accepted' ? tr('愿意沟通', 'Open to discuss') : item.applicationStatus === 'declined' ? tr('暂不合适', 'Not a fit') : tr('已申请', 'Applied') : tr('申请项目合作', 'Apply to collaborate')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 创客名片墙（项目墙下方） */}
      <div hidden={section !== 'makers'}><CardWall /></div>

      {/* Modal: Publish Recruitment */}
      {publishModalOpen && dialogOwner === currentUser?.id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div role="dialog" aria-modal="true" aria-label={tr('发布招募', 'Publish recruitment')} className="relative w-full max-w-xl bg-white rounded-3xl p-8 shadow-floating border border-[#E8EAED] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8EAED] mb-4">
              <h3 className="text-lg font-bold text-[#0B1B3A]">{tr('发布项目合作招募', 'Publish a Collaboration Post')}</h3>
              <button
                disabled={publishing} onClick={() => setPublishModalOpen(false)}
                className="p-1.5 text-[#888888] hover:text-[#0B1B3A] rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishSubmit} className="space-y-4" aria-label="发布招募表单">
              <fieldset disabled={publishing} className="space-y-4 min-w-0">
              <div className="p-3 rounded-xl bg-[#F2F7FF] border border-[#A9CCFF] text-[11px] text-[#1A2B4D] flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#165DFF]" />
                <span>{tr('发布后会写入主站数据库，组队广场所有访客都能看到；发起人身份取自你的登录账号。', 'Published posts are stored server-side and visible to everyone; the founder is taken from your session.')}</span>
              </div>
              {publishError && <p role="alert" className="text-[11px] text-red-600">{publishError}</p>}
              <div>
                <label className="block text-xs font-semibold text-[#0B1B3A] mb-1">
                  {tr('项目名称 / 合作方向', 'Project name / Collaboration direction')}
                </label>
                <input
                  type="text"
                  required
                  id="publish-title" maxLength={128} value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder={tr('例如: AgentMesh 分布式智能体总线', 'e.g. AgentMesh — a distributed agent bus')}
                  className="w-full px-4 py-2 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B1B3A] mb-1">
                  {tr('目标赛道', 'Target track')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewTrack('industry')}
                    className={`py-2 text-xs font-semibold rounded-xl border ${
                      newTrack === 'industry'
                        ? 'bg-[#165DFF]/10 text-[#165DFF] border-[#165DFF]'
                        : 'border-[#E8EAED]'
                    }`}
                  >
                    {tr('FDE 赛道 · 真实企业命题', 'FDE track · real business briefs')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTrack('creator')}
                    className={`py-2 text-xs font-semibold rounded-xl border ${
                      newTrack === 'creator'
                        ? 'bg-[#00C48C]/10 text-[#00C48C] border-[#00C48C]'
                        : 'border-[#E8EAED]'
                    }`}
                  >
                    {tr('自由创意赛道 (AI Creator)', 'Free Creation track (AI Creator)')}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B1B3A] mb-1">
                  {tr('招募介绍与项目现状', 'Your project and what you need')}
                </label>
                <textarea
                  rows={3}
                  required
                  id="publish-summary" maxLength={2000} value={newSummary}
                  onChange={e => setNewSummary(e.target.value)}
                  placeholder={tr('阐明项目的核心想法、目前已有的成果以及需要什么伙伴协同...', 'Describe the core idea, what already works, and who you need to move forward…')}
                  className="w-full px-4 py-2 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B1B3A] mb-1">
                  {tr('急需角色 (以顿号隔开)', 'Roles needed (comma separated)')}
                </label>
                <input
                  type="text"
                  required
                  id="publish-roles" maxLength={1299} value={newRoles}
                  onChange={e => setNewRoles(e.target.value)}
                  placeholder={tr('例如: Rust核心研发、AI安全研究员', 'e.g. Rust core engineer, AI security researcher')}
                  className="w-full px-4 py-2 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B1B3A] mb-1">
                  {tr('常驻城市 / 协作方式', 'City / how you will collaborate')}
                </label>
                <input
                  type="text"
                  required
                  id="publish-city" maxLength={64} value={newCity}
                  onChange={e => setNewCity(e.target.value)}
                  placeholder={tr('例如: 深圳 (支持线上远程)', 'e.g. Shenzhen (remote-friendly)')}
                  className="w-full px-4 py-2 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-xs"
                />
              </div>

              <div>
                <label htmlFor="publish-skills" className="block text-xs font-semibold text-[#0B1B3A] mb-1">{tr('技能标签（选填，以逗号或顿号分隔）', 'Skills (optional, comma separated)')}</label>
                <input id="publish-skills" maxLength={1299} value={newSkills} onChange={event => setNewSkills(event.target.value)} className="w-full px-4 py-2 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-xs" />
              </div>
              <div>
                <label htmlFor="publish-stage" className="block text-xs font-semibold text-[#0B1B3A] mb-1">{tr('项目阶段', 'Project stage')}</label>
                <select id="publish-stage" value={newStage} onChange={event => setNewStage(event.target.value as typeof newStage)} className="w-full px-4 py-2 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-xs">
                  <option value="idea">{tr('构思阶段', 'Idea')}</option><option value="prototype">{tr('原型阶段', 'Prototype')}</option><option value="demo">{tr('Demo 阶段', 'Demo')}</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-[#48597A]">
                <input id="publish-remote" type="checkbox" checked={selectedRemote} onChange={event => setRemoteChoice(event.target.checked)} />
                {tr('支持远程协作', 'Remote collaboration available')}
              </label>
              <div className="pt-4 flex justify-end gap-3 border-t border-[#E8EAED]">
                <button
                  type="button"
                  disabled={publishing} onClick={() => setPublishModalOpen(false)}
                  className="px-5 py-2 text-xs font-semibold text-[#666666]"
                >
                  {tr('取消', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={publishing}
                  className="px-6 py-2 text-xs font-semibold text-white bg-[#165DFF] hover:bg-[#1453E6] rounded-full shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {publishing ? tr('发布中…', 'Publishing…') : tr('发布招募帖', 'Publish')}
                </button>
              </div>
              </fieldset>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Apply to Join */}
      {applyModalOpen && selectedRecruit && dialogOwner === currentUser?.id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div role="dialog" aria-modal="true" aria-label={tr('申请参与项目', 'Apply to collaborate')} className="relative w-full max-w-md max-h-[calc(100svh-2rem)] overflow-y-auto bg-white rounded-3xl p-6 shadow-floating border border-[#E8EAED]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8EAED] mb-3">
              <h3 className="text-base font-bold text-[#0B1B3A]">{tr('申请参与项目', 'Apply to collaborate')}</h3>
              <button
                disabled={applying} onClick={() => setApplyModalOpen(false)}
                className="p-1.5 text-[#888888] hover:text-[#0B1B3A] rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {appliedSuccess ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-[#00C48C] mx-auto" />
                <h4 className="text-base font-bold text-[#0B1B3A]">{selectedRecruit.applicationStatus === 'accepted' ? tr('发起人愿意进一步沟通', 'The founder is open to a conversation') : selectedRecruit.applicationStatus === 'declined' ? tr('本次申请暂不合适', 'Not a fit this time') : selectedRecruit.applicationStatus === 'handled' ? tr('申请已处理', 'Application handled') : tr('申请已提交', 'Application Sent')}</h4>
                <p className="text-xs text-[#666666]">
                  {selectedRecruit.applicationStatus === 'declined' ? tr('你仍可在创客社区寻找其他合作机会。', 'You can explore other opportunities in the community.') : selectedRecruit.applicationStatus === 'accepted' || selectedRecruit.applicationStatus === 'handled' ? tr('请继续与发起人沟通合作安排；正式入队仍需战队邀请。', 'Discuss the next steps with the founder. Formal membership still requires a team invitation.') : tr(`已通知 ${selectedRecruit.leader.name}，处理结果会通过站内通知告知；这不会自动加入正式战队。`, `Your application was saved and ${selectedRecruit.leader.name} has been notified — track it in Messages.`)}
                </p>
                <button
                  type="button"
                  disabled={applying} onClick={() => setApplyModalOpen(false)}
                  className="px-5 py-2 text-xs font-semibold text-[#165DFF] bg-[#F2F7FF] rounded-full"
                >
                  {tr('知道了', 'Got it')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmApply} className="space-y-4">
                <div className="p-3 doa-panel text-xs">
                  <div className="font-semibold text-[#0B1B3A] mb-1">{selectedRecruit.title}</div>
                  <div className="text-[#666666]">{tr('发起人：', 'Founder: ')}{selectedRecruit.leader.name}</div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B1B3A] mb-1">
                    {tr('向发起人介绍你的技能与合作意向', 'Introduce your skills and collaboration interests')}
                  </label>
                  <textarea
                    rows={4}
                    required
                    id="recruit-apply-message" maxLength={1000} disabled={applying} value={applyMessage}
                    onChange={e => setApplyMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-xs focus:outline-none focus:border-[#165DFF]"
                  />
                </div>

                {applyError && <p role="alert" className="text-[11px] text-red-600">{applyError}</p>}

                <div className="flex justify-end gap-2 pt-2 border-t border-[#E8EAED]">
                  <button
                    type="button"
                    disabled={applying} onClick={() => setApplyModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#666666]"
                  >
                    {tr('取消', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={applying || !applyMessage.trim()}
                    className="px-6 py-2 text-xs font-semibold text-white bg-[#165DFF] hover:bg-[#1453E6] rounded-full disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {applying ? tr('提交中…', 'Sending…') : tr('发送加入申请', 'Send Application')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
