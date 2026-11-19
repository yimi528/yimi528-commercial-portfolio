import { creatorDirections } from './creatorTrack';

/**
 * Single source of truth for DOAI 2026 conference facts.
 *
 * Every value here follows the official 《DOAI Dobe AI 创客大会 · 对外招商方案》
 * (2026.10). The site must not invent numbers that contradict this file — if a
 * figure changes in the plan, change it here and the whole site follows.
 * Scale figures are estimates: 预估区间，最终以实际发布为准。
 */

/* ---------------------------------------------------------------- 基本信息 */
export const event = {
  nameZh: 'DOAI · Dobe AI 全球创客大会',
  nameEn: 'DOAI · Dobe AI Makers Conference',
  shortName: 'DOAI',
  fullNameEn: 'DOBE AI MAKERS CONFERENCE 2026',
  slogan: '政府支持 × 全球链接 × 产业落地 × 全民参与',
  sloganEn: 'Government-backed × globally linked × industry-grounded × open to all',
  tagline: '政府东风下，一场全球化、产业向、可赛可玩可产出的 AI 创客大会',
  taglineEn: 'A global, industry-facing AI makers conference where you can compete, play and ship',
  taglineDesc: '以赛事为引擎、市集为体验、论坛为内容——两天后带走项目、订单和人脉。',
  taglineDescEn: 'Contest as the engine, the fair as the experience, forums as the content — leave in two days with a project, orders and contacts.',
  year: 2026,
  dateLabel: '12.5 — 12.6',
  dateRange: '2026 年 12 月 5 日（周六）—6 日（周日）',
  dateRangeEn: 'December 5 (Sat) – 6 (Sun), 2026',
  city: '上海 · 长宁',
  cityEn: 'Changning, Shanghai',
  nature: '面向全球开发者、创业者、企业、大学生与公众的复合型 AI 创客大会',
  natureEn: 'A hybrid AI makers conference for global developers, founders, companies, students and the public',
  format: '线上官网 + 线下双会场',
  formatEn: 'Official website online + two physical venues',
  organizers: ['德必集团', '原子公社 AtomHub'],
  organizersEn: ['DoBe Group', 'AtomHub'],
  coOrganizers: ['上海市时代青年科创发展中心'],
  coOrganizersEn: ['Shanghai Times Youth Science and Technology Innovation Development Center'],
  supporters: ['长宁区人民政府'],
  supportersEn: ['Changning District People\u2019s Government'],
  hostLine: '德必集团 × 原子公社 AtomHub 主办 · 上海市时代青年科创发展中心 联合主办 · 长宁区人民政府指导',
  hostLineEn: 'Hosted by DoBe Group × AtomHub · Co-hosted by Shanghai Times Youth Science and Technology Innovation Development Center · Guided by Changning District People\u2019s Government',
} as const;

/* ---------------------------------------------------------------- 场地 */
export const venue = {
  walkingMinutes: '8—10 分钟',
  walkingMinutesEn: '8–10 min',
  walkingDistance: '约 500m',
  walkingDistanceEn: 'about 500 m',
} as const;

export const venues = [
  {
    id: 'ledong', name: '乐动虹桥', nameEn: 'LeDong Hongqiao',
    role: '两天大会主会场', roleEn: 'Main venue for both days',
    address: '上海市长宁区 · 乐动虹桥', addressEn: 'Changning District, Shanghai · LeDong Hongqiao',
    sessions: [
      { when: '12/5 下午—晚间', whenEn: 'Dec 5, afternoon – evening', role: '开幕与社交主场', roleEn: 'Opening & networking hub', content: '开幕主论坛、签约仪式、自由社交、After Party', contentEn: 'Opening keynote forum, signing ceremony, open networking and After Party' },
      { when: '12/6 全天', whenEn: 'Dec 6, all day', role: '决赛路演 · 游园 · 市集主场', roleEn: 'Finals · fair · market hub', content: '决赛路演主会场、创客游园会、长宁味道市集、AI 互动体验区、展商展位、主题分会场与航天馆论坛', contentEn: 'Finals roadshow, maker fair, Changning Flavours market, AI experiences, exhibition booths, themed forums and Aerospace Hall forum' },
    ],
  },
  {
    id: 'debei', name: '德必大虹桥园区', nameEn: 'Dobe Greater Hongqiao Park',
    role: '配套空间 · 海外线上评审', roleEn: 'Supporting spaces · overseas online judging',
    address: '上海市长宁区 · 德必大虹桥园区', addressEn: 'Changning District, Shanghai · Dobe Greater Hongqiao Park',
    sessions: [
      { when: '大会期间', whenEn: 'During the conference', role: '配套空间', roleEn: 'Supporting spaces', content: '部分赛道路演分会场、海外线上评审室', contentEn: 'Selected track pitch rooms and overseas online judging room' },
    ],
  },
] as const;

/** 双会场接驳：相距约 500 米，步行 8—10 分钟；沿途指示牌 + 志愿者引导 + 短驳车循环接驳。 */
export const venueShuttle =
  '两会场相距约 500 米，步行 8—10 分钟可达；沿途设指示牌与志愿者引导，并有短驳车循环接驳。';
export const venueShuttleEn =
  'The two venues are about 500 m apart, 8–10 minutes on foot, with signage and volunteers along the way plus a looping shuttle.';

/* ---------------------------------------------------------------- 规模 */
export const scale = [
  { label: '线下人次', labelEn: 'On-site attendance', value: '2000—4000', unit: '人次（两天双会场累计）', unitEn: '(two days, both venues)', note: '线上辐射 10 万人次以上', noteEn: 'Online reach of 100,000+' },
  { label: '全网曝光', labelEn: 'Total reach', value: '500 万+', unit: '（三阶段宣发）', unitEn: '(three campaign phases)', note: '3 路直播 + 30+ 科技媒体 + 话题挑战赛', noteEn: '3 live streams + 30+ tech media outlets + topic challenges' },
  { label: '全球开发者', labelEn: 'Global developers', value: '1000+', unit: '线上报名创客池', unitEn: 'in the online maker pool', note: '入围 20—30 个项目线下路演', noteEn: '20–30 projects shortlisted for the offline roadshow' },
  { label: '展商 / 展位', labelEn: 'Exhibitors / booths', value: '100+', unit: '个展位', unitEn: 'booths', note: '60+ 科技型企业展位 · 40+ 参赛选手项目作品展位', noteEn: '60+ tech company booths · 40+ contestant project booths' },
  { label: '投资机构与评委', labelEn: 'Investors & judges', value: '12—20', unit: '家', unitEn: 'institutions', note: '项目路演直投、产业资源对接', noteEn: 'Direct investment at the roadshow and industry resource matching' },
  { label: '海内外高校', labelEn: 'Universities', value: 'TOP37', unit: '所', unitEn: 'institutions', note: '高校签约与产学研合作', noteEn: 'University agreements and industry-academia collaboration' },
] as const;

/** Headline figures for the hero and stat strips. */
export const headlineStats = [
  { label: '线下人次', labelEn: 'On-site attendance', value: '2000—4000', unit: '人次', unitEn: 'visits' },
  { label: '全网曝光', labelEn: 'Total reach', value: '500 万+', unit: '', unitEn: '' },
  { label: '全球开发者', labelEn: 'Global developers', value: '1000+', unit: '线上创客池', unitEn: 'online maker pool' },
] as const;

/* ---------------------------------------------------------------- 赛事 */
export const contest = {
  tagline: '五大赛道并行（自由创意 3 条 + FDE 企业命题 2 条）· 线上报名 → 入围 → 线下路演 · 现场签约 POC 订单',
  taglineEn: 'Five tracks in parallel (3 Free Creation + 2 FDE enterprise briefs) · online entry → shortlist → offline roadshow · on-site POC contracts',
  format: '路演 8 分钟 + 答辩 5 分钟（决赛）',
  formatEn: '8-minute pitch + 5-minute Q&A (finals)',
  finalistCount: '20—30 个项目（80—100 队）',
  finalistCountEn: '20–30 projects (80–100 teams)',
  judges: '投资机构与评委 12—20 家',
  judgesEn: '12–20 investment institutions and jury members',
  dimensions: ['技术创新性', '商业可行性', '产业适配度', '团队与落地力', '需求匹配度'],
  dimensionsEn: ['Technical innovation', 'Commercial viability', 'Industry fit', 'Team & execution', 'Requirement match'],
  prize: '最佳创客奖 18,888 元 + DobeHub 全球办公权益 + 十亿 Tokens',
  prizeEn: 'Best Maker Award ¥18,888 + DobeHub global workspace benefits + 1 billion tokens',
  awards: [
    { name: '各赛道最佳创客奖', nameEn: 'Best Maker Award in Each Track', amount: '¥18,888', note: '价值上万元的 DobeHub 全球办公权益 + 十亿 Tokens', noteEn: 'DobeHub global workspace benefits worth over ¥10,000 + 1 billion tokens' },
    { name: '最佳创意奖', nameEn: 'Best Creativity Award', amount: '¥8,888', note: '价值上万元的 DobeHub 全球办公权益 + 十亿 Tokens', noteEn: 'DobeHub global workspace benefits worth over ¥10,000 + 1 billion tokens' },
    { name: '最佳技术奖', nameEn: 'Best Technology Award', amount: '¥8,888', note: '价值上万元的 DobeHub 全球办公权益 + 十亿 Tokens', noteEn: 'DobeHub global workspace benefits worth over ¥10,000 + 1 billion tokens' },
    { name: '最具商业价值奖', nameEn: 'Most Commercially Valuable Award', amount: '¥8,888', note: '价值上万元的 DobeHub 全球办公权益 + 十亿 Tokens', noteEn: 'DobeHub global workspace benefits worth over ¥10,000 + 1 billion tokens' },
    { name: '最佳人气奖', nameEn: 'Most Popular Award', amount: '¥8,888', note: '价值上万元的 DobeHub 全球办公权益 + 十亿 Tokens', noteEn: 'DobeHub global workspace benefits worth over ¥10,000 + 1 billion tokens' },
  ],
  timeline: [
    { date: '10 月中 — 11/25', dateEn: 'Mid-Oct – 11/25', title: '报名发布', titleEn: 'Registration opens', desc: '通过 DOAI 官网提交团队与项目资料，生成报名凭证；线上报名创客池汇聚 1000+ 全球开发者。', descEn: 'Submit team and project details on the DOAI site to receive an entry voucher; the online pool gathers 1,000+ global developers.' },
    { date: '10 月中旬', dateEn: 'Mid-Oct', title: '命题发布', titleEn: 'Briefs published', desc: 'FDE 赛道联合飞书深诺、上服集团发布真实企业命题，定向解题。', descEn: 'The FDE track publishes real enterprise briefs with SinoClick and SF Group for targeted problem solving.' },
    { date: '报名后 — 赛前', dateEn: 'After entry – pre-contest', title: '线上组队', titleEn: 'Team up online', desc: '官网在线组队与招募队员，形成战队档案。', descEn: 'Form teams and recruit members on the site to build a team profile.' },
    { date: '赛前', dateEn: 'Pre-contest', title: '作品提交', titleEn: 'Submit your work', desc: '提交项目说明、Demo 视频与团队信息。', descEn: 'Submit the project description, demo video and team details.' },
    { date: '赛前', dateEn: 'Pre-contest', title: '公布入围', titleEn: 'Shortlist announced', desc: '公布 20—30 个入围路演项目（80—100 队）。', descEn: '20–30 projects (80–100 teams) are shortlisted for the roadshow.' },
    { date: '12/6', dateEn: '12/6', title: '线下路演', titleEn: 'Offline roadshow', desc: '乐动虹桥路演主会场，8 分钟路演 + 5 分钟答辩，全程直播。', descEn: 'At the LeDong Hongqiao main stage: 8-minute pitch + 5-minute Q&A, streamed live.' },
    { date: '12/6 闭幕式', dateEn: '12/6 closing', title: '颁奖与落地', titleEn: 'Awards & landing', desc: '现场颁奖，并推动获奖项目与企业需求现场签约 POC 订单。', descEn: 'On-site awards, with winning projects signing POC contracts with enterprise needs.' },
  ],
} as const;

export const tracks = [
  {
    id: 'industry',
    name: 'FDE 赛道',
    nameEn: 'FDE · Real Business Brief',
    audience: '面向真实企业命题解题的团队',
    audienceEn: 'Teams solving real enterprise briefs',
    directions: [
      '飞书深诺：广告素材侵权风险快速筛查工具',
      '上服集团：海派定制服饰 AI 需求解构与可视化 Agent',
    ],
    directionsEn: [
      'SinoClick: fast infringement-risk screening for ad creatives',
      'SF Group: AI demand deconstruction and visualisation agent for bespoke apparel',
    ],
    rule: '由龙头企业发布真实业务命题，参赛团队定向解题；现场签约 POC 订单，获奖项目优先对接企业采购与落地孵化。',
    ruleEn: 'Leading companies publish real business briefs and teams solve them; POC contracts are signed on site, and winning projects get priority access to enterprise procurement and incubation.',
  },
  {
    id: 'creator',
    name: '自由创意赛道',
    nameEn: 'Free Creation',
    audience: '全球 AI 创业者、开发者、硬件工程师',
    audienceEn: 'Global AI founders, developers and hardware engineers',
    directions: creatorDirections.map(direction => `${direction.title}：${direction.tagline}`),
    directionsEn: creatorDirections.map(direction => `${direction.titleEn}: ${direction.taglineEn}`),
    rule: '不设命题方，从真实需求出发，用现有 AI 能力做出可体验、可落地的产品与服务；路演 + 评选 + 投资对接一站式完成。',
    ruleEn: 'No brief issuer. Start with real needs and use existing AI capabilities to build usable, practical products and services, with pitching, judging and investor matching in one place.',
  },
] as const;

/**
 * 五大赛道总览（大会介绍 PPT 第 12 页）。
 * 自由创意赛道 3 条技术方向 + FDE 赛道 2 条真实企业命题，共 5 条。
 */
export const contestTracks = [
  {
    id: 'ctx-infra',
    group: 'free' as const,
    groupLabel: '自由创意赛道',
    groupLabelEn: 'Free Creation',
    name: 'AI Infra 赛道',
    nameEn: 'AI Infra',
    desc: creatorDirections[0].tagline,
    descEn: creatorDirections[0].taglineEn,
    host: '',
  },
  {
    id: 'ctx-app',
    group: 'free' as const,
    groupLabel: '自由创意赛道',
    groupLabelEn: 'Free Creation',
    name: 'AI 应用赛道',
    nameEn: 'AI Applications',
    desc: creatorDirections[1].tagline,
    descEn: creatorDirections[1].taglineEn,
    host: '',
  },
  {
    id: 'ctx-hardware',
    group: 'free' as const,
    groupLabel: '自由创意赛道',
    groupLabelEn: 'Free Creation',
    name: 'AI 智能硬件赛道',
    nameEn: 'AI Smart Hardware',
    desc: creatorDirections[2].tagline,
    descEn: creatorDirections[2].taglineEn,
    host: '',
  },
  {
    id: 'ctx-fs',
    group: 'fde' as const,
    groupLabel: 'FDE 赛道 · 真实企业命题',
    groupLabelEn: 'FDE track · real enterprise briefs',
    name: '广告素材侵权风险快速筛查工具',
    nameEn: 'Fast infringement-risk screening for ad creatives',
    desc: '广告素材元素拆分、反向检索与侵权风险报告',
    descEn: 'Element breakdown, reverse search and an infringement-risk report',
    host: '飞书深诺',
    hostEn: 'SinoClick',
  },
  {
    id: 'ctx-sf',
    group: 'fde' as const,
    groupLabel: 'FDE 赛道 · 真实企业命题',
    groupLabelEn: 'FDE track · real enterprise briefs',
    name: '海派定制服饰 AI 需求解构与可视化 Agent',
    nameEn: 'AI demand deconstruction and visualisation agent for bespoke apparel',
    desc: '定制需求解构、资源匹配、方案初稿与可视化辅助',
    descEn: 'Requirement deconstruction, resource matching, first drafts and visualisation support',
    host: '上服集团',
    hostEn: 'SF Group',
  },
] as const;

/* ---------------------------------------------------------------- 海外分会场 */
/** 三大海外分会场，线上联动（香港 / 佛罗伦萨 / 硅谷）。 */
export const overseas = [
  { city: '香港', cityEn: 'Hong Kong', desc: '海外分会场 · 报名招募与路演连线', descEn: 'Overseas venue · registration & live link-up' },
  { city: '佛罗伦萨', cityEn: 'Florence', desc: '海外分会场 · 线上路演与评审连线', descEn: 'Overseas venue · online roadshow & judging' },
  { city: '硅谷', cityEn: 'Silicon Valley', desc: '海外分会场 · 全球创客连线', descEn: 'Overseas venue · global maker link-up' },
] as const;

/* ---------------------------------------------------------------- 日程 */
export const agenda = [
  {
    id: 'day1',
    day: 'Day 1',
    date: '12 月 5 日（周六）',
    dateEn: 'December 5 (Sat)',
    venue: '乐动虹桥',
    venueEn: 'LeDong Hongqiao',
    positioning: '开幕 + 社交',
    positioningEn: 'Opening + networking',
    summary: '下午开幕式（领导致辞、战略发布、圆桌、TOP37 高校签约与《长宁倡议》发布），晚间 After Party 与投资人-创业者速配。',
    summaryEn: 'Afternoon opening ceremony (leadership remarks, strategy launch, roundtable, TOP37 university signing and the Changning Initiative), plus an evening After Party and investor–founder speed matching.',
    items: [
      { time: '09:00—12:30', place: '乐动虹桥 · 签到区', placeEn: 'LeDong Hongqiao · Check-in', title: '签到报到', titleEn: 'Check-in', desc: '领取物料、自由交流。', descEn: 'Collect your badge and materials, then network freely.' },
      { time: '13:30', place: '主会场', placeEn: 'Main stage', title: '开幕式', titleEn: 'Opening ceremony', desc: '领导致辞 · 战略发布。', descEn: 'Leadership remarks · strategy launch.' },
      { time: '14:40', place: '主会场', placeEn: 'Main stage', title: '圆桌论坛：全球 AI 创客生态', titleEn: 'Roundtable: the global AI maker ecosystem', desc: '', descEn: '' },
      { time: '15:40', place: '主会场', placeEn: 'Main stage', title: 'TOP37 高校签约 · 《长宁倡议》发布', titleEn: 'TOP37 university signing · Changning Initiative launch', desc: '', descEn: '' },
      { time: '16:20', place: '乐动虹桥', placeEn: 'LeDong Hongqiao', title: '自由社交 · 展陈参观 · 合作洽谈', titleEn: 'Open networking · exhibition walk-through · partnership talks', desc: '', descEn: '' },
      { time: '18:30', place: '乐动虹桥', placeEn: 'LeDong Hongqiao', title: 'After Party · 投资人-创业者速配', titleEn: 'After Party · investor–founder speed matching', desc: '', descEn: '' },
    ],
  },
  {
    id: 'day2',
    day: 'Day 2',
    date: '12 月 6 日（周日）',
    dateEn: 'December 6 (Sun)',
    venue: '乐动虹桥',
    venueEn: 'LeDong Hongqiao',
    positioning: '展览 + 路演主日',
    positioningEn: 'Exhibition + roadshow main day',
    summary: '全天决赛路演、主题交流活动（具体排期待公布）、游园会与长宁味道市集；傍晚闭幕颁奖与落地签约。',
    summaryEn: 'A full day of finals roadshows, themed discussions (programme to be announced), the maker fair and the Changning Flavours market, closing in the evening with awards and on-the-ground signings.',
    items: [
      { time: '09:30', place: '乐动虹桥', placeEn: 'LeDong Hongqiao', title: '全面开馆', titleEn: 'Doors open', desc: '市集 / 展商 / 互动 / 游园护照。', descEn: 'Market, exhibitors, hands-on demos and the fair passport.' },
      { time: '09:30—12:00', place: '乐动虹桥 · 路演主会场', placeEn: 'LeDong Hongqiao · Roadshow main stage', title: '决赛路演上半场', titleEn: 'Finals roadshow · session one', desc: '分论坛上午场 · 海外分会场路演同步进行。', descEn: 'Morning sub-forums, with overseas venue roadshows running in parallel.' },
      { time: '12:00—13:30', place: '乐动虹桥 1F', placeEn: 'LeDong Hongqiao 1F', title: '午餐时段', titleEn: 'Lunch break', desc: '长宁味道市集人流高峰。', descEn: 'Peak hours at the Changning Flavours market.' },
      { time: '13:30—17:00', place: '乐动虹桥 · 路演主会场', placeEn: 'LeDong Hongqiao · Roadshow main stage', title: '决赛路演下半场', titleEn: 'Finals roadshow · session two', desc: '圆桌讨论 · 分论坛下午场。', descEn: 'Roundtable discussions and the afternoon sub-forums.' },
      { time: '17:00—18:00', place: '主会场', placeEn: 'Main stage', title: '闭幕颁奖', titleEn: 'Closing & awards', desc: '赛事颁奖 · 落地签约 · 大会总结 · 大合影。', descEn: 'Awards, on-the-ground signings, wrap-up and the group photo.' },
    ],
  },
] as const;

/* ---------------------------------------------------------------- 分会场 */
/** Published sessions only. The provisional programme is withdrawn pending confirmation. */
export interface ForumPlan {
  name: string;
  nameEn: string;
  topic: string;
  topicEn: string;
  host: string;
  hostEn: string;
  place: string;
  placeEn: string;
  when: string;
  whenEn: string;
}
export const forums: readonly ForumPlan[] = [];

/* ---------------------------------------------------------------- 官网模块 */
export const siteModules = [
  { name: '赛事报名', nameEn: 'Contest entry', action: '报名参赛（团队 / 个人）', actionEn: 'Enter the contest (team or solo)', desc: '五大赛道选择、提交项目资料与团队信息，生成报名凭证。', descEn: 'Pick one of five tracks, submit your project and team details, and get an entry pass.' },
  { name: '赛事组队', nameEn: 'Team-up', action: '在线组队 / 招募队员', actionEn: 'Form a team or recruit members', desc: '发布项目简介、技能标签，开发者匹配组队，形成战队档案（打通原子公社名片模块）。', descEn: 'Post a project brief and skill tags, match with developers and build a team profile (linked to AtomHub digital cards).' },
  { name: '论坛报名', nameEn: 'Forum registration', action: '观众报名分论坛', actionEn: 'Reserve a sub-forum seat', desc: '按分会场与场次选座预约，生成入场凭证。', descEn: 'Pick a room and session, reserve a seat and get an entry pass.' },
  { name: '发起论坛', nameEn: 'Host a forum', action: '社区申请发起论坛', actionEn: 'Apply to host a forum', desc: '个人 / 机构提交论坛主题、嘉宾与时间，主办方审核后排期上架。', descEn: 'Individuals and organisations submit a topic, speakers and preferred time; the hosts review and schedule it.' },
  { name: '项目展示', nameEn: 'Project showcase', action: '入围项目线上展示', actionEn: 'Shortlisted projects online', desc: '作品详情、DEMO 视频、观众投票（人气奖）。', descEn: 'Project details, demo videos and audience voting for the popularity award.' },
  { name: '直播中心', nameEn: 'Live centre', action: '全程直播入口', actionEn: 'Full live-stream entrance', desc: '开幕式、决赛路演、分会场巡播、海外分会场连线。', descEn: 'Opening ceremony, finals roadshows, sub-forum roaming coverage and overseas venue link-ups.' },
  { name: '票务预约', nameEn: 'Ticketing', action: '分论坛与通票预约', actionEn: 'Sub-forum and full pass booking', desc: '按场次预约席位，生成电子入场凭证。', descEn: 'Book by session and receive an e-ticket for entry.' },
  { name: '创客社区', nameEn: 'Maker community', action: '组队广场与人才市场', actionEn: 'Team-up board and talent market', desc: '招募与求职撮合，数字名片交换。', descEn: 'Match recruitment with job seekers and exchange digital cards.' },
] as const;
