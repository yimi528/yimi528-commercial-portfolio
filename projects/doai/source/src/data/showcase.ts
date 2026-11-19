import { creatorDirections } from './creatorTrack';

/**
 * 现场亮点 · 场馆导览 · 合作权益
 *
 * 全部内容提炼自《DOAI 大会介绍》PPT（2026.11 版，43 页）：
 *   第 12—17 页  六大亮点（可赛 / 可逛 / 可玩 / 可学 / 可合作 / 全球化）
 *   第 21—37 页  乐动虹桥 1F / 4F / 5F 与德必园区逐点位空间规划
 *   第 39—43 页  四层招商合作体系、内容合作模式、合作价值与联系方式
 *
 * 场馆配图均为 PPT 的示意渲染图，页面必须标注「图片为示意图」，
 * 不得让读者误认为已完工实景。
 */

import venue1fEntrance from '../assets/images/ppt/venue-ledong-1f-entrance.jpg';
import venue1fCheckin from '../assets/images/ppt/venue-ledong-1f-checkin.jpg';
import venue1fGiftbag from '../assets/images/ppt/venue-ledong-1f-giftbag.jpg';
import venue1fMainhall from '../assets/images/ppt/venue-ledong-1f-mainhall.jpg';
import venue1fExpo from '../assets/images/ppt/venue-ledong-1f-expo.jpg';
import venue1fGate2 from '../assets/images/ppt/venue-ledong-1f-gate2.jpg';
import venue1fBookstore from '../assets/images/ppt/venue-ledong-1f-bookstore.jpg';
import venue4fStairs from '../assets/images/ppt/venue-ledong-4f-stairs.jpg';
import venue4fForum from '../assets/images/ppt/venue-ledong-4f-forum.jpg';
import venue4fShowcase from '../assets/images/ppt/venue-ledong-4f-showcase.jpg';
import venue4fInfodesk from '../assets/images/ppt/venue-ledong-4f-infodesk.jpg';
import venue4fInteractive from '../assets/images/ppt/venue-ledong-4f-interactive.jpg';
import venue4fLounge from '../assets/images/ppt/venue-ledong-4f-lounge.jpg';
import venue5fCheckpoint from '../assets/images/ppt/venue-ledong-5f-checkpoint.jpg';
import venueDebeiOverseas from '../assets/images/ppt/venue-debei-overseas.jpg';

/* ==========================================================================
   一、六大亮点 —— 可赛 / 可逛 / 可玩 / 可学 / 可合作 / 全球化
   ========================================================================== */

export interface Highlight {
  id: string;
  /** 卡片左上角的一字标签，如「赛」「逛」 */
  glyph: string;
  label: string;
  labelEn: string;
  title: string;
  desc: string;
  /** 关键数字，直接来自 PPT */
  figure: { value: string; unit: string; unitEn?: string };
  points: string[];
  /** 点击后跳转的路由 */
  route?: string;
}

export const highlights: Highlight[] = [
  {
    id: 'hl-contest',
    glyph: '赛',
    label: '可赛',
    labelEn: 'COMPETE',
    title: 'Dobe 全球 AI 创客大赛 · 五大赛道同步进行',
    desc: '自由创意赛道三大方向，加 FDE 赛道两条真实企业命题，鼓励从真实需求出发，做出可体验、可落地的 AI 产品与服务。',
    figure: { value: '5', unit: '大赛道', unitEn: 'tracks' },
    points: [
      ...creatorDirections.map(direction => `自由创意赛道 · ${direction.title.replace(' 赛道', '').replace('赛道', '')}：${direction.tagline}`),
      'FDE 赛道 · 飞书深诺：广告素材侵权风险快速筛查工具',
      'FDE 赛道 · 上服集团：海派定制服饰 AI 需求解构与可视化 Agent',
    ],
    route: 'maker',
  },
  {
    id: 'hl-browse',
    glyph: '逛',
    label: '可逛',
    labelEn: 'EXPLORE',
    title: '60+ 企业展位 × 40+ 选手作品展位',
    desc: '科技型企业的产品现场摆摊，参赛选手的项目作品沿走廊铺开，边逛边试边聊。',
    figure: { value: '100+', unit: '个展位', unitEn: 'booths' },
    points: [
      '60+ 科技型企业展位：产品、方案、供应链现场对接',
      '40+ 参赛选手项目作品展位：从 Demo 到可上手',
      '乐动虹桥 4F 走廊选手项目展示区，路演之外可细看',
    ],
  },
  {
    id: 'hl-play',
    glyph: '玩',
    label: '可玩',
    labelEn: 'PLAY',
    title: '人机互动 · 交友休闲 · 娱乐区',
    desc: '不是只听会的两天。人机互动区、电竞区域、交友休闲区与娱乐配套，让非技术观众也能玩得进去。',
    figure: { value: '3', unit: '类互动配套', unitEn: 'interactive zones' },
    points: [
      '人机互动区：与 AI 硬件、具身设备现场过招',
      '电竞区域：紧邻 4F 公共咨询台',
      '交友休闲区与娱乐区：逛累了随时落脚',
    ],
  },
  {
    id: 'hl-learn',
    glyph: '学',
    label: '可学',
    labelEn: 'LEARN',
    title: '分论坛排期待公布',
    desc: '分论坛议题、嘉宾与场次将在确认后公布。',
    figure: { value: '待公布', unit: '', unitEn: '' },
    points: [
      '主题交流活动，分论坛具体排期待公布',
      '具体议题与场次待确认',
      '海外嘉宾参与圆桌论坛与赛事评审',
    ],
    route: 'forum',
  },
  {
    id: 'hl-collab',
    glyph: '合',
    label: '可合作',
    labelEn: 'DEAL',
    title: 'Deep talk：让需求方与供给方真的坐下谈',
    desc: '专门划出 Deep talk 区域，把有真实需求的企业和有方案的能力方撮合到同一张桌子上。',
    figure: { value: '1', unit: '个撮合专区', unitEn: 'matchmaking zone' },
    points: [
      '需求方：带着真实业务问题与预算进场',
      '供给方：带着可演示的方案与交付能力进场',
      '现场撮合，会后持续跟进至 POC 签约',
    ],
  },
  {
    id: 'hl-global',
    glyph: '球',
    label: '全球化',
    labelEn: 'GLOBAL',
    title: '全球 Top 37 所高校海外创客专场',
    desc: '覆盖 Top 37 所高校的青年创客，把海外赛事专场、现场签约仪式与海外明星嘉宾一起搬到上海。',
    figure: { value: 'TOP 37', unit: '所高校', unitEn: 'universities' },
    points: [
      '海外赛事专场：覆盖 Top 37 所高校的青年创客，打造全球化的 AI 赛事高地',
      '现场签约仪式：Top 37 所高校在大会现场举办签约仪式',
      '全球化明星嘉宾阵容：海外嘉宾参与圆桌论坛、赛事评审',
      '香港 · 佛罗伦萨 · 硅谷三大海外分会场线上联动',
    ],
    route: 'conference',
  },
];

/* ==========================================================================
   二、场馆导览 —— 乐动虹桥 1F / 4F / 5F + 德必大虹桥园区
   ========================================================================== */

export interface VenueZone {
  id: string;
  area: string;
  areaEn: string;
  desc: string;
  descEn: string;
  points: string[];
  pointsEn: string[];
  image: string;
}

export interface VenueGroup {
  id: string;
  label: string;
  labelEn: string;
  /** 建筑标高：楼层标尺上作为标识用，如 1F / 4F—5F / PARK。 */
  level: string;
  title: string;
  titleEn: string;
  summary: string;
  summaryEn: string;
  zones: VenueZone[];
}

export const venueGroups: VenueGroup[] = [
  {
    id: 'ledong-1f',
    label: '乐动虹桥 · 1F',
    labelEn: 'LeDong 1F',
    level: '1F',
    title: '迎宾、签到与主会场',
    titleEn: 'Welcome, Check-in & Main Hall',
    summary:
      '从 1 号门主入口进场，签到、领物料、进主会场，再逛展商区域；2 号门作为次入口分流，樊登书店提供一处安静的落脚点。',
    summaryEn:
      'Enter through Gate 1: check in, collect your materials, head into the main hall, then walk the exhibitor area. Gate 2 splits the flow as a second entrance, and the Fan Deng bookstore offers a quiet corner to land in.',
    zones: [
      {
        id: 'zone-1f-gate1',
        area: '主入口（1 号门）',
        areaEn: 'Main Entrance (Gate 1)',
        desc: '入口与签到：1 处主入口主 KV，1 组引导、1 组咨询签到服务点，楼层总导览和分区导视。',
        descEn:
          'Entrance and check-in: a main key visual at the gate, a wayfinding team, an information and check-in desk, plus a floor directory and zone signage.',
        points: ['主入口主 KV（1 号门）', '引导组 + 咨询签到服务点', '楼层总导览与分区导视'],
        pointsEn: ['Main key visual (Gate 1)', 'Wayfinding team + info & check-in desk', 'Floor directory and zone signage'],
        image: venue1fEntrance,
      },
      {
        id: 'zone-1f-checkin',
        area: '进门签到处',
        areaEn: 'Check-in Desk',
        desc: '签到与大会识别：1 处签到背景（大屏）、1 组签到台基础包装、功能桌牌、签到物料分发配置。',
        descEn:
          'Check-in and event identity: a check-in backdrop on the big screen, the counter dressing, function table cards and materials distribution.',
        points: ['签到背景大屏', '签到台基础包装', '功能桌牌与物料分发'],
        pointsEn: ['Check-in backdrop screen', 'Counter dressing', 'Function table cards and materials'],
        image: venue1fCheckin,
      },
      {
        id: 'zone-1f-giftbag',
        area: '嘉宾物料包',
        areaEn: 'Guest Materials',
        desc: '签到物料包：嘉宾证、物料包，凭 DOAI Passport 扫码核销后领取。',
        descEn: 'Check-in pack: a guest badge and materials bag, collected after scanning and validating your DOAI Passport.',
        points: ['嘉宾证', '嘉宾物料包'],
        pointsEn: ['Guest badge', 'Guest materials bag'],
        image: venue1fGiftbag,
      },
      {
        id: 'zone-1f-mainhall',
        area: '主会场',
        areaEn: 'Main Hall',
        desc: '开幕、圆桌与决赛路演的主场。现场配嘉宾人形搞笑立牌与其他当日互动物料。',
        descEn:
          'Home to the opening, roundtables and finals pitches, with cut-out standees of the speakers and other interactive props for the day.',
        points: ['剧场级主会场', '嘉宾人形立牌与当日互动物料', '全程直播机位'],
        pointsEn: ['Theatre-grade main hall', 'Speaker standees and daily interactive props', 'Livestream camera positions'],
        image: venue1fMainhall,
      },
      {
        id: 'zone-1f-expo',
        area: '展商区域',
        areaEn: 'Exhibitor Zone',
        desc: '60+ 科技型企业展位集中区，大中小三级展位，核心位置可特装。',
        descEn: 'A cluster of 60+ tech company booths in three sizes — large, medium and small — with custom builds available in prime positions.',
        points: ['大中小三级展位', '现场展示 + 快闪分享', '核心位置特装可选'],
        pointsEn: ['Three booth sizes', 'Live demo + flash talks', 'Custom builds in prime spots'],
        image: venue1fExpo,
      },
      {
        id: 'zone-1f-gate2',
        area: '次入口（2 号门）',
        areaEn: 'Second Entrance (Gate 2)',
        desc: '入口与签到：次主 KV（2 号门），1 处次门落地引导装置、1 组咨询签到服务点，楼层总导览和分区导视。',
        descEn:
          'Entrance and check-in: a secondary key visual at Gate 2, a floor-mounted wayfinding piece, an information and check-in desk, plus the floor directory and zone signage.',
        points: ['次主 KV（2 号门）', '落地引导装置', '咨询签到服务点'],
        pointsEn: ['Secondary key visual (Gate 2)', 'Floor-mounted wayfinding', 'Info & check-in desk'],
        image: venue1fGate2,
      },
      {
        id: 'zone-1f-bookstore',
        area: '樊登书店',
        areaEn: 'Fan Deng Bookstore',
        desc: '招聘与书店活动：分享、桌游和手作，也是 1F 最安静的一处落脚点。',
        descEn: 'Hiring and bookstore activities: talks, board games and crafts — also the quietest corner on 1F.',
        points: ['人才招聘对接', '分享会 · 桌游 · 手作', '休闲与洽谈'],
        pointsEn: ['Recruiting meet-ups', 'Talks · board games · crafts', 'Rest and conversation'],
        image: venue1fBookstore,
      },
    ],
  },
  {
    id: 'ledong-4f',
    label: '乐动虹桥 · 4F—5F',
    labelEn: 'LeDong 4F—5F',
    level: '4F—5F',
    title: '分论坛、选手展示与互动',
    titleEn: 'Forums, Showcase & Play',
    summary:
      '4F 是分论坛与互动的核心层：楼梯入口设互动装置，走廊铺开选手项目展示，公共咨询台旁是人机互动与电竞区；5F 设打卡区。',
    summaryEn:
      '4F is the core forum and play floor: an interactive installation at the stair entrance, contestant projects along the corridor, and human-machine interaction plus esports next to the info desk. The photo spot is on 5F.',
    zones: [
      {
        id: 'zone-4f-stairs',
        area: '楼梯入口互动区域',
        areaEn: 'Stair Entrance Play Zone',
        desc: '从 1F 上到 4F 的第一处情绪转换点，用互动装置把人流自然带入分论坛层。',
        descEn: 'The first mood shift coming up from 1F into 4F, where an interactive installation eases the crowd into the forum floor.',
        points: ['楼梯口互动装置', '动线导视'],
        pointsEn: ['Interactive installation at the stairs', 'Route signage'],
        image: venue4fStairs,
      },
      {
        id: 'zone-4f-forum',
        area: '4F + 5F 分论坛',
        areaEn: '4F + 5F Forums',
        desc: '主题交流活动空间，具体议题与排期待确认后公布。',
        descEn: 'Themed discussion spaces; topics and schedules will be announced after confirmation.',
        points: ['分论坛主承载层', '具体排期待公布', '可串场连听'],
        pointsEn: ['Core forum floor', 'Programme to be announced', 'Hop between rooms'],
        image: venue4fForum,
      },
      {
        id: 'zone-4f-showcase',
        area: '走廊选手项目展示区',
        areaEn: 'Corridor Project Showcase',
        desc: '40+ 参赛选手项目作品沿走廊铺开，路演之外还能站着细看、上手试。',
        descEn: 'Work from 40+ contestants runs along the corridor — beyond the pitch, you can stop, look closely and try it yourself.',
        points: ['40+ 选手项目作品', '沿走廊连续展位', '与路演动线相接'],
        pointsEn: ['40+ contestant projects', 'A continuous line of stands', 'Connects to the pitch route'],
        image: venue4fShowcase,
      },
      {
        id: 'zone-4f-infodesk',
        area: '公共咨询台',
        areaEn: 'Information Desk',
        desc: '4F 的动线枢纽，问询、导览与失物招领都在这里。',
        descEn: 'The hub of 4F — questions, directions and lost property all land here.',
        points: ['问询与导览', '楼层动线枢纽'],
        pointsEn: ['Questions and directions', 'Floor circulation hub'],
        image: venue4fInfodesk,
      },
      {
        id: 'zone-4f-interactive',
        area: '人机互动 + 电竞区域',
        areaEn: 'Human-Machine Play + Esports',
        desc: '紧邻公共咨询台，人机互动与电竞对战放在一起，路过就能上手。',
        descEn: 'Right next to the info desk, human-machine play and esports matches sit together — walk past and jump in.',
        points: ['人机互动体验', '电竞对战区', '紧邻公共咨询台'],
        pointsEn: ['Human-machine experiences', 'Esports match zone', 'Next to the info desk'],
        image: venue4fInteractive,
      },
      {
        id: 'zone-4f-lounge',
        area: '咨询台附近互动区',
        areaEn: 'Lounge Near the Info Desk',
        desc: '以 Deep talk 为主的轻互动区，需求方与供给方在这里坐下谈。',
        descEn: 'A light-touch zone built around Deep Talks, where people with needs and people with answers sit down together.',
        points: ['Deep talk 撮合', '交友休闲', '轻量洽谈'],
        pointsEn: ['Deep Talk matchmaking', 'Meet and unwind', 'Informal deal talks'],
        image: venue4fLounge,
      },
      {
        id: 'zone-5f-checkpoint',
        area: '5F 打卡区',
        areaEn: '5F Photo Spot',
        desc: '位于 4F 咨询台互动区楼上，整层最高处的一处打卡与俯瞰点。',
        descEn: 'Above the 4F lounge, this is the highest point in the building — a photo spot looking down over the atrium.',
        points: ['大会打卡点', '俯瞰 4F 中庭'],
        pointsEn: ['Event photo spot', 'Atrium view over 4F'],
        image: venue5fCheckpoint,
      },
    ],
  },
  {
    id: 'debei',
    label: '德必大虹桥园区',
    labelEn: 'Dobe Park',
    level: 'PARK',
    title: '海外专场与自由创意赛道路演',
    titleEn: 'Overseas Programme & Free Creation Pitches',
    summary:
      '12/5 的开幕与社交主场。园区内设海外专场与自由创意赛道路演区域，海外嘉宾与 TOP 37 高校团队在此连线与签约。',
    summaryEn:
      'Home of the Dec 5 opening and social programme. The park hosts the overseas programme and the Free Creation pitch area, where overseas guests and the TOP 37 university teams connect and sign.',
    zones: [
      {
        id: 'zone-debei-overseas',
        area: '海外专场 + 自由创意赛道路演区',
        areaEn: 'Overseas Programme + Free Creation Pitch Area',
        desc: '海外创客专场与自由创意赛道项目路演共用同一片区域，海外评审通过线上评审室接入。',
        descEn:
          'The overseas makers programme and Free Creation track pitches share one space, with overseas judges joining through the online judging room.',
        points: ['海外创客专场', '自由创意赛道路演', '线上评审室连线'],
        pointsEn: ['Overseas makers programme', 'Free Creation pitches', 'Online judging room link'],
        image: venueDebeiOverseas,
      },
    ],
  },
];

/** PPT 对全部场馆渲染图的统一免责说明。 */
export const venueImageNote = '图片为示意图，最终以现场实际搭建为准。';
export const venueImageNoteEn = 'Images are illustrative; the on-site build is final.';

/* ==========================================================================
   三、合作体系 —— 四层合作 × 内容合作模式 × 合作价值
   ========================================================================== */

export interface CollabTier {
  tier: string;
  tierEn: string;
  name: string;
  nameEn: string;
  price: string;
  priceEn: string;
  points: string[];
  pointsEn: string[];
}

/** 招商合作体系：四层，从顶级冠名到资源置换。 */
export const collabTiers: CollabTier[] = [
  {
    tier: '第一层',
    tierEn: 'Tier 1',
    name: '冠名战略合作',
    nameEn: 'Title Sponsorship',
    price: '20 万起',
    priceEn: 'From ¥200,000',
    points: ['活动冠名、开幕致辞', '全物料 Logo 露出', '数据报告联合署名'],
    pointsEn: ['Event naming rights and opening remarks', 'Logo across all materials', 'Co-signed data report'],
  },
  {
    tier: '第二层',
    tierEn: 'Tier 2',
    name: '展位展示',
    nameEn: 'Booth Presence',
    price: '免费 — 3 万',
    priceEn: 'Free — ¥30,000',
    points: ['大中小三级展位', '现场展示 + 快闪分享', '核心位置特装可选'],
    pointsEn: ['Three booth sizes', 'Live demo + flash talk', 'Custom builds in prime spots'],
  },
  {
    tier: '第三层',
    tierEn: 'Tier 3',
    name: '内容合作',
    nameEn: 'Content Partnership',
    price: '3 — 8 万',
    priceEn: '¥30,000 — ¥80,000',
    points: ['分会场冠名承办', '赛道赞助与出题权', '演讲席位 + 直播切片'],
    pointsEn: ['Host a named sub-venue', 'Track sponsorship and brief-setting rights', 'Speaking slot + livestream clips'],
  },
  {
    tier: '第四层',
    tierEn: 'Tier 4',
    name: '广告与资源',
    nameEn: 'Advertising & Resources',
    price: '2000 起',
    priceEn: 'From ¥2,000',
    points: ['官网广告位', '市集摊位 / 媒体置换', '资源置换灵活合作'],
    pointsEn: ['Website ad slots', 'Market stall / media barter', 'Flexible resource swaps'],
  },
];

export interface ContentModel {
  id: string;
  tag: string;
  tagEn: string;
  name: string;
  nameEn: string;
  price: string;
  priceEn: string;
  points: string[];
  pointsEn: string[];
}

/** 内容合作：两种深度绑定模式。 */
export const contentModels: ContentModel[] = [
  {
    id: 'cm-venue',
    tag: '模式一',
    tagEn: 'Model 1',
    name: '分会场冠名承办',
    nameEn: 'Host a Named Sub-venue',
    price: '3—8 万元 / 场 或资源置换',
    priceEn: '¥30,000–80,000 per session, or resource swaps',
    points: [
      '会场冠名：「××冠名 · DOAI · 会场名」',
      '2—3 个演讲席位，主导议题设置',
      '现场物料 + 官方推文 Logo 露出',
      '直播切片 + 观众报名数据回收',
      '优先对接政府 / 投资 / 媒体资源',
    ],
    pointsEn: [
      'Session naming: "Presented by XX · DOAI · Room name"',
      '2–3 speaking slots and a leading say in the agenda',
      'On-site materials plus logo in official posts',
      'Livestream clips and attendee registration data',
      'Priority introductions to government, investor and media contacts',
    ],
  },
  {
    id: 'cm-track',
    tag: '模式二',
    tagEn: 'Model 2',
    name: '赛道赞助与出题',
    nameEn: 'Track Sponsorship & Brief-setting',
    price: '5 万元 / 赛道（建议价）',
    priceEn: '¥50,000 per track (suggested)',
    points: [
      '赛道命名权：「DOAI ××赛道」',
      '真实业务命题发布权，定向解题',
      '评委席位，参与项目评审打分',
      '颁奖环节露出 + 获奖方案优先对接',
      '金奖项目 POC 订单与采购优先权',
    ],
    pointsEn: [
      'Track naming rights: "DOAI XX Track"',
      'Publish a real business brief and have teams solve to it',
      'A judging seat with scoring rights',
      'Awards-stage presence and first access to winning proposals',
      'Priority POC orders and procurement for gold winners',
    ],
  },
];

/** 为什么选择 DOAI：一次合作，四重回报。 */
export const collabValue = [
  {
    key: '声量',
    keyEn: 'Reach',
    desc: '500 万+ 全网曝光，3 路直播 + 30+ 媒体，区域热搜级品牌声量',
    descEn: '5M+ total reach, three livestream channels and 30+ media outlets — brand visibility at regional trending level.',
  },
  {
    key: '线索',
    keyEn: 'Leads',
    desc: '2000+ 精准客流 + 参赛项目对接，会后交付数据报告与线索包',
    descEn: '2,000+ qualified visitors and contestant introductions, with a data report and lead pack delivered afterwards.',
  },
  {
    key: '人才',
    keyEn: 'Talent',
    desc: '1000+ 全球开发者 + TOP 37 高校资源，精准触达 AI 领域优质人才',
    descEn: '1,000+ developers worldwide plus TOP 37 university networks — direct access to strong AI talent.',
  },
  {
    key: '生态',
    keyEn: 'Ecosystem',
    desc: '政府背书 + 产业资源 + 投资机构，深度融入长宁 AI 产业生态',
    descEn: 'Government backing, industry resources and investors — plug into the Changning AI ecosystem.',
  },
];

/** 招商对接联系方式（来自大会介绍材料末页）。 */
export const collabContact = {
  org: '原子公社 AtomHub × 德必集团',
  orgEn: 'AtomHub × DoBe Group',
  emails: ['jocelyn@atomesh.cn', 'might@atomesh.cn'],
  wechat: 'Might0311',
} as const;