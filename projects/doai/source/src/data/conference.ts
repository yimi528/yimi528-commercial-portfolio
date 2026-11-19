import { creatorIntroduction, creatorIntroductionEn, creatorDirections } from './creatorTrack';

/**
 * Content for the detail pages: schedule, venues, program blocks, and the
 * per-recruitment applicant pool. Kept separate from AppContext so the
 * context file stays focused on state and actions.
 */
import { ScheduleItem, Venue, ProgramBlock } from '../types';
import forumImg from '../assets/images/forum_panel_1790923996404.jpg';
import hallImg from '../assets/images/conference_auditorium_1790923976092.jpg';
import bazaarImg from '../assets/images/venue_maker_bazaar_1790924729315.jpg';
import partyImg from '../assets/images/evening_after_party_1790924737645.jpg';
import heroImg from '../assets/images/hero_ai_horizon_1790923964186.jpg';
import makersImg from '../assets/images/makers_collaborating_1790923986603.jpg';

/**
 * Agenda and venue data, per the official 《对外招商方案》两日日程.
 * Day 1 (12/5) and Day 2 (12/6) both at 乐动虹桥.
 */
export const schedule: ScheduleItem[] = [
  // ---------------- Day 1 · 12/5 · 乐动虹桥 · 开幕 + 社交 ----------------
  {
    id: 'sch-101', day: 'day1', startTime: '09:00', endTime: '12:30',
    title: '签到报到',
    titleEn: 'Check-in & Badge Pickup',
    venue: '乐动虹桥 · 签到区',
    venueEn: 'LeDong Hongqiao · Check-in Area',
    type: 'social', track: 'general',
    description: '签到报到、领取物料、自由交流。',
    descriptionEn: 'Check in, collect your badge and materials, and start networking.',
  },
  {
    id: 'sch-102', day: 'day1', startTime: '13:30', endTime: '14:40',
    title: '开幕式 · 领导致辞 · 战略发布',
    titleEn: 'Opening Ceremony · Remarks · Strategy Launch',
    venue: '乐动虹桥 · 主会场',
    venueEn: 'LeDong Hongqiao · Main Hall',
    type: 'keynote', track: 'general',
    description: '开幕式、领导致辞与战略发布。',
    descriptionEn: 'Opening ceremony, official remarks and the strategy launch.',
  },
  {
    id: 'sch-103', day: 'day1', startTime: '14:40', endTime: '15:40',
    title: '圆桌论坛：全球 AI 创客生态',
    titleEn: 'Roundtable: The Global AI Maker Ecosystem',
    venue: '乐动虹桥 · 主会场',
    venueEn: 'LeDong Hongqiao · Main Hall',
    type: 'symposium', track: 'general',
    description: '',
    descriptionEn: '',
  },
  {
    id: 'sch-104', day: 'day1', startTime: '15:40', endTime: '16:20',
    title: 'TOP37 高校签约 · 《长宁倡议》发布',
    titleEn: 'TOP 37 University Signing · The Changning Initiative',
    venue: '乐动虹桥 · 主会场',
    venueEn: 'LeDong Hongqiao · Main Hall',
    type: 'keynote', track: 'general',
    description: '与 TOP37 海内外高校现场签约，发布《长宁倡议》。',
    descriptionEn: 'On-stage signing with 37 leading universities at home and abroad, plus the release of the Changning Initiative.',
  },
  {
    id: 'sch-105', day: 'day1', startTime: '16:20', endTime: '18:30',
    title: '自由社交 · 展陈参观 · 合作洽谈',
    titleEn: 'Open Networking · Exhibition · Deal Talks',
    venue: '乐动虹桥',
    venueEn: 'LeDong Hongqiao',
    type: 'social', track: 'general',
    description: '',
    descriptionEn: '',
  },
  {
    id: 'sch-106', day: 'day1', startTime: '18:30', endTime: '21:30',
    title: 'After Party · 投资人-创业者速配',
    titleEn: 'After Party · Founder–Investor Matching',
    venue: '乐动虹桥',
    venueEn: 'LeDong Hongqiao',
    type: 'social', track: 'general',
    description: 'After Party 创客社交之夜，投资人-创业者速配。',
    descriptionEn: 'An After Party night for the maker community, with founder–investor speed matching.',
  },

  // ---------------- Day 2 · 12/6 · 乐动虹桥 · 展览 + 路演主日 ----------------
  {
    id: 'sch-201', day: 'day2', startTime: '09:30', endTime: '18:00',
    title: '全面开馆 · 市集/展商/互动/游园护照',
    titleEn: 'Doors Open · Market, Expo, Play Zones & Garden Passport',
    venue: '乐动虹桥 1F',
    venueEn: 'LeDong Hongqiao 1F',
    type: 'workshop', track: 'general',
    description: '全面开馆：长宁味道市集、展商展位、AI 互动体验区、游园护照发放。',
    descriptionEn: 'All areas open: the Changning Taste market, exhibitor booths, AI experience zones and garden passports.',
  },
  {
    id: 'sch-202', day: 'day2', startTime: '09:30', endTime: '12:00',
    title: '决赛路演上半场',
    titleEn: 'Finals Pitches · First Half',
    venue: '乐动虹桥 · 路演主会场',
    venueEn: 'LeDong Hongqiao · Main Pitch Hall',
    type: 'roadshow', track: 'industry',
    description: '8 分钟路演 + 5 分钟答辩，全程直播；分论坛上午场与海外分会场路演同步进行。',
    descriptionEn: '8-minute pitch plus 5-minute Q&A, livestreamed throughout; morning forums and overseas sub-venue pitches run in parallel.',
  },
  {
    id: 'sch-204', day: 'day2', startTime: '09:30', endTime: '12:00',
    title: '分论坛上午场 · 海外分会场路演',
    titleEn: 'Morning Forums · Overseas Sub-venue Pitches',
    venue: '乐动虹桥 4F—5F',
    venueEn: 'LeDong Hongqiao 4F—5F',
    type: 'symposium', track: 'general',
    description: '分论坛具体排期待公布，香港/佛罗伦萨/硅谷海外分会场线上联动。',
    descriptionEn: 'Forum schedules will be announced, with Hong Kong, Florence and Silicon Valley joining online.',
  },
  {
    id: 'sch-205', day: 'day2', startTime: '13:30', endTime: '17:00',
    title: '决赛路演下半场 · 圆桌讨论 · 分论坛下午场',
    titleEn: 'Finals Pitches · Second Half, Roundtable & Afternoon Forums',
    venue: '乐动虹桥 · 路演主会场',
    venueEn: 'LeDong Hongqiao · Main Pitch Hall',
    type: 'roadshow', track: 'creator',
    description: '8 分钟路演 + 5 分钟答辩，全程直播；分论坛下午场并行。',
    descriptionEn: '8-minute pitch plus 5-minute Q&A, livestreamed throughout; the afternoon forum sessions run in parallel.',
  },
  {
    id: 'sch-206', day: 'day2', startTime: '17:00', endTime: '18:00',
    title: '闭幕颁奖 · 赛事颁奖 · 落地签约 · 大会总结 · 大合影',
    titleEn: 'Closing & Awards · Signings · Wrap-up · Group Photo',
    venue: '乐动虹桥 · 主会场',
    venueEn: 'LeDong Hongqiao · Main Hall',
    type: 'keynote', track: 'general',
    description: '公布获奖名单，现场推动项目与企业需求签约。',
    descriptionEn: 'Winners announced, with on-site signings between projects and corporate briefs.',
  },
];

export const venues: Venue[] = [
  {
    id: 'venue-debei',
    name: '德必大虹桥园区',
    nameEn: 'Dobe Greater Hongqiao Park',
    address: '上海市长宁区 · 德必大虹桥园区（园区入口详见现场指引）',
    district: '上海 · 长宁',
    capacity: 1200,
    image: hallImg,
    tags: ['配套场地', '赛道路演分会场', '海外线上评审'],
    intro:
      '配套场地，承载部分赛道路演分会场与海外线上评审室。12/5 开幕与社交、After Party 均在乐动虹桥举行。',
    facilities: ['赛道路演分会场', '海外线上评审室', '高速 Wi-Fi', '无障碍通道', '全程直播'],
    transit: '与乐动虹桥相距约 500 米，步行 8—10 分钟；沿途设指示牌与志愿者引导，并有短驳车循环接驳。',
  },
  {
    id: 'venue-ledong',
    name: '乐动虹桥',
    nameEn: 'LeDong Hongqiao',
    address: '上海市长宁区 · 乐动虹桥（三层独栋楼宇）',
    district: '上海 · 长宁',
    capacity: 2000,
    image: bazaarImg,
    tags: ['大会主会场', '开幕与社交', '决赛路演', '游园会', '市集'],
    intro:
      '大会主会场 · 12/5（周六）开幕与社交、After Party；12/6（周日）全天决赛路演、游园会、市集、主题交流活动、航天馆论坛与 AI 互动体验区：1F 迎宾与展商、2F 航天与技术（跨星际航天数字科技馆 3800㎡）、3F 游园与路演（穹顶中庭）。',
    facilities: ['剧场级路演主会场', '跨星际航天数字科技馆', '长宁味道美食市集', '樊登书店休闲区', 'AI 互动体验区', '集章兑奖点'],
    transit: '与德必大虹桥园区相距约 500 米，步行 8—10 分钟；沿途设指示牌与志愿者引导，并有短驳车循环接驳。',
  },
];

export const programBlocks: ProgramBlock[] = [
  {
    id: 'pb-vision',
    eyebrow: 'MISSION',
    title: '大会愿景与使命',
    titleEn: 'Vision & Mission',
    summary:
      'DOAI 应运而生——政府东风下，一场全球化、产业向、可赛可玩可产出的 AI 创客大会。我们不办只讲概念的会，而是搭建一条创客可以立刻动手、立刻验证、立刻找到伙伴的完整链路。',
    bullets: [
      { title: '开放', desc: '报名、参会全程免费，不设任何门槛与付费通道。', icon: 'globe' },
      { title: '可造', desc: 'FDE 企业命题 + 自由创意方向，代码与电路板同样被尊重。', icon: 'bolt' },
      { title: '真实', desc: '发布真实产业命题、现场 POC 签约撮合，而非停留在 Demo。', icon: 'shield' },
      { title: '连接', desc: '1000+ 全球开发者、主题交流活动。', icon: 'people' },
    ],
    image: heroImg,
    stats: [
      { label: '全球开发者', value: '1000+' },
      { label: '入围项目', value: '20—30 个' },
      { label: '各赛道最佳创客奖', value: '18,888 元' },
      { label: '投资机构与评委', value: '12—20 家' },
    ],
  },
  {
    id: 'pb-venue',
    eyebrow: 'VENUE',
    title: '双会场空间与路线导引',
    titleEn: 'Two Venues & Wayfinding',
    summary:
      '乐动虹桥承载两天的开幕社交、After Party、决赛路演、游园与市集；德必大虹桥园区提供配套空间。两会场相距约 500 米，步行 8—10 分钟可达。',
    bullets: [
      { title: '德必大虹桥园区', desc: '配套空间 · 部分赛道路演分会场 · 海外线上评审', icon: 'globe' },
      { title: '乐动虹桥', desc: '12/5 开幕与社交 · After Party；12/6 决赛路演 · 游园 · 市集', icon: 'bolt' },
      { title: '接驳引导', desc: '沿途指示牌与志愿者引导，短驳车循环接驳。', icon: 'people' },
      { title: '参会指引', desc: '凭 DOAI Passport 扫码即可上车与入场。', icon: 'shield' },
    ],
    image: bazaarImg,
  },
  {
    id: 'pb-schedule',
    eyebrow: 'AGENDA',
    title: '核心议程日程',
    titleEn: 'Core Agenda',
    summary:
      '两天议程围绕「开幕社交 — 路演主日」展开。Day 1 在乐动虹桥开幕与社交，Day 2 全天在乐动虹桥路演、游园与逛市集。',
    bullets: [
      { title: '12.5 开幕日', desc: '开幕式、圆桌论坛、TOP37 高校签约、《长宁倡议》发布、After Party', icon: 'spark' },
      { title: '12.6 路演主日', desc: '决赛路演上下午场、主题交流活动、游园会与长宁味道市集', icon: 'trophy' },
      { title: '闭幕颁奖', desc: '赛事颁奖、落地签约、大会总结、大合影', icon: 'people' },
      { title: '全天候直播', desc: '3 路直播 + 30+ 科技媒体探营，海外分会场连线。', icon: 'globe' },
    ],
    image: makersImg,
  },
  {
    id: 'pb-social',
    eyebrow: 'AFTER PARTY',
    title: 'After Party 狂欢与社交',
    titleEn: 'After Party',
    summary:
      '开幕夜不散场。电子音乐、生成式光影、全场数字名片交换，投资人-创业者速配，让每一次相遇都有下文。',
    bullets: [
      { title: '投资人-创业者速配', desc: '项目方与投资机构现场深度对接。', icon: 'spark' },
      { title: '数字名片墙', desc: '扫码即可交换联系方式与项目资料。', icon: 'people' },
      { title: '自由社交', desc: '展陈参观后自由交流与合作洽谈。', icon: 'bolt' },
      { title: '全程开放', desc: '凭任意一张 DOAI 通行证即可入场。', icon: 'shield' },
    ],
    image: partyImg,
  },
];

export const dayMeta: Record<
  ScheduleItem['day'],
  { label: string; date: string; title: string; titleEn: string; accent: string }
> = {
  day1: {
    label: 'Day 1',
    date: '12.5',
    title: '开幕与社交 · 乐动虹桥',
    titleEn: 'Opening & Networking · LeDong Hongqiao',
    accent: '#165DFF',
  },
  day2: {
    label: 'Day 2',
    date: '12.6',
    title: '展览与路演主日 · 乐动虹桥',
    titleEn: 'Expo & Finals Day · LeDong Hongqiao',
    accent: '#00B487',
  },
};

export const typeMeta: Record<ScheduleItem['type'], { label: string; labelEn: string; color: string }> = {
  keynote: { label: '主旨', labelEn: 'Keynote', color: '#165DFF' },
  symposium: { label: '分论坛', labelEn: 'Forum', color: '#2E7BF6' },
  roadshow: { label: '路演', labelEn: 'Pitch', color: '#00B487' },
  workshop: { label: '工作坊', labelEn: 'Workshop', color: '#FF8A1F' },
  social: { label: '社交', labelEn: 'Social', color: '#722ED1' },
  break: { label: '休息', labelEn: 'Break', color: '#98A6BE' },
};

/* ==========================================================================
   Module pages — one dedicated detail page per navbar sub-item.
   ========================================================================== */

export interface ModuleSection {
  heading: string;
  headingEn: string;
  body: string;
  bodyEn: string;
  items?: { title: string; titleEn: string; desc: string; descEn: string }[];
}

export interface ModulePage {
  id: string;
  parent: 'conference' | 'maker' | 'square';
  eyebrow: string;
  title: string;
  titleEn: string;
  subtitle: string;
  subtitleEn: string;
  heroImage: string;
  stats: { label: string; labelEn: string; value: string; valueEn: string }[];
  sections: ModuleSection[];
  cta?: { label: string; labelEn: string; route: string };
  /** 收尾的第二个动作，和 cta 并排（如场地页的「回看两天日程」） */
  secondaryCta?: { label: string; labelEn: string; route: string };
}

export const modulePages: ModulePage[] = [
  /* ---------------- 大会介绍 · 大会愿景与使命 ---------------- */
  {
    id: 'vision',
    parent: 'conference',
    eyebrow: 'MISSION & VISION',
    title: '大会愿景与使命',
    titleEn: 'Vision & Mission',
    subtitle:
      'DOAI · Dobe AI 全球创客大会（DOBE AI MAKERS CONFERENCE）由德必集团与原子公社 AtomHub 主办，上海市时代青年科创发展中心联合主办，长宁区人民政府指导，2026 年 12 月 5 日—6 日在上海·长宁乐动虹桥举行——政府东风下，一场全球化、产业向、可赛可玩可产出的 AI 创客大会。',
    subtitleEn:
      'DOAI · Dobe AI Global Makers Conference is hosted by DoBe Group and AtomHub, co-hosted by the Shanghai Times Youth Science and Technology Innovation Development Center, and guided by the Changning District Government. It takes place at LeDong Hongqiao in Changning, Shanghai on December 5–6, 2026 — a global, industry-facing AI makers conference you can compete in, play at and ship from.',
    heroImage: heroImg,
    stats: [
      { label: '线下人次', labelEn: 'On-site visitors', value: '2000—4000', valueEn: '2,000—4,000' },
      { label: '全网曝光', labelEn: 'Total reach', value: '500 万+', valueEn: '5M+' },
      { label: '演讲嘉宾', labelEn: 'Speakers', value: '80—120 位', valueEn: '80—120' },
    ],
    sections: [
      {
        heading: '大会定位',
        headingEn: 'What DOAI Is',
        body: '政府东风下，一场全球化、产业向、可赛可玩可产出的 AI 创客大会：一端连接全球 AI 公司与开发者（赛事、论坛、展示），一端连接公众与消费者（体验、市集、游园）。',
        bodyEn:
          'A global, industry-facing AI makers conference with government backing — buildable, playable and productive. One end connects global AI companies and developers (competition, forums, showcase); the other connects the public (experiences, market, garden tour).',
        items: [
          {
            title: '全球创客',
            titleEn: 'Global makers',
            desc: '面向全球开发者与创客群体，联动香港、佛罗伦萨、硅谷三大海外分会场。',
            descEn: 'Open to developers and makers worldwide, linked to three overseas sub-venues: Hong Kong, Florence and Silicon Valley.',
          },
          {
            title: '产业深耕',
            titleEn: 'Industry depth',
            desc: '发布真实产业命题、现场 POC 签约撮合、赛后持续承接企业采购与落地孵化。',
            descEn: 'Real industry briefs, on-site POC signings, and continued corporate procurement and incubation after the event.',
          },
          {
            title: '可赛可玩可产出',
            titleEn: 'Build, play, ship',
            desc: '以赛事为引擎、市集为体验、论坛为内容——两天后带走项目、订单和人脉。',
            descEn: 'The competition is the engine, the market is the experience, the forums are the content — leave in two days with a project, orders and contacts.',
          },
          {
            title: '公众体验',
            titleEn: 'For the public',
            desc: '市集、游园、AI 互动让普通人也能逛、能玩、能学。',
            descEn: 'The market, garden tour and AI experiences let anyone walk in, play and learn.',
          },
        ],
      },
      {
        heading: '主题口号',
        headingEn: 'Tagline',
        body: '「政府支持 × 全球链接 × 产业落地 × 全民参与」——政府东风下，人人可赛、可玩、可学、可合作。',
        bodyEn:
          '"Government backing × global links × industry adoption × open to all" — everyone can compete, play, learn and partner.',
      },
      {
        heading: '组织架构',
        headingEn: 'Organisation',
        body: '大会由产业园区与创客社区共同发起，通过政府与产业资源形成合力。',
        bodyEn: 'The conference is jointly initiated by an industrial park and a maker community, combining public and industry resources.',
        items: [
          {
            title: '指导单位',
            titleEn: 'Guided by',
            desc: '长宁区人民政府。',
            descEn: 'Changning District Government.',
          },
          {
            title: '主办单位',
            titleEn: 'Hosted by',
            desc: '德必集团、原子公社 AtomHub。',
            descEn: 'DoBe Group and AtomHub.',
          },
          {
            title: '联合主办单位',
            titleEn: 'Co-hosted by',
            desc: '上海市时代青年科创发展中心。',
            descEn: 'Shanghai Times Youth Science and Technology Innovation Development Center.',
          },
          {
            title: '执行架构',
            titleEn: 'Delivery teams',
            desc: '赛事组委会（命题·评审·路演）/ 论坛组（嘉宾·议程·分论坛）/ 市集游园组（展商·体验·活动）/ 宣传招商组（媒体·合作·报名）。',
            descEn: 'Competition committee (briefs, judging, pitches) / Forum team (speakers, agenda, sub-venues) / Market & garden team (exhibitors, experiences, activities) / Comms & partnerships (media, partners, registration).',
          },
        ],
      },
    ],
    cta: { label: '立即报名参赛', labelEn: 'Register to compete', route: 'register' },
  },

  /* ---------------- 大会介绍 · 双会场空间规划 ---------------- */
  {
    id: 'venue',
    parent: 'conference',
    eyebrow: 'TWO VENUES',
    title: '双会场空间规划',
    titleEn: 'Two Venues, One Walk Apart',
    subtitle:
      '乐动虹桥为两天大会主会场：12/5 开幕与社交、After Party，12/6 决赛路演、游园与市集。德必大虹桥园区提供配套空间。两场地相距约 500 米，步行 8—10 分钟可达，沿途指示牌与志愿者引导，短驳车循环接驳。',
    subtitleEn:
      'LeDong Hongqiao hosts the opening, networking and After Party on Dec 5, and the finals, fair and market on Dec 6. Dobe Greater Hongqiao Park provides supporting spaces. The two sites are about 500 m apart — an 8–10 minute walk — with signage and volunteers along the way plus a looping shuttle.',
    heroImage: bazaarImg,
    stats: [
      { label: '德必大虹桥园区', labelEn: 'Dobe Park', value: '配套空间', valueEn: 'Supporting spaces' },
      { label: '乐动虹桥', labelEn: 'LeDong', value: '两天大会主会场', valueEn: 'Main venue · both days' },
      { label: '场地间距', labelEn: 'Distance', value: '约 500m', valueEn: '~500 m' },
      { label: '步行时间', labelEn: 'On foot', value: '8—10 分钟', valueEn: '8—10 min' },
    ],
    sections: [
      {
        heading: '12/5 · 乐动虹桥 · 开幕与社交主场',
        headingEn: 'Dec 5 · LeDong Hongqiao · Opening & Networking',
        body: '12/5（周六）下午—晚上：开幕主论坛、签约仪式、自由社交、After Party 均在乐动虹桥举行。',
        bodyEn:
          'Dec 5 (Sat), afternoon to evening: opening keynote forum, signing ceremony, open networking and After Party, all at LeDong Hongqiao.',
        items: [
          {
            title: '12/5 下午',
            titleEn: 'Dec 5 · Afternoon',
            desc: '开幕式（领导致辞、战略发布）、圆桌论坛、TOP37 高校签约与《长宁倡议》发布。',
            descEn: 'Opening ceremony (official remarks, strategy launch), roundtable, the TOP 37 university signing and the Changning Initiative.',
          },
          {
            title: '12/5 晚间',
            titleEn: 'Dec 5 · Evening',
            desc: '自由社交、展陈参观、合作洽谈，After Party · 投资人-创业者速配。',
            descEn: 'Open networking, exhibition walk-through and deal talks, then the After Party with founder–investor matching.',
          },
        ],
      },
      {
        heading: '12/6 · 乐动虹桥 · 决赛路演 · 游园 · 市集主场',
        headingEn: 'Dec 6 · LeDong Hongqiao · Finals, Garden & Market',
        body: '12/6（周日）全天：三层独栋楼宇，观众从 1F 入口进入逐层向上游览，停留时间 4—5 小时。逐层点位见下方「现场空间导览」。',
        bodyEn:
          'All day Dec 6 (Sun): a three-storey building — visitors enter at 1F and work their way up, spending four to five hours. Floor-by-floor stops are listed in the venue guide below.',
      },
      {
        heading: '双会场动线',
        headingEn: 'Getting Between the Two',
        body: '两场地相距约 500 米，步行 8—10 分钟可达，沿途设置指示牌与志愿者引导，安排短驳车循环接驳。',
        bodyEn:
          'The two sites are about 500 m apart, an 8–10 minute walk, with signage and volunteers along the route and a looping shuttle.',
      },
    ],
    // 这一页是从「可逛 / 可玩 / 全球化」深链进来的落地点，收尾必须给出下一步动作。
    cta: { label: '立即免费报名', labelEn: 'Register free', route: 'register' },
    secondaryCta: { label: '回看两天日程', labelEn: 'See the two-day agenda', route: 'conference/schedule' },
  },

  /* ---------------- 赛事中心 · FDE 赛道 ---------------- */
  {
    id: 'industry',
    parent: 'maker',
    eyebrow: 'TRACK · AI + INDUSTRY',
    title: 'FDE 赛道',
    titleEn: 'FDE Track',
    subtitle:
      '面向真实产业命题解题的团队。大会发布真实产业命题，参赛团队定向解题；现场签约 POC 订单，获奖项目优先对接企业采购与落地孵化。',
    subtitleEn:
      'For teams that solve real industry briefs. The conference publishes actual corporate briefs and teams solve them directly; POC orders are signed on site, and winning projects get priority access to corporate procurement and incubation.',
    heroImage: hallImg,
    stats: [
      { label: '面向对象', labelEn: 'For', value: '产业命题解题团队', valueEn: 'Teams solving industry briefs' },
      { label: '路演赛制', labelEn: 'Pitch format', value: '8+5 分钟', valueEn: '8 + 5 min' },
      { label: '路演地点', labelEn: 'Pitch venue', value: '乐动虹桥 1F', valueEn: 'LeDong Hongqiao 1F' },
      { label: '落地对接', labelEn: 'Adoption', value: 'POC 订单优先', valueEn: 'POC orders first' },
    ],
    sections: [
      {
        heading: '命题方向',
        headingEn: 'The Briefs',
        body: 'FDE 赛道不设泛命题，而是围绕企业真实业务需求定向解题：飞书深诺提供广告素材侵权风险筛查命题，上服集团提供海派定制服饰需求解构与可视化 Agent 命题。',
        bodyEn:
          'The FDE track takes no open-ended themes — teams solve against real business needs. Feishu Shennuo sets a brief on screening ad creative for infringement risk, and Shangfu Group sets one on deconstructing and visualising demand for Shanghai-style bespoke tailoring.',
        items: [
          {
            title: '真实产业命题',
            titleEn: 'Real industry briefs',
            desc: '由发布方带来真实业务场景与数据支持。',
            descEn: 'Each brief comes with a genuine business scenario and data support.',
          },
          {
            title: '定向解题',
            titleEn: 'Solve to the brief',
            desc: '按企业真实需求设计 Demo 与落地方案。',
            descEn: 'Design the demo and rollout plan around what the company actually needs.',
          },
        ],
      },
      {
        heading: '参赛与解题',
        headingEn: 'Entering & Solving',
        body: '命题将于赛前正式发布，团队可在官网领取命题卡并针对性组队。',
        bodyEn:
          'Briefs are published before the competition starts; teams can pick up brief cards on the website and build their roster around them.',
        items: [
          {
            title: '10 月中旬',
            titleEn: 'Mid-October',
            desc: '命题发布，官网同步上线命题专区。',
            descEn: 'Briefs published, with a dedicated brief section going live on the website.',
          },
          {
            title: '定向解题',
            titleEn: 'Solve to the brief',
            desc: '按企业真实需求设计 Demo 与落地方案。',
            descEn: 'Design the demo and rollout plan around what the company actually needs.',
          },
          {
            title: '12/6 现场',
            titleEn: 'Dec 6 · On site',
            desc: '乐动虹桥 · 路演主会场，8 分钟路演 + 5 分钟答辩。',
            descEn: 'LeDong Hongqiao main pitch hall: an 8-minute pitch plus 5 minutes of Q&A.',
          },
        ],
      },
      {
        heading: '落地机制',
        headingEn: 'From Demo to Deal',
        body: '现场签约 POC 订单，获奖项目优先对接企业采购与落地孵化，并在闭幕式现场推动签约。',
        bodyEn:
          'POC orders are signed on site; winning projects get priority access to corporate procurement and incubation, with signings pushed at the closing ceremony.',
      },
    ],
    cta: { label: '申报 FDE 赛道', labelEn: 'Enter the FDE track', route: 'register' },
  },

  /* ---------------- 赛事中心 · 自由创意赛道 ---------------- */
  {
    id: 'creator',
    parent: 'maker',
    eyebrow: 'TRACK · AI CREATOR',
    title: '自由创意赛道',
    titleEn: 'Free Creation Track',
    subtitle:
      '面向全球 AI 创业者、开发者与硬件工程师。从真实需求出发，用现有 AI 能力做出可体验、可落地的产品与服务；路演 + 评选 + 投资对接一站式完成。',
    subtitleEn:
      'For AI founders, developers and hardware engineers worldwide. Use existing AI capabilities to build usable, practical products and services for real needs, with pitching, judging and investor matching in one place.',
    heroImage: partyImg,
    stats: [
      { label: '面向对象', labelEn: 'For', value: '全球创客', valueEn: 'Makers worldwide' },
      { label: '路演赛制', labelEn: 'Pitch format', value: '8+5 分钟', valueEn: '8 + 5 min' },
      { label: '路演地点', labelEn: 'Pitch venue', value: '乐动虹桥分会场', valueEn: 'LeDong sub-venues' },
      { label: '评审方式', labelEn: 'Judging', value: '现场 + 海外连线', valueEn: 'On site + overseas link' },
    ],
    sections: [
      {
        heading: '命题方向',
        headingEn: 'What to Build',
        body: creatorIntroduction,
        bodyEn: creatorIntroductionEn,
        items: creatorDirections.map(direction => ({
          title: direction.title,
          titleEn: direction.titleEn,
          desc: `${direction.tagline}。${direction.desc}`,
          descEn: `${direction.taglineEn}. ${direction.descEn}`,
        })),
      },
      {
        heading: '评审与投资对接',
        headingEn: 'Judging & Investors',
        body: '自由创意赛道在乐动虹桥分会场路演，海外专家通过线上评审室远程参与评审。',
        bodyEn:
          'The Free Creation track pitches in the LeDong sub-venues, with overseas experts joining remotely from the online judging room.',
        items: [
          {
            title: '现场答辩',
            titleEn: 'On-site defence',
            desc: '8 分钟路演 + 5 分钟答辩。',
            descEn: 'An 8-minute pitch plus 5 minutes of Q&A.',
          },
          {
            title: '海外连线',
            titleEn: 'Overseas link',
            desc: '海外专家经德必大虹桥园区线上评审室远程接入。',
            descEn: 'Overseas experts join remotely from the online judging room at Dobe Greater Hongqiao Park.',
          },
          {
            title: '投资对接',
            titleEn: 'Investor matching',
            desc: '资深投资人在评审团中，路演后直接对接。',
            descEn: 'Senior investors sit on the panel and meet teams right after the pitch.',
          },
        ],
      },
    ],
    cta: { label: '申报自由创意赛道', labelEn: 'Enter the Free Creation track', route: 'register' },
  },

  /* ---------------- 创客社区 · 交换数字名片 ---------------- */
  {
    id: 'cards',
    parent: 'square',
    eyebrow: 'DIGITAL BUSINESS CARDS',
    title: '交换数字名片',
    titleEn: 'Exchange Digital Cards',
    subtitle:
      '赛事组队需打通原子公社的名片模块。创客在社区交换数字名片，形成可检索的战队档案，让组队撮合有据可依。',
    subtitleEn:
      'Team formation runs on the AtomHub card module. Makers swap digital cards in the community, building a searchable team profile so matching has something to go on.',
    heroImage: makersImg,
    stats: [
      { label: '名片来源', labelEn: 'Card source', value: '原子公社', valueEn: 'AtomHub' },
      { label: '适用场景', labelEn: 'Use cases', value: '组队 · 求职', valueEn: 'Team-up · Hiring' },
      { label: '档案沉淀', labelEn: 'Record', value: '战队档案', valueEn: 'Team profile' },
      { label: '隐私原则', labelEn: 'Privacy', value: '双方同意', valueEn: 'Mutual consent' },
    ],
    sections: [
      {
        heading: '为什么需要名片',
        headingEn: 'Why Cards',
        body: '组队是本届赛事的核心环节之一。数字名片把「谁是创客、会什么、想做什么」结构化，让匹配更高效。',
        bodyEn:
          'Team formation is one of the core parts of this competition. A digital card structures who a maker is, what they can do and what they want to build, so matching moves faster.',
        items: [
          {
            title: '赛事组队',
            titleEn: 'Team-up',
            desc: '发布项目简介与技能标签，开发者匹配组队。',
            descEn: 'Post a project summary and skill tags; developers match into teams.',
          },
          {
            title: '人才市场',
            titleEn: 'Talent market',
            desc: 'AI 公司现场招聘展位与求职者双向撮合。',
            descEn: 'AI companies hiring at booths, matched both ways with candidates.',
          },
          {
            title: '战队档案',
            titleEn: 'Team profile',
            desc: '组队成功后自动形成战队档案，随项目进入评审。',
            descEn: 'Once a team forms, a profile is generated automatically and follows the project into judging.',
          },
        ],
      },
      {
        heading: '交换流程',
        headingEn: 'How Swapping Works',
        body: '名片仅在双方同意后互相可见，联系方式不会公开展示。',
        bodyEn: 'Cards are visible to each other only after both sides agree; contact details are never shown publicly.',
        items: [
          {
            title: '1. 发起交换',
            titleEn: '1. Send a request',
            desc: '在人才市场或组队广场向对方发起。',
            descEn: 'From the talent market or the team-up square.',
          },
          {
            title: '2. 对方确认',
            titleEn: '2. They confirm',
            desc: '双方同意后名片互相存入。',
            descEn: 'Once both agree, the cards are saved on both sides.',
          },
          {
            title: '3. 沉淀档案',
            titleEn: '3. Build the record',
            desc: '组队成功后进入战队档案。',
            descEn: 'After the team forms, it goes into the team profile.',
          },
        ],
      },
    ],
  },
];
