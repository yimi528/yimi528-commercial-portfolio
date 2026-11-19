import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DetailShell, NotFound } from '../detail/DetailShell';
import { schedule, typeMeta, dayMeta } from '../../data/conference';
import {
  Clock, MapPin, Users, Bookmark, Bell, Check, Navigation, Ticket,
} from 'lucide-react';

export const ScheduleDetailView: React.FC<{ id?: string }> = ({ id }) => {
  const { setActiveRoute, currentUser, setLoginModalOpen, tr, lang } = useApp();
  const [reminded, setReminded] = useState(false);
  const en = lang === 'en';

  const item = schedule.find(s => s.id === id);
  if (!item) return <NotFound what="该日程" whatEn="This session" backRoute="conference/schedule" backLabel="返回完整日程" backLabelEn="Back to full agenda" />;

  const meta = typeMeta[item.type];
  const day = dayMeta[item.day];

  const itemTitle = en ? item.titleEn : item.title;
  const itemVenue = en ? item.venueEn : item.venue;
  const itemDesc = en ? item.descriptionEn : item.description;

  const sameVenue = schedule.filter(s => s.venue === item.venue && s.id !== item.id);
  const sameDay = schedule.filter(s => s.day === item.day && s.id !== item.id);

  return (
    <DetailShell
      backRoute="conference/schedule"
      backLabel="返回完整日程"
      backLabelEn="Back to the full agenda"
      eyebrow={`${day.label} · ${day.date} · ${en ? meta.labelEn : meta.label}`}
      title={itemTitle}
      subtitle={itemDesc}
      meta={[
        { label: '日期', labelEn: 'Date', value: `${day.date} (${day.label})` },
        { label: '时间', labelEn: 'Time', value: `${item.startTime} - ${item.endTime}` },
        { label: '场地', labelEn: 'Venue', value: itemVenue },
        ...(item.speaker ? [{ label: '主讲', labelEn: 'Speaker', value: item.speaker }] : []),
        { label: '席位', labelEn: 'Seats', value: tr('不限人数', 'Unlimited') },
      ]}
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              if (!currentUser) return setLoginModalOpen(true);
              setReminded(r => !r);
            }}
            className="doa-btn doa-btn-primary"
          >
            {reminded ? (
              <><Check className="w-4 h-4" /> {tr('已加入日程', 'Added to my agenda')}</>
            ) : (
              <><Bell className="w-4 h-4" /> {tr('加入我的日程', 'Add to my agenda')}</>
            )}
          </button>
          <button type="button" className="doa-btn doa-btn-ghost">
            <Bookmark className="w-4 h-4" /> {tr('收藏', 'Save')}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="doa-card p-6 sm:p-7">
            <h2 className="text-lg font-bold text-[#0B1B3A] mb-5">{tr('时间与地点', 'When & Where')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-[#F7FAFF] border border-[#E3ECFA]">
                <Clock className="w-4 h-4 text-[#165DFF] mb-2" />
                <div className="text-[11px] uppercase tracking-wider text-[#98A6BE] font-semibold mb-1">
                  {tr('时间', 'Time')}
                </div>
                <div className="text-[13px] font-semibold text-[#1A2B4D] font-mono">{item.startTime} — {item.endTime}</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#F7FAFF] border border-[#E3ECFA]">
                <MapPin className="w-4 h-4 text-[#165DFF] mb-2" />
                <div className="text-[11px] uppercase tracking-wider text-[#98A6BE] font-semibold mb-1">
                  {tr('场地', 'Venue')}
                </div>
                <div className="text-[13px] font-semibold text-[#1A2B4D]">{itemVenue}</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#F7FAFF] border border-[#E3ECFA]">
                <Users className="w-4 h-4 text-[#165DFF] mb-2" />
                <div className="text-[11px] uppercase tracking-wider text-[#98A6BE] font-semibold mb-1">
                  {tr('形式', 'Format')}
                </div>
                <div className="text-[13px] font-semibold text-[#1A2B4D]">
                  {tr('自由参加 · 席位不限', 'Open to all · no seat limit')}
                </div>
              </div>
            </div>
          </section>

          <section className="doa-card p-6 sm:p-7">
            <h2 className="text-lg font-bold text-[#0B1B3A] mb-4">{tr('内容介绍', 'About This Session')}</h2>
            <p className="text-sm text-[#48597A] leading-[1.9]">
              {itemDesc || tr('该场次以现场安排为准，凭 DOAI Passport 直接入场。', 'Details follow the on-site schedule; enter directly with your DOAI Passport.')}
            </p>
            {item.speaker && (
              <div className="mt-6 pt-5 border-t border-[#E3ECFA]">
                <div className="text-[11px] uppercase tracking-wider text-[#98A6BE] font-semibold mb-2">
                  {tr('主讲嘉宾', 'Speaker')}
                </div>
                <div className="font-bold text-[#1A2B4D]">{item.speaker}</div>
              </div>
            )}
          </section>

          {sameDay.length > 0 && (
            <section className="doa-card p-6 sm:p-7">
              <h2 className="text-lg font-bold text-[#0B1B3A] mb-5">{tr('当天其他安排', 'Also on This Day')}</h2>
              <div className="space-y-2.5">
                {sameDay.map((s) => {
                  const m = typeMeta[s.type];
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveRoute(`detail/schedule/${s.id}`)}
                      className="w-full text-left flex items-center gap-4 p-3.5 rounded-2xl border border-[#E3ECFA] hover:border-[#A9CCFF] hover:bg-[#F7FAFF] transition-colors"
                    >
                      <span className="font-mono text-[12px] font-semibold text-[#6B7C9B] w-[86px] shrink-0">
                        {s.startTime}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0"
                        style={{ background: `${m.color}14`, color: m.color }}
                      >
                        {en ? m.labelEn : m.label}
                      </span>
                      <span className="text-[13px] font-medium text-[#1A2B4D] truncate">
                        {en ? s.titleEn : s.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="doa-card p-6">
            <h3 className="font-bold text-[#0B1B3A] text-sm mb-4">{tr('位置导航', 'Getting There')}</h3>
            <div className="rounded-2xl bg-[#F2F7FF] border border-[#E3ECFA] h-32 flex items-center justify-center mb-4">
              <Navigation className="w-7 h-7 text-[#A9CCFF]" />
            </div>
            <p className="text-[13px] font-semibold text-[#1A2B4D] mb-1">{itemVenue}</p>
            <button type="button" className="doa-btn doa-btn-secondary w-full">
              <Navigation className="w-4 h-4" /> {tr('打开地图导航', 'Open in maps')}
            </button>
          </section>

          {sameVenue.length > 0 && (
            <section className="doa-card p-6">
              <h3 className="font-bold text-[#0B1B3A] text-sm mb-3">{tr('同场地安排', 'In This Venue Too')}</h3>
              <div className="space-y-2.5">
                {sameVenue.slice(0, 4).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveRoute(`detail/schedule/${s.id}`)}
                    className="w-full text-left text-[13px] text-[#48597A] hover:text-[#165DFF] transition-colors py-1"
                  >
                    <span className="font-mono text-[11px] text-[#98A6BE] mr-2">{s.startTime}</span>
                    {en ? s.titleEn : s.title}
                  </button>
                ))}
              </div>
            </section>
          )}

          {item.type === 'roadshow' && (
            <section className="doa-panel p-6 border-[#A9CCFF] bg-[#F2F7FF]">
              <div className="flex items-center gap-2 mb-2">
                <Ticket className="w-4 h-4 text-[#165DFF]" />
                <h3 className="font-bold text-[#0B1B3A] text-sm">{tr('免费预约', 'Free Booking')}</h3>
              </div>
              <p className="text-[13px] text-[#48597A] leading-relaxed mb-4">
                {tr(
                  '该场次席位不限人数，可免费预约获取电子凭证。',
                  'There is no seat limit for this session — book free and get a digital pass.',
                )}
              </p>
              <button type="button" onClick={() => setActiveRoute('forum')} className="doa-btn doa-btn-ghost w-full">
                {tr('前往预约', 'Book now')}
              </button>
            </section>
          )}
        </aside>
      </div>
    </DetailShell>
  );
};
