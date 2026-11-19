/**
 * 现场空间导览 — 楼层标尺 + 逐点位图文。
 *
 * 原先内嵌在 ConferenceView 里，占了整页 22% 的高度，把报名按钮推到了第 9 屏。
 * 方案 A 把它整体迁到「双会场空间规划」模块页（module/venue），
 * 大会介绍页只保留一条入口。
 */
import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { venueGroups, venueImageNote, venueImageNoteEn } from '../../data/showcase';

const isKnownFloor = (id?: string): id is string =>
  !!id && venueGroups.some(g => g.id === id);

interface VenueGuideProps {
  /** 楼层深链：module/venue/1f 等，由 ModuleView 解析成楼层 id 后传入 */
  initialFloor?: string;
}

export const VenueGuide: React.FC<VenueGuideProps> = ({ initialFloor }) => {
  const { tr, lang } = useApp();
  const en = lang === 'en';
  const [activeFloor, setActiveFloor] = useState<string>(
    isKnownFloor(initialFloor) ? initialFloor : venueGroups[0].id,
  );
  const venueGroup = venueGroups.find(g => g.id === activeFloor) ?? venueGroups[0];

  // 同一页内从一个楼层深链换到另一个时，state 也要跟着走
  useEffect(() => {
    if (isKnownFloor(initialFloor)) setActiveFloor(initialFloor);
  }, [initialFloor]);

  return (
    <section id="venue-guide" className="scroll-mt-24">
      <div className="max-w-2xl mb-10">
        <h2 className="text-xl sm:text-2xl font-bold text-[#0B1B3A]">
          {tr('现场空间导览', 'Floor-by-Floor Venue Guide')}
        </h2>
        <p className="text-[13px] text-[#6B7C9B] mt-2 leading-relaxed">
          {tr(
            '两处场地，十五个点位。乐动虹桥这一栋里，1F 负责让人进来，4F—5F 负责让人散开；德必园区负责把人连到海外。',
            'Fifteen stops across two venues. In the LeDong building, 1F brings people in and 4F—5F spreads them out; Dobe Park connects them to the world.',
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[8.5rem_1fr] gap-x-10 gap-y-8">
        {/* 楼层标尺：当前层填墨蓝，刻度沿一条竖脊排列 */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="hidden lg:block text-[10px] font-semibold tracking-[0.18em] text-[#98A6BE] mb-3">
            {tr('楼层', 'LEVEL')}
          </div>
          <div className="relative flex flex-wrap items-start gap-x-7 gap-y-4 lg:block">
            <span
              aria-hidden="true"
              className="hidden lg:block absolute left-[3px] top-3 bottom-4 w-px bg-[#E3ECFA]"
            />
            {venueGroups.map(g => {
              const on = activeFloor === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActiveFloor(g.id)}
                  aria-pressed={on}
                  className="group relative text-left lg:flex lg:w-full lg:items-start lg:gap-3 lg:py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#165DFF] rounded-sm"
                >
                  <span
                    aria-hidden="true"
                    className={`hidden lg:block relative z-10 mt-[6px] h-2 w-2 shrink-0 transition-colors ${
                      on ? 'bg-[#0B1B3A]' : 'bg-[#C6D3E8] group-hover:bg-[#8FA8CD]'
                    }`}
                  />
                  <span className="min-w-0">
                    <span
                      className={`block text-[15px] font-extrabold tabular-nums leading-none transition-colors ${
                        on ? 'text-[#0B1B3A]' : 'text-[#9AAAC4] group-hover:text-[#5A6E92]'
                      }`}
                    >
                      {g.level}
                    </span>
                    <span
                      className={`mt-1.5 block text-[10.5px] leading-none tabular-nums ${
                        on ? 'text-[#165DFF]' : 'text-[#AEB9CC]'
                      }`}
                    >
                      {tr(`${g.zones.length} 处点位`, `${g.zones.length} stops`)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-[26px] font-extrabold tabular-nums leading-none text-[#0B1B3A]">
              {venueGroup.level}
            </span>
            <h3 className="text-[15px] font-bold text-[#0B1B3A]">
              {en ? venueGroup.titleEn : venueGroup.title}
            </h3>
          </div>
          <p className="mt-2.5 mb-8 max-w-2xl text-[12px] leading-relaxed text-[#6B7C9B]">
            {en ? venueGroup.summaryEn : venueGroup.summary}
          </p>

          {venueGroup.zones.map((z, i) => (
            <article
              key={z.id}
              className="relative grid grid-cols-[1.75rem_1fr] sm:grid-cols-[1.75rem_13.75rem_1fr] items-start gap-x-4 sm:gap-x-7 border-t border-[#E3ECFA] py-6"
            >
              {/* 脊线：除最后一行外贯穿整行，序号用白底压住 */}
              <span
                aria-hidden="true"
                className={`absolute left-[11.5px] top-0 w-px bg-[#E3ECFA] ${
                  i === venueGroup.zones.length - 1 ? 'h-12' : 'h-full'
                }`}
              />
              <span className="relative z-10 flex h-6 w-6 items-center justify-center bg-white text-[10.5px] font-extrabold tabular-nums text-[#165DFF]">
                {String(i + 1).padStart(2, '0')}
              </span>

              <figure className="col-start-2 min-w-0">
                <img
                  src={z.image}
                  alt={`${en ? venueGroup.labelEn : venueGroup.label} · ${en ? z.areaEn : z.area}`}
                  loading="lazy"
                  decoding="async"
                  width={440}
                  height={330}
                  className="aspect-[4/3] w-full bg-[#F2F5FA] object-cover sm:w-[13.75rem]"
                />
              </figure>

              <div className="col-start-2 sm:col-start-3 min-w-0 mt-4 sm:mt-0">
                <h4 className="text-[14px] font-bold leading-snug text-[#0B1B3A]">
                  {en ? z.areaEn : z.area}
                </h4>
                <p className="mt-1.5 max-w-[46ch] text-[12px] leading-relaxed text-[#6B7C9B]">
                  {en ? z.descEn : z.desc}
                </p>
                <ul className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {(en ? z.pointsEn : z.points).map((pt, k) => (
                    <li key={k} className="flex items-center gap-3 text-[11px] text-[#48597A]">
                      {k > 0 && <span aria-hidden="true" className="h-2.5 w-px bg-[#D3DFF1]" />}
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}

          <p className="mt-5 text-[11px] text-[#98A6BE]">
            {en ? venueImageNoteEn : venueImageNote}
          </p>
        </div>
      </div>
    </section>
  );
};