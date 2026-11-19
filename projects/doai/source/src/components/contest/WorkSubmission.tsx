import React, { useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Registration } from '../../types';
import { contest } from '../../data/plan';

/** The server stores work links separately from the original registration. */
export const WorkSubmission: React.FC<{ registration: Registration }> = ({ registration }) => {
  const { submitWork, tr, lang } = useApp();
  const [editing, setEditing] = useState(false);
  const [videoUrl, setVideoUrl] = useState(registration.submission?.videoUrl || registration.videoUrl || '');
  const [demoUrl, setDemoUrl] = useState(registration.submission?.demoUrl || '');
  const [githubUrl, setGithubUrl] = useState(registration.submission?.githubUrl || '');
  const [docUrl, setDocUrl] = useState(registration.submission?.docUrl ?? registration.docUrl ?? '');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const submissionWindow = contest.timeline.find(item => item.title === '作品提交');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    setError('');
    const links = { videoUrl: videoUrl.trim(), demoUrl: demoUrl.trim(), githubUrl: githubUrl.trim(), docUrl: docUrl.trim() };
    if (!links.videoUrl) {
      setError(tr('请填写 Demo 视频链接', 'Enter a demo video URL'));
      return;
    }
    try {
      for (const value of Object.values(links)) {
        if (!value) continue;
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol) || value.length > 512) throw new Error();
      }
      if (links.githubUrl) {
        const github = new URL(links.githubUrl);
        if (github.protocol !== 'https:' || github.hostname !== 'github.com' || github.pathname.split('/').filter(Boolean).length < 2 || github.username || github.password) {
          setError(tr('请填写完整的 GitHub 仓库地址：https://github.com/组织或用户/仓库', 'Enter a full repository URL: https://github.com/owner/repository'));
          return;
        }
      }
    } catch {
      setError(tr('请填写有效的 http/https 链接，每个链接不超过 512 字符。', 'Use valid http/https links, up to 512 characters each.'));
      return;
    }
    submitting.current = true;
    setPending(true);
    try {
      await submitWork(registration.id, links);
      setEditing(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : tr('提交失败，请重试', 'Submission failed. Please retry.'));
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };

  const fields = [
    { id: 'video', label: tr('Demo 视频链接', 'Demo video URL'), required: true, value: videoUrl, set: setVideoUrl, placeholder: 'https://www.bilibili.com/video/BV...' },
    { id: 'demo', label: tr('在线 Demo / 官网', 'Live demo / website'), value: demoUrl, set: setDemoUrl, placeholder: 'https://your-demo.app' },
    { id: 'github', label: tr('GitHub 仓库链接', 'GitHub repository URL'), value: githubUrl, set: setGithubUrl, placeholder: 'https://github.com/your-team/your-repo' },
    { id: 'doc', label: tr('在线项目简介文档（如飞书）', 'Online project introduction document (e.g. Feishu)'), value: docUrl, set: setDocUrl, placeholder: 'https://your-team.feishu.cn/docx/...' },
  ];

  if (registration.submission && !editing) {
    return (
      <section className="doa-panel p-5 space-y-4" aria-label={tr('作品链接', 'Work links')}>
        <p role="status" className="text-sm font-semibold text-[#00A57A]">{tr('作品已提交', 'Work submitted')}</p>
        {[
          [tr('Demo 视频', 'Demo video'), registration.submission.videoUrl],
          [tr('在线 Demo', 'Live demo'), registration.submission.demoUrl],
          [tr('GitHub 仓库', 'GitHub repository'), registration.submission.githubUrl],
          [tr('在线项目简介文档', 'Project introduction document'), registration.submission.docUrl ?? registration.docUrl],
        ].filter(([, url]) => !!url).map(([label, url]) => (
          <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-xs text-[#165DFF]">
            <ExternalLink className="w-4 h-4 shrink-0" /><span className="min-w-0 break-all">{label} · {url}</span>
          </a>
        ))}
        <button type="button" className="doa-btn doa-btn-secondary" onClick={() => {
          setVideoUrl(registration.submission!.videoUrl);
          setDemoUrl(registration.submission!.demoUrl);
          setGithubUrl(registration.submission!.githubUrl);
          setDocUrl(registration.submission!.docUrl ?? registration.docUrl ?? '');
          setError('');
          setEditing(true);
        }}>{tr('更新作品链接', 'Update work links')}</button>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="doa-panel p-5 space-y-4" aria-label={tr('提交作品', 'Submit work')}>
      <h4 className="text-sm font-semibold text-[#0B1B3A]">{tr('提交作品', 'Submit work')}</h4>
      <p className="text-xs text-[#6B7C9B]">{tr('作品提交：', 'Work submission: ')}{lang === 'en' ? submissionWindow?.dateEn : submissionWindow?.date} · {tr('仅接受链接，不收文件', 'Links only')}</p>
      {fields.map(field => (
        <div key={field.id}>
          <label htmlFor={`work-${field.id}`} className="block mb-1 text-xs font-semibold text-[#0B1B3A]">{field.label} {field.required ? '*' : tr('（选填）', '(optional)')}</label>
          <input id={`work-${field.id}`} type="url" required={!!field.required} maxLength={512} disabled={pending} value={field.value} onChange={event => field.set(event.target.value)} placeholder={field.placeholder} className="w-full min-w-0 rounded-xl border border-[#E8EAED] bg-white px-3 py-3 text-sm" />
        </div>
      ))}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="doa-btn doa-btn-primary disabled:opacity-50">{pending ? tr('正在保存…', 'Saving…') : registration.submission ? tr('保存作品链接', 'Save work links') : tr('提交作品', 'Submit Work')}</button>
        {registration.submission && <button type="button" disabled={pending} onClick={() => setEditing(false)} className="doa-btn doa-btn-ghost">{tr('取消', 'Cancel')}</button>}
      </div>
    </form>
  );
};
