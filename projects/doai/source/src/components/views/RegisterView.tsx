import { registrationChannels, registrationChannelLabel, validRegistrationChannel, type RegistrationChannel } from '../../lib/registrationChannel.ts';
import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AlertCircle,
  Users,
  User,
  Link as LinkIcon,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { TrackType, TeamMember } from '../../types';
import { clearRegistrationRequest, RegistrationConflict, type RegistrationReceipt } from '../../lib/registrationRequest';
import { loadRegistrationTeam, type RegistrationTeam } from '../../lib/registrationTeam';
import { maskedAccountPhone } from '../../lib/accountPhone';
import { parseRegistrationSkills, validApplicantEmail } from '../../lib/registrationContent';
import { entryOptions, encodeEntrySummary, validOverseasAffiliation, readEntrySummary, registrationTrackLabel } from '../../lib/contestEntry';
import { isTrackRegistrationOpen, isRegistrationRouteOpen, registrationAvailability } from '../../lib/contestRegistration';

export const RegisterView: React.FC = () => {
  const { lang, currentUser, setLoginModalOpen, submitRegistration, setActiveRoute, activeRoute, tr, teamRevision } = useApp();

  // 从赛道详情页带过来：register/industry、register/creator、register/overseas
  const routeTrack = activeRoute.split('/')[1];
  const initialTrack: TrackType = routeTrack === 'industry' ? 'industry' : 'creator';
  const registrationClosed = !!routeTrack && !isRegistrationRouteOpen(routeTrack);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [overseas, setOverseas] = useState(routeTrack === 'overseas');
  const [countryOrRegion, setCountryOrRegion] = useState('');
  const [university, setUniversity] = useState('');
  useEffect(() => { setOverseas(routeTrack === 'overseas'); }, [routeTrack]);

  // Form State
  const channelsEnabled = currentUser?.registrationChannelsEnabled === true;
  const [channel, setChannel] = useState<RegistrationChannel | ''>('');
  const [personalName, setPersonalName] = useState(currentUser?.name || '');
  const [personalCity, setPersonalCity] = useState(currentUser?.city || '');
  const [personalSkills, setPersonalSkills] = useState(currentUser?.skills?.join('、') || '');
  const [organization, setOrganization] = useState('');
  const [position, setPosition] = useState('');
  const [age, setAge] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [personalBio, setPersonalBio] = useState(currentUser?.bio || '');

  // Step 2: Team State
  const [regType, setRegType] = useState<'individual' | 'team'>('team');
  const [teamName, setTeamName] = useState('');
  const [teamReload, setTeamReload] = useState(0);
  // The hall opens in another tab so this form stays mounted with its draft.
  useEffect(() => {
    const refreshTeam = () => {
      if (document.visibilityState === 'visible') setTeamReload(value => value + 1);
    };
    window.addEventListener('focus', refreshTeam);
    document.addEventListener('visibilitychange', refreshTeam);
    return () => {
      window.removeEventListener('focus', refreshTeam);
      document.removeEventListener('visibilitychange', refreshTeam);
    };
  }, []);
  const [teamState, setTeamState] = useState<{ owner: string | null; state: 'loading' | 'ready' | 'error'; team: RegistrationTeam | null }>({ owner: null, state: 'loading', team: null });
  const team = teamState.owner === currentUser?.id ? teamState.team : null;
  const teamReady = teamState.owner === currentUser?.id && teamState.state === 'ready';
  const members: TeamMember[] = team ? team.members.map(member => ({ ...member, phone: '' })) : currentUser ? [{ id: currentUser.id, name: personalName, phone: '', roleTitle: '队长', isLeader: true }] : [];
  useEffect(() => {
    const owner = currentUser?.id;
    if (!owner) { setTeamState({ owner: null, state: 'loading', team: null }); return; }
    let live = true;
    setTeamState({ owner, state: 'loading', team: null });
    void loadRegistrationTeam(owner).then(team => { if (live) setTeamState({ owner, state: 'ready', team }); })
      .catch(() => { if (live) setTeamState({ owner, state: 'error', team: null }); });
    return () => { live = false; };
  }, [currentUser?.id, teamRevision, teamReload]);

  const formOwner = useRef(currentUser?.id || null);
  useEffect(() => {
    const owner = currentUser?.id || null;
    if (formOwner.current && formOwner.current !== owner) {
      setPersonalName(currentUser?.name || ''); setPersonalCity(currentUser?.city || ''); setPersonalSkills(currentUser?.skills?.join('、') || '');
      setOrganization(''); setPosition(''); setAge(''); setChannel('');
      setPersonalEmail(''); setPersonalBio(currentUser?.bio || ''); setTeamName(''); setProjectName(''); setProjectSummary('');
      setReceipt(null); setConflict(null); setValidationError(''); setCurrentStep(1); setRegType('team');
    setCountryOrRegion(''); setUniversity('');
    }
    formOwner.current = owner;
    setPersonalName(previous => previous || currentUser?.name || '');
    setPersonalCity(previous => previous || currentUser?.city || '');
    setPersonalSkills(previous => previous || currentUser?.skills?.join('、') || '');
    setPersonalBio(previous => previous || currentUser?.bio || '');
  }, [currentUser?.id]);

  // Step 3: Project State
  const [projectName, setProjectName] = useState('');
  const [track, setTrack] = useState<TrackType>(initialTrack);
  const [entryId, setEntryId] = useState(() => entryOptions.find(option => option.id === activeRoute.split('/')[2] && option.track === initialTrack)?.id || '');
  useEffect(() => {
    const routeEntry = activeRoute.split('/')[2];
    setTrack(initialTrack);
    setEntryId(previous => {
      if (entryOptions.some(option => option.id === routeEntry && option.track === initialTrack)) return routeEntry;
      return entryOptions.some(option => option.id === previous && option.track === initialTrack) ? previous : '';
    });
  }, [activeRoute, initialTrack]);
  const teamTrackMismatch = regType === 'team' && !!team && track !== team.track;
  const selectedEntry = entryOptions.find(option => option.id === entryId && option.track === track);
  const [projectSummary, setProjectSummary] = useState('');

  // Step 4: Submission result
  const [receipt, setReceipt] = useState<RegistrationReceipt | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (currentStep !== 4 || !receipt) return;
    resultRef.current?.focus({ preventScroll: true });
    resultRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [currentStep, receipt]);
  const [conflict, setConflict] = useState<RegistrationConflict | null>(null);
  const [validationError, setValidationError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  const handleStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    if (registrationClosed || !isTrackRegistrationOpen(track)) {
      setValidationError(tr(registrationAvailability.zh, registrationAvailability.en));
      return;
    }
    if (submitLock.current) return;
    if (!currentUser) { setLoginModalOpen(true); return; }
    if (overseas && !validOverseasAffiliation({ countryOrRegion, university })) {
      setCurrentStep(1);
      setValidationError(tr('请填写所在国家／地区（最多 100 字）和高校（最多 200 字）', 'Enter your country/region (up to 100 characters) and university (up to 200 characters)'));
      return;
    }

    if (!channelsEnabled && channel) { setValidationError(tr('渠道选择已变化，请保留草稿并重新加载页面后重试。', 'Channel options changed. Keep your draft and reload before retrying.')); return; }
    if (channelsEnabled && !validRegistrationChannel(channel)) { setCurrentStep(1); setValidationError(tr('请选择报名渠道', 'Select your registration channel')); return; }
    if (currentStep === 1) {
      if (!organization.trim() || organization.trim().length > 128 || !position.trim() || position.trim().length > 128 || !/^[0-9]+$/.test(age) || Number(age) < 1 || Number(age) > 150) {
        setValidationError(tr('请填写组织名称、职位／在读年级（各最多 128 字）及真实年龄（1–150 的整数）', 'Enter your organization, position / year of study (up to 128 characters each), and actual age (an integer from 1 to 150)')); return;
      }
      if (!personalName.trim() || !personalCity.trim()) {
        setValidationError('请完整填写个人姓名与城市');
        return;
      }
      if (!validApplicantEmail(personalEmail.trim()) || !personalBio.trim() || personalBio.trim().length > 2000) {
        setValidationError(tr('请填写有效邮箱和个人简介（最多 2000 字）', 'Enter a valid email and a personal introduction (up to 2,000 characters)'));
        return;
      }
      const skills = parseRegistrationSkills(personalSkills);
      if (personalName.trim().length > 64 || personalCity.trim().length > 64 || skills.length > 50 || skills.some(skill => skill.length > 100)) {
        setValidationError(tr('姓名与城市最多 64 字；技能最多 50 项，每项最多 100 字。', 'Name and city: up to 64 characters. Skills: up to 50, each up to 100 characters.'));
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (teamTrackMismatch) {
        setValidationError(tr('报名赛道与现有战队不一致，请使用战队所属赛道，或选择个人独立参赛。', 'Choose your team’s track or enter this track individually.'));
        return;
      }
      if (regType === 'team' && (!teamReady || (team && team.leaderId !== currentUser.id))) {
        setValidationError(tr('请先确认战队资料；团队报名须由队长提交。', 'Confirm your team first. Team entries must be submitted by the leader.'));
        return;
      }
      if (regType === 'team' && !(team?.name || teamName).trim()) {
        setValidationError('请填写团队名称');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (teamTrackMismatch) {
        setValidationError(tr('报名赛道与现有战队不一致，请使用战队所属赛道，或选择个人独立参赛。', 'Choose your team’s track or enter this track individually.'));
        return;
      }
      if (!selectedEntry) {
        setValidationError(tr('请选择具体企业命题或技术方向', 'Please select a business brief or technical direction'));
        return;
      }
      if (!projectName.trim() || !projectSummary.trim()) {
        setValidationError('请完整填写项目名称与项目介绍');
        return;
      }
      if (regType === 'team' && (!teamReady || (team && team.leaderId !== currentUser.id))) {
        setValidationError(tr('请重新加载战队并由队长提交报名。', 'Reload the team and ask its leader to submit.'));
        return;
      }
      // Submit registration
      submitLock.current = true;
      setSubmitting(true);
      setConflict(null);
      try {
      const result = await submitRegistration({
        ...(channelsEnabled && validRegistrationChannel(channel) ? { channel } : {}),
        applicant: { organization: organization.trim(), position: position.trim(), age: Number(age), name: personalName.trim(), city: personalCity.trim(), skills: parseRegistrationSkills(personalSkills), email: personalEmail.trim(), bio: personalBio.trim() },
        type: regType,
        track,
        teamName: regType === 'team' ? (team?.name || teamName) : personalName,
        ...(regType === 'team' ? { teamBinding: team ? { kind: 'existing' as const, id: team.id } : { kind: 'create' as const } } : {}),
        projectName,
        projectSummary: encodeEntrySummary(selectedEntry.id, projectSummary, overseas ? { countryOrRegion, university } : undefined),
        videoUrl: '',
        docUrl: '',
        members: regType === 'team' ? members.map(member => member.isLeader ? {
          ...member, id: currentUser.id, name: personalName, phone: '',
        } : member) : [{
          id: currentUser.id,
          name: personalName,
          phone: currentUser.phone,
          roleTitle: '个人独立开发者',
          isLeader: true,
        }],
      });

      setReceipt(result);
      setCurrentStep(4);
      } catch (error) {
        if (error instanceof RegistrationConflict) setConflict(error);
        setValidationError(error instanceof Error ? error.message : '报名失败，请重试');
      } finally { submitLock.current = false; setSubmitting(false); }
    }
  };

  if (registrationClosed) {
    return (
      <div className="pt-28 pb-24 max-w-[880px] mx-auto px-6 sm:px-8">
        <div className="rounded-3xl border border-[#E8EAED] bg-[#F7F8FA] p-8 sm:p-10 space-y-5">
          <h1 className="text-3xl font-bold text-[#0B1B3A]">{tr('该赛道已下线', 'This track is no longer available')}</h1>
          <p className="text-sm text-[#666666] leading-relaxed">{tr(registrationAvailability.zh, registrationAvailability.en)}</p>
          <div className="flex flex-wrap gap-4">
            <button type="button" onClick={() => setActiveRoute('register/creator')} className="doa-btn doa-btn-primary">{tr('报名自由创意赛道', 'Register for Free Creation')}</button>
            <button type="button" onClick={() => setActiveRoute('maker/tracks')} className="text-sm font-semibold text-[#165DFF]">{tr('返回赛事中心', 'Back to Contest')}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-24 max-w-[880px] mx-auto px-6 sm:px-8">
      {/* Wizard Steps Header */}
      {currentStep < 4 && <div className="mb-10 text-center">
        <div className="text-xs font-semibold text-[#165DFF] tracking-wider uppercase mb-1">
          DOAI 2026 OFFICIAL REGISTRATION
        </div>
        <h1 className="text-3xl font-bold text-[#0B1B3A]">{tr('赛事项目申报通道', 'Contest Registration')}</h1>
        <p className="text-xs text-[#666666] mt-1.5 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00C48C]" />
          <span>{tr('全程免费申报 · 报名后可提交和更新作品链接 · 知识产权 100% 归团队所有', 'Free to enter · submit and update work links after registration · 100% of the IP stays with your team')}</span>
        </p>
        <p className="text-xs text-[#666666] mt-3">{tr(registrationAvailability.zh, registrationAvailability.en)}</p>

        {/* Steps Breadcrumbs */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mt-8 text-xs font-semibold">
          {[
            { num: 1, label: '01 申报人信息', labelEn: '01 Applicant' },
            { num: 2, label: '02 参赛模式', labelEn: '02 Entry Type' },
            { num: 3, label: '03 项目与作品', labelEn: '03 Project' },
            { num: 4, label: '04 完成与凭证', labelEn: '04 Done' },
          ].map(s => (
            <div key={s.num} className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
                  currentStep === s.num
                    ? 'bg-[#165DFF] text-white shadow-xs'
                    : currentStep > s.num
                    ? 'bg-[#00C48C] text-white'
                    : 'bg-neutral-100 text-neutral-400'
                }`}
              >
                {currentStep > s.num ? '✓' : s.num}
              </span>
              <span
                className={`hidden sm:inline ${
                  currentStep === s.num ? 'text-[#0B1B3A]' : 'text-neutral-400'
                }`}
              >
                {tr(s.label, s.labelEn)}
              </span>
              {s.num < 4 && <span className="text-neutral-300 mx-1">→</span>}
            </div>
          ))}
        </div>
      </div>}

      {/* 每一步都展示具体申报方向；更换方向保留已填写的团队和项目资料。 */}
      {currentStep < 4 && (
        <section aria-label={tr('申报方向', 'Entry direction')} className="mb-6 rounded-2xl border border-[#D5E1F1] bg-[#F7FAFF] p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="group" aria-label={tr('申报赛道', 'Track')}>
            {(['industry', 'creator'] as const).map(value => (
              <button key={value} type="button" aria-pressed={!overseas && track === value} disabled={submitting || !isTrackRegistrationOpen(value)}
                onClick={() => { setActiveRoute(`register/${value}`); setValidationError(''); }}
                className={`h-12 w-full min-w-0 rounded-full border px-4 py-2 text-center text-xs font-semibold leading-4 disabled:cursor-not-allowed ${!overseas && track === value ? 'bg-[#165DFF] border-[#165DFF] text-white' : 'border-[#D5E1F1] bg-white text-[#888888]'}`}>
                {value === 'industry' ? tr('FDE 赛道 · 企业命题', 'FDE · Business briefs') : tr('自由创意赛道', 'Free Creation')}
                {!isTrackRegistrationOpen(value) && <span> · {tr('暂未开放', 'Not open yet')}</span>}
              </button>
            ))}

          </div>
          {teamTrackMismatch && <div role="status" className="rounded-xl border border-[#F0DCC6] bg-[#FFF8F0] p-4 text-xs leading-relaxed text-[#7A4A16]">
            <p>{tr(`现有战队「${team!.name}」属于${team!.track === 'industry' ? 'FDE 赛道' : '自由创意赛道'}。团队报名须使用战队所属赛道；你也可以选择个人参赛，报名当前赛道。`, `Your existing team “${team!.name}” belongs to ${team!.track === 'industry' ? 'FDE' : 'Free Creation'}. Use that track for a team entry, or enter the selected track individually.`)}</p>
            <div className="mt-3 flex flex-wrap gap-4">
              <button type="button" disabled={submitting} onClick={() => { setActiveRoute(`register/${team!.track}`); setValidationError(''); }} className="font-semibold text-[#165DFF]">{tr('使用战队所属赛道', 'Use my team’s track')}</button>
              <button type="button" disabled={submitting} onClick={() => { setRegType('individual'); setValidationError(''); }} className="font-semibold text-[#165DFF]">{tr('改为个人参赛', 'Enter individually')}</button>
            </div>
          </div>}
          <div>
            <label htmlFor="entry-direction" className="block mb-2 text-xs font-semibold text-[#0B1B3A]">
              {track === 'industry' ? tr('具体企业命题', 'Business brief') : tr('技术方向', 'Technical direction')} <span className="text-red-500">*</span>
            </label>
            <select id="entry-direction" aria-required="true" disabled={submitting} value={entryId} onChange={event => setEntryId(event.target.value)} className="w-full min-w-0 rounded-xl border border-[#D5E1F1] bg-white px-3 py-3 text-sm text-[#0B1B3A]">
              <option value="">{tr('请选择申报方向', 'Choose your entry direction')}</option>
              {entryOptions.filter(option => option.track === track).map(option => (
                <option key={option.id} value={option.id}>{option.code} · {lang === 'en' ? option.labelEn : option.label}</option>
              ))}
            </select>
            {selectedEntry && <p className="mt-3 text-xs leading-relaxed text-[#48597A]">{selectedEntry.code} · {lang === 'en' ? selectedEntry.labelEn : selectedEntry.label}</p>}
          </div>
        </section>
      )}

      {/* Main Form Container */}
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#E8EAED] shadow-floating">
        {validationError && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-600 text-xs flex items-center gap-2 border border-red-100">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
        {currentStep === 3 && regType === 'team' && validationError && <button type="button" onClick={() => { setCurrentStep(2); setTeamReload(v => v + 1); }} className="mb-4 text-xs font-semibold text-[#165DFF]">{tr('返回并重新加载战队（保留项目草稿）', 'Reload team and keep the project draft')}</button>}
        {conflict && <div className="mb-6 min-w-0 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm space-y-3 [overflow-wrap:anywhere]" role="alert">
          <p>{tr('已保存项目：', 'Saved project: ')}{conflict.registration.projectName} · {conflict.registration.makerId}</p>
          <div className="flex flex-wrap gap-4">
            <button type="button" className="text-[#165DFF] font-semibold" onClick={() => setActiveRoute(`dashboard/registrations/${conflict.registration.id}`)}>{tr('查看已有报名', 'View saved entry')}</button>
            <button type="button" disabled={submitting} className="text-[#165DFF] font-semibold" onClick={() => {
              if (currentUser) clearRegistrationRequest(currentUser.id, conflict.requestKey);
              setConflict(null); setValidationError('');
            }}>{tr('另报项目（保留当前草稿）', 'Start another entry (keep this draft)')}</button>
          </div>
        </div>}

        <form onSubmit={handleStepSubmit} className="space-y-6">
          <fieldset disabled={submitting} className="space-y-6 min-w-0">
          {/* STEP 1: Basic Person Info */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h3 className="text-lg font-bold text-[#0B1B3A] pb-2 border-b border-[#E8EAED]">
                {tr('01. 申报人基础信息', '01. Applicant Information')}
              </h3>

              {overseas && <div className="rounded-2xl border border-[#D5E1F1] bg-[#F7FAFF] p-5 space-y-4">
                <p className="text-xs text-[#48597A]">{tr('海外报名沿用相同流程，请补充申报人所在国家／地区及所属高校。', 'Follow the same registration steps and add the applicant’s country/region and university.')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="overseas-country" className="block text-xs font-semibold text-[#0B1B3A] mb-1.5">{tr('所在国家／地区', 'Country / Region')} <span className="text-red-500">*</span></label>
                    <input id="overseas-country" required maxLength={100} autoComplete="country-name" value={countryOrRegion} onChange={event => setCountryOrRegion(event.target.value)} placeholder={tr('请输入所在国家或地区', 'Enter your country or region')} className="w-full px-4 py-2.5 bg-white border border-[#D5E1F1] rounded-xl text-sm focus:outline-none focus:border-[#165DFF]" />
                  </div>
                  <div>
                    <label htmlFor="overseas-university" className="block text-xs font-semibold text-[#0B1B3A] mb-1.5">{tr('所属高校', 'University')} <span className="text-red-500">*</span></label>
                    <input id="overseas-university" required maxLength={200} value={university} onChange={event => setUniversity(event.target.value)} placeholder={tr('请输入高校全称', 'Enter the full university name')} className="w-full px-4 py-2.5 bg-white border border-[#D5E1F1] rounded-xl text-sm focus:outline-none focus:border-[#165DFF]" />
                  </div>
                </div>
              </div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-[#0B1B3A] mb-1.5">
                    {tr('真实姓名 / 常用昵称', 'Name / Nickname')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={personalName}
                    maxLength={64}
                    onChange={e => setPersonalName(e.target.value)}
                    placeholder="请输入姓名"
                    className="w-full px-4 py-2.5 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-sm focus:outline-none focus:border-[#165DFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B1B3A] mb-1.5">
                    {tr('联系电话 (取自登录账户，不可更改)', 'Phone (from your account, read-only)')}
                  </label>
                  <input
                    type="text"
                    disabled
                    id="registration-account-phone"
                    value={currentUser ? (currentUser.maskedPhone || tr('账号暂无可显示的手机号', 'No account phone available')) : tr('登录后显示账号手机号', 'Shown after sign-in')}
                    className="w-full px-4 py-2.5 bg-neutral-100 border border-[#E8EAED] rounded-xl text-sm text-neutral-500 cursor-not-allowed"
                  />
                  <p className="mt-2 text-xs text-[#666666]">{tr('报名使用登录账号绑定的联系方式；此处仅显示脱敏号码供核对。', 'Registration uses your account contact; only a masked number is shown here.')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-[#0B1B3A] mb-1.5">
                    {tr('常驻城市', 'City')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={personalCity}
                    maxLength={64}
                    onChange={e => setPersonalCity(e.target.value)}
                    placeholder="例如: 深圳 / 北京 / 上海"
                    className="w-full px-4 py-2.5 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-sm focus:outline-none focus:border-[#165DFF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B1B3A] mb-1.5">
                    {tr('特长技能标签', 'Skills')}
                  </label>
                  <input
                    type="text"
                    value={personalSkills}
                    maxLength={6000}
                    onChange={e => setPersonalSkills(e.target.value)}
                    placeholder="以顿号分隔，例如: Agent架构、PyTorch"
                    className="w-full px-4 py-2.5 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-sm focus:outline-none focus:border-[#165DFF]"
                  />
                </div>
              </div>

              {channelsEnabled && <div>
                <label htmlFor="registration-channel" className="block text-xs font-semibold text-[#333333] mb-2">{tr('报名渠道', 'Registration channel')} <span className="text-[#FF7D00]">*</span></label>
                <select id="registration-channel" required value={channel} onChange={event => setChannel(event.target.value as RegistrationChannel | '')} className="w-full px-4 py-2.5 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-sm focus:outline-none focus:border-[#165DFF]">
                  <option value="" disabled>{tr('请选择报名渠道', 'Select your registration channel')}</option>
                  {registrationChannels.map(item => <option key={item.id} value={item.id}>{tr(item.zh, item.en)}</option>)}
                </select>
                <p className="mt-2 text-xs leading-relaxed text-[#6B7C9B]">{tr('请选择你本次报名的来源渠道，方便对应工作人员跟进。', 'Select where you registered from so the relevant team can follow up.')}</p>
              </div>}
              <div>
                <label htmlFor="registration-email" className="block text-xs font-semibold text-[#0B1B3A] mb-1.5">{tr('邮箱', 'Email')} <span className="text-red-500">*</span><span className="ml-2 text-[11px] font-normal leading-relaxed text-[#6B7C9B]">{tr('（Token积分兑换码将通过邮箱发放）', '(Token credit redemption codes will be sent by email)')}</span></label>
                <input id="registration-email" type="email" required maxLength={254} autoComplete="email" value={personalEmail} onChange={event => setPersonalEmail(event.target.value)} placeholder="name@example.com" className="w-full px-4 py-2.5 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-sm focus:outline-none focus:border-[#165DFF]" />
              </div>
              <div>
                <label htmlFor="registration-bio" className="block text-xs font-semibold text-[#0B1B3A] mb-1.5">{tr('个人简介', 'Personal introduction')} <span className="text-red-500">*</span></label>
                <textarea id="registration-bio" required maxLength={2000} rows={4} value={personalBio} onChange={event => setPersonalBio(event.target.value)} placeholder={tr('请介绍你的背景、经历与关注方向（最多 2000 字）', 'Introduce your background, experience and interests (up to 2,000 characters)')} className="w-full px-4 py-2.5 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-sm focus:outline-none focus:border-[#165DFF]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="registration-organization" className="block text-xs font-semibold text-[#0B1B3A] mb-1.5">{tr('公司/学校/机构组织名称', 'Company / school / organization')} <span className="text-red-500">*</span></label>
                  <input id="registration-organization" required maxLength={128} autoComplete="organization" value={organization} onChange={event => setOrganization(event.target.value)} placeholder={tr('个人或自由职业者可填写“个人/自由职业”', 'Individuals may enter “Individual / Freelance”')} className="w-full px-4 py-2.5 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-sm focus:outline-none focus:border-[#165DFF]" />
                </div>
                <div>
                  <label htmlFor="registration-position" className="block text-xs font-semibold text-[#0B1B3A] mb-1.5">{tr('职位/在读年级', 'Position / year of study')} <span className="text-red-500">*</span></label>
                  <input id="registration-position" required maxLength={128} value={position} onChange={event => setPosition(event.target.value)} placeholder={tr('例如：工程师、大三、研一', 'For example: Engineer, Year 3, Graduate Year 1')} className="w-full px-4 py-2.5 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-sm focus:outline-none focus:border-[#165DFF]" />
                </div>
                <div>
                  <label htmlFor="registration-age" className="block text-xs font-semibold text-[#0B1B3A] mb-1.5">{tr('年龄（请如实填写）', 'Age (please enter truthfully)')} <span className="text-red-500">*</span></label>
                  <input id="registration-age" type="number" min={1} max={150} step={1} required inputMode="numeric" value={age} onChange={event => setAge(event.target.value)} placeholder={tr('请填写周岁', 'Age in completed years')} className="w-full px-4 py-2.5 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-sm focus:outline-none focus:border-[#165DFF]" />
                </div>
              </div>
              <p className="text-xs text-[#666666]">{tr('申报人资料随本次报名保存，供本人和赛事审核人员查看。', 'Applicant information is saved with this entry for you and contest reviewers.')}</p>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit" disabled={submitting}
                  className="px-8 py-3 text-xs font-semibold text-white bg-[#165DFF] hover:bg-[#1453E6] rounded-full transition-all shadow-sm flex items-center gap-1.5"
                >
                  <span>{tr('下一步：参赛模式', 'Next: Entry Type')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Team / Individual Info */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h3 className="text-lg font-bold text-[#0B1B3A] pb-2 border-b border-[#E8EAED]">
                {tr('02. 参赛模式与团队成员', '02. Entry Type & Team')}
              </h3>

              {/* Individual or Team Selector */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRegType('team')}
                  className={`p-5 rounded-2xl border text-left transition-all ${
                    regType === 'team'
                      ? 'border-[#165DFF] bg-[#165DFF]/5 shadow-xs'
                      : 'border-[#E8EAED] bg-[#F7F8FA] hover:border-neutral-300'
                  }`}
                >
                  <Users className="w-5 h-5 text-[#165DFF] mb-2" />
                  <div className="text-sm font-bold text-[#0B1B3A]">{tr('战队联合参赛 (推荐)', 'Team Entry (Recommended)')}</div>
                  <div className="text-xs text-[#666666] mt-0.5">{tr('支持 1–5 人，鼓励角色互补协作', '1–5 members; complementary roles encouraged')}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRegType('individual')}
                  className={`p-5 rounded-2xl border text-left transition-all ${
                    regType === 'individual'
                      ? 'border-[#165DFF] bg-[#165DFF]/5 shadow-xs'
                      : 'border-[#E8EAED] bg-[#F7F8FA] hover:border-neutral-300'
                  }`}
                >
                  <User className="w-5 h-5 text-[#00C48C] mb-2" />
                  <div className="text-sm font-bold text-[#0B1B3A]">{tr('个人独立参赛', 'Solo Entry')}</div>
                  <div className="text-xs text-[#666666] mt-0.5">{tr('一人全栈冲刺，独立扛鼎', 'One maker, full-stack sprint')}</div>
                </button>
              </div>

              {regType === 'team' && (
                <div className="space-y-5 pt-2">
                  <div className="rounded-2xl border border-[#165DFF]/15 bg-[#165DFF]/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#0B1B3A]">{tr('还在寻找队友？', 'Still looking for teammates?')}</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#666666]">{tr('在新标签页浏览战队、申请加入；保留当前报名内容，切回后自动更新战队信息。', 'Browse teams and apply in a new tab. Your form stays here; team details refresh when you return.')}</p>
                    </div>
                    <a href={`${import.meta.env.BASE_URL}square/teams`} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#165DFF]/25 bg-white px-4 py-2.5 text-xs font-semibold text-[#165DFF] hover:bg-[#165DFF]/5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#165DFF]">
                      {tr('去组队大厅找队友', 'Find teammates in the hall')}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </div>
                  {!teamReady ? (
                    <div className="doa-panel p-4 text-sm" role="status">
                      <p>{teamState.state === 'error' ? tr('战队资料加载失败，请重试后再报名。', 'Could not load your team. Retry before entering.') : tr('正在读取我的战队…', 'Loading your team…')}</p>
                      {teamState.state === 'error' && <button type="button" onClick={() => setTeamReload(v => v + 1)} className="mt-3 text-[#165DFF]">{tr('重新加载战队', 'Reload team')}</button>}
                    </div>
                  ) : <>
                    <div className="doa-panel p-4 text-xs leading-relaxed space-y-2">
                      <p className="font-semibold">{team ? tr('已关联“我的战队”', 'Linked to My Team') : tr('报名成功后将同步创建到“我的战队”', 'A team will be created in My Team when registration succeeds')}</p>
                      <p>{team ? tr('使用当前队名和已确认成员，团队报名由队长提交。', 'Use the saved name and confirmed members. The leader submits the entry.') : tr('你将成为队长。队友须接受入队邀请后才会成为正式成员；本次先以当前成员报名。', 'You will be the leader. Teammates become members after accepting invitations; this entry uses the current roster.')}</p>
                      {team && team.leaderId !== currentUser?.id && <p className="text-red-600">{tr('你是战队成员，请联系队长提交团队报名，或选择个人参赛。', 'Ask the leader to submit the team entry, or enter solo.')}</p>}
                      <div className="flex flex-wrap gap-4">
                        <button type="button" onClick={() => setActiveRoute('dashboard/team')} className="font-semibold text-[#165DFF]">{tr('去我的战队管理成员', 'Manage members in My Team')}</button>
                        <button type="button" onClick={() => setTeamReload(v => v + 1)} className="text-[#165DFF]">{tr('重新加载战队', 'Reload team')}</button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="registration-team-name" className="block text-xs font-semibold text-[#0B1B3A] mb-1.5">{tr('战队名称', 'Team Name')} <span className="text-red-500">*</span></label>
                      <input id="registration-team-name" type="text" required maxLength={64} readOnly={!!team} value={team?.name || teamName} onChange={e => setTeamName(e.target.value)} placeholder="例如: Synapse Core" className="w-full px-4 py-2.5 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-sm focus:outline-none focus:border-[#165DFF]" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold mb-2">{tr('已确认成员', 'Confirmed members')} ({members.length}/5)</div>
                      <div className="space-y-2">
                        {members.map(member => <div key={member.id} className="flex min-w-0 flex-wrap items-center gap-2 p-3.5 doa-panel text-xs">
                          <span className="font-semibold [overflow-wrap:anywhere]">{member.isLeader ? personalName : member.name}</span>
                          <span className="text-[#888888]">{member.roleTitle}</span>
                          {member.isLeader && <span className="text-[#888888]">{currentUser?.maskedPhone}</span>}
                          {member.isLeader && <span className="text-[#165DFF] font-semibold">{tr('战队队长', 'Leader')}</span>}
                        </div>)}
                      </div>
                    </div>
                  </>}
                </div>
              )}

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-2.5 text-xs font-semibold text-[#666666] hover:text-[#0B1B3A] transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{tr('返回上一步', 'Back')}</span>
                </button>

                <button
                  type="submit" disabled={submitting || (regType === 'team' && (!teamReady || (!!team && team.leaderId !== currentUser?.id)))}
                  className="px-8 py-3 text-xs font-semibold text-white bg-[#165DFF] hover:bg-[#1453E6] rounded-full transition-all shadow-sm flex items-center gap-1.5"
                >
                  <span>{tr('下一步：项目与作品', 'Next: Project')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Project Information */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h3 className="text-lg font-bold text-[#0B1B3A] pb-2 border-b border-[#E8EAED]">
                {tr('03. 申报项目信息（作品链接在报名成功后于「提交作品」中填写）', '03. Project (work links are submitted after registration)')}
              </h3>

              {/* 申报赛道：只读展示（由赛道详情页带入，不再重复选择） */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-[#E8EAED] bg-[#F7F8FA]">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-[#0B1B3A]">{tr('申报赛道', 'Track')}</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      track === 'industry'
                        ? 'bg-[#165DFF]/10 text-[#165DFF]'
                        : 'bg-[#00C48C]/10 text-[#00A57A]'
                    }`}
                  >
                    {track === 'industry' ? tr('FDE 赛道 · 真实企业命题', 'FDE Track · Real Business Briefs') : overseas ? tr('海外专场赛道', 'Overseas Special Track') : tr('自由创意赛道', 'Free Creation Track')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => document.getElementById('entry-direction')?.focus()}
                  className="text-[11px] font-semibold text-[#888888] hover:text-[#165DFF] transition-colors"
                >
                  {tr('更换申报方向 ↑', 'Change direction ↑')}
                </button>
              </div>

              <p className="text-sm font-semibold text-[#165DFF]" data-testid="selected-entry">
                {tr('申报方向：', 'Entry: ')}{selectedEntry ? `${selectedEntry.code} · ${lang === 'en' ? selectedEntry.labelEn : selectedEntry.label}` : tr('请在上方选择', 'Choose above')}
              </p>

              <div>
                <label className="block text-xs font-semibold text-[#0B1B3A] mb-1.5">
                  {tr('项目名称', 'Project Name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="例如: NeuroFlow 自适应多智能体协作中枢"
                  className="w-full px-4 py-2.5 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-sm focus:outline-none focus:border-[#165DFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B1B3A] mb-1.5">
                  {tr('一句话介绍与核心技术方案', 'Summary & Core Approach')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  maxLength={4000}
                  required
                  value={projectSummary}
                  onChange={e => setProjectSummary(e.target.value)}
                  placeholder="请用 100-200 字阐明项目的核心痛点、技术突破点与实际落地价值..."
                  className="w-full px-4 py-2.5 bg-[#F7F8FA] border border-[#E8EAED] rounded-xl text-sm focus:outline-none focus:border-[#165DFF]"
                />
              </div>

              {/* Privacy Reassurance Note */}
              <div className="p-4 doa-panel text-xs text-[#666666] flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#00C48C] shrink-0 mt-0.5" />
                <span>
                  <strong>项目保密承诺</strong>：本表单提交的项目方案与视频仅限 DOAI 评委会保密评阅，官网广场绝不公开展示项目细节与商业机密。
                </span>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2.5 text-xs font-semibold text-[#666666] hover:text-[#0B1B3A] transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{tr('返回上一步', 'Back')}</span>
                </button>

                <button
                  type="submit" disabled={submitting}
                  className="px-8 py-3 text-xs font-semibold text-white bg-[#165DFF] hover:bg-[#1453E6] rounded-full transition-all shadow-md flex items-center gap-1.5"
                >
                  <span>{submitting ? tr('正在提交，请稍候…', 'Submitting, please wait…') : tr('立即提交申报 · 生成 Maker ID', 'Submit · Get Maker ID')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Success & Credentials Generation */}
          {currentStep === 4 && receipt && (
            <div className="space-y-6">
              <div ref={resultRef} tabIndex={-1} role="status" aria-labelledby="registration-result-title" className="scroll-mt-24 rounded-3xl border-2 border-[#A9DFCD] bg-[#F0FBF6] p-6 sm:p-8 text-center focus:outline-none">
                <h1 id="registration-result-title" className="text-2xl sm:text-3xl font-extrabold text-[#0B1B3A]">{receipt.created ? tr('报名提交成功！', 'Registration submitted!') : tr('报名已提交', 'Registration saved')}</h1>
                <p className="mt-3 text-sm sm:text-base text-[#48597A] leading-relaxed">{({ submitted: tr('已提交，待审核。', 'Submitted. Awaiting review.'), reviewing: tr('审核中。', 'Under review.'), needs_info: tr('请补充报名资料。', 'Please complete your entry.'), shortlisted: tr('已入围。', 'Shortlisted.'), rejected: tr('请查看审核意见。', 'Please check the review feedback.') })[receipt.registration.status]}</p>
                <div className="mt-6 flex flex-col sm:flex-row items-stretch justify-center gap-3">
                  <button type="button" onClick={() => setActiveRoute(`dashboard/registrations/${receipt.registration.id}`)} className="doa-btn doa-btn-primary min-h-12 whitespace-normal">
                    {receipt.registration.status === 'rejected' ? tr('查看审核意见', 'View feedback') : tr('提交作品', 'Submit work')}
                  </button>
                  <button type="button" onClick={() => setActiveRoute('dashboard/registrations')} className="doa-btn doa-btn-ghost min-h-12 whitespace-normal">
                    {tr('我的报名', 'My registrations')}
                  </button>
                </div>
              </div>
              <p className="text-center text-sm font-semibold text-[#165DFF]">{selectedEntry?.code} · {lang === 'en' ? selectedEntry?.labelEn : selectedEntry?.label}</p>

              {/* Maker ID Voucher Box */}
              <div className="max-w-md min-w-0 mx-auto p-6 doa-panel text-left space-y-3 [overflow-wrap:anywhere]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#888888]">专属创客标识</span>
                  <span className="text-xs font-bold text-[#00C48C] bg-[#00C48C]/10 px-2.5 py-0.5 rounded-full">
                    {({ submitted: tr('已提交', 'Submitted'), reviewing: tr('审核中', 'In review'), needs_info: tr('待补充', 'Needs information'), shortlisted: tr('已入围', 'Shortlisted'), rejected: tr('未通过', 'Rejected') })[receipt.registration.status]}
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-medium font-mono leading-relaxed break-all text-[#165DFF]">
                  {receipt.registration.makerId}
                </div>
                <div className="text-xs text-[#666666] space-y-1 pt-2 border-t border-[#E8EAED]">
                  {receipt.registration.reviewFeedback && <p className="whitespace-pre-wrap">{tr('审核意见：', 'Review feedback: ')}{receipt.registration.reviewFeedback}</p>}
                  <div>项目名称：{receipt.registration.projectName}</div>
                  <div>{tr('报名渠道：', 'Registration channel: ')}{registrationChannelLabel(receipt.registration.channel, lang === 'en')}</div>
                  {receipt.registration.applicant && <><div>{tr('公司/学校/机构组织名称：', 'Organization: ')}{receipt.registration.applicant.organization || tr('未填写', 'Not provided')}</div><div>{tr('职位/在读年级：', 'Position / year: ')}{receipt.registration.applicant.position || tr('未填写', 'Not provided')}</div><div>{tr('年龄：', 'Age: ')}{receipt.registration.applicant.age ?? tr('未填写', 'Not provided')}</div><div>{tr('申报城市：', 'Applicant city: ')}{receipt.registration.applicant.city}</div><div>{tr('申报技能：', 'Applicant skills: ')}{receipt.registration.applicant.skills.join('、') || tr('未填写', 'Not provided')}</div><div>{tr('申报邮箱：', 'Applicant email: ')}{receipt.registration.applicant.email || tr('未填写', 'Not provided')}</div><div className="whitespace-pre-wrap">{tr('个人简介：', 'Personal introduction: ')}{receipt.registration.applicant.bio || tr('未填写', 'Not provided')}</div></>}
                  {readEntrySummary(receipt.registration.projectSummary).overseas && <><div>{tr('所在国家／地区：', 'Country / Region: ')}{readEntrySummary(receipt.registration.projectSummary).overseas!.countryOrRegion}</div><div>{tr('所属高校：', 'University: ')}{readEntrySummary(receipt.registration.projectSummary).overseas!.university}</div></>}
                  <div>{tr('申报赛道：', 'Track: ')}{registrationTrackLabel(receipt.registration, lang === 'en')}</div>
                  <div>{tr('报名联系方式：', 'Contact phone: ')}{receipt.registration.accountContact
                    ? (maskedAccountPhone(undefined, receipt.registration.accountContact.phone) || tr('账号未留存手机号', 'No account phone saved'))
                    : tr('原报名未留存账号联系方式', 'No account contact saved on this entry')}</div>
                  <div>电子票券：已自动存入 DOAI Passport 数字身份卡</div>
                </div>


              </div>

            </div>
          )}
          </fieldset>
        </form>
      </div>
    </div>
  );
};
