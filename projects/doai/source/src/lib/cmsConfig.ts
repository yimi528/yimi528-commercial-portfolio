import type { CMSData } from '../types';
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('公告配置格式无效，请重新读取');
  return value as Record<string, unknown>;
};
export function normalizeCMSConfig(value: unknown): CMSData {
  const config=object(value),stats=object(config.stats);
  const count=(value:unknown):number=>{
    if(typeof value!=='number'||!Number.isInteger(value)||value<0||value>1000000)throw new Error('公告指标须为 0 至 1000000 的整数');
    return value;
  };
  const text=(value:unknown,max:number,optional=false):string=>{
    if(optional&&value===undefined)return '';
    if(typeof value!=='string'||value.trim().length>max)throw new Error('公告文案格式或长度无效');
    return value.trim();
  };
  const streamUrl=text(config.streamUrl,512,true);
  if(streamUrl){let valid=false;try{valid=['http:','https:'].includes(new URL(streamUrl).protocol);}catch{}if(!valid)throw new Error('直播链接须为有效的 http/https 地址');}
  return {stats:{makers:count(stats.makers),finalistProjects:count(stats.finalistProjects),prizePool:text(stats.prizePool,32),prizePoolEn:text(stats.prizePoolEn,32,true),judges:count(stats.judges)},announcement:text(config.announcement,500),announcementEn:text(config.announcementEn,500,true),streamUrl};
}
export function readCMSResponse(value: unknown): {config:CMSData|null;updatedAt:string|null} {
  const result=object(value);
  if(result.config===null){if(result.updatedAt!=null)throw new Error('公告版本与内容不一致');return {config:null,updatedAt:null};}
  if(typeof result.updatedAt!=='string'||!Number.isFinite(Date.parse(result.updatedAt)))throw new Error('公告版本未返回，请重新读取');
  return {config:normalizeCMSConfig(result.config),updatedAt:result.updatedAt};
}
