import React from 'react';
import { useApp } from '../../context/AppContext';
export const PublishedNotice: React.FC = () => {
  const { cmsData, cmsPublished, cmsLoading, cmsLoadError, reloadCMS, lang, tr } = useApp();
  if(!cmsPublished&&!cmsLoadError)return null;
  const stats=cmsData.stats;
  const announcement=lang==='en'?(cmsData.announcementEn||cmsData.announcement):cmsData.announcement;
  const metrics=[
    [tr('创客规模','Makers'),stats.makers.toLocaleString(lang==='zh'?'zh-CN':'en-US')],
    [tr('决赛项目','Finalist projects'),stats.finalistProjects.toLocaleString(lang==='zh'?'zh-CN':'en-US')],
    [tr('奖项奖励','Awards'),(lang==='en'?(stats.prizePoolEn||stats.prizePool):stats.prizePool)||tr('待公布','To be announced')],
    [tr('评委规模','Judges'),stats.judges.toLocaleString(lang==='zh'?'zh-CN':'en-US')],
  ];
  return <section aria-label={tr('大会公告','Conference notice')} className="max-w-[1200px] mx-auto px-6 md:px-10 mt-10">
    <div className="doa-card p-6 sm:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">{tr('大会公告','Conference notice')}</h2><button type="button" disabled={cmsLoading} onClick={()=>void reloadCMS()} className="text-xs text-[#165DFF] disabled:opacity-50">{tr('刷新公告','Refresh notice')}</button></div>
      {cmsLoading&&<p role="status" className="text-sm text-[#6B7C9B]">{tr('正在读取公告…','Loading notice…')}</p>}
      {cmsLoadError&&<p role="status" className="text-sm text-[#6B7C9B]">{tr('公告暂时无法更新，请重试。','The notice could not be updated. Please retry.')}</p>}
      {cmsPublished&&<>{announcement&&<p className="text-sm text-[#48597A] leading-relaxed whitespace-pre-wrap break-words">{announcement}</p>}<dl className="grid grid-cols-2 sm:grid-cols-4 gap-5">{metrics.map(([label,value])=><div key={label} className="min-w-0"><dt className="text-xs text-[#6B7C9B]">{label}</dt><dd className="mt-2 text-xl font-bold text-[#165DFF] break-words">{value}</dd></div>)}</dl></>}
    </div>
  </section>;
};
