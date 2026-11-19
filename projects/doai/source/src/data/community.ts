import { creatorIntroduction, creatorIntroductionEn, creatorDirections, creatorCriteria, creatorCriteriaEn } from './creatorTrack';

/**
 * Data for three modules modelled on the GOAI reference site:
 *   1. 拟邀顾问与嘉宾 / 组织架构 / 合作方   (homepage)
 *   2. 赛题与赛制                    (赛事中心 · FDE / 自由创意两个赛道方框内)
 *   3. 活动动态                      (大会介绍)
 *
 * Names, titles and partner lists follow the official
 * 《DOAI Dobe AI 创客大会 · 对外招商方案》(2026.10) verbatim.
 * 拟邀嘉宾 = invited, NOT confirmed — never present them as confirmed.
 */

/* ------------------------------------------------------------------ 拟邀嘉宾 */

export type PersonRole = 'guest-domestic' | 'guest-international';

export interface Person {
  id: string;
  name: string;
  nameEn?: string;
  title: string;
  titleEn?: string;
  org: string;
  orgEn?: string;
  role: PersonRole;
  avatar: string;
}

/** Placeholder portraits: no external calls. The UI renders a monogram from
 * `name` until real headshots arrive. */
const avatar = (_seed: string) => '';

/** 拟邀国内顾问与嘉宾（11 位）— 头衔逐字照抄大会介绍 PPT 第 6—7 页。 */
export const invitedGuestsZh: Person[] = [
  { id: 'g-zh-1', name: '贾波', nameEn: 'Jia Bo', title: '创始人', titleEn: 'Founder', org: '德必集团', orgEn: 'DoBe Group', role: 'guest-domestic', avatar: avatar('doai-guest-1') },
  { id: 'g-zh-2', name: '江南春', nameEn: 'Jiang Nanchun', title: '创始人', titleEn: 'Founder', org: '分众传媒', orgEn: 'Focus Media', role: 'guest-domestic', avatar: avatar('doai-guest-2') },
  { id: 'g-zh-4', name: '米磊', nameEn: 'Mi Lei', title: '创始合伙人', titleEn: 'Founding Partner', org: '中科创星', orgEn: 'CAS Star', role: 'guest-domestic', avatar: avatar('doai-guest-4') },
  { id: 'g-zh-5', name: '章苏阳', nameEn: 'Zhang Suyang', title: '创始合伙人', titleEn: 'Founding Partner', org: '火山石资本', orgEn: 'Volcanics Venture', role: 'guest-domestic', avatar: avatar('doai-guest-5') },
  { id: 'g-zh-6', name: '陆雄文', nameEn: 'Lu Xiongwen', title: '院长', titleEn: 'Dean', org: '复旦大学管理学院', orgEn: 'Fudan University School of Management', role: 'guest-domestic', avatar: avatar('doai-guest-6') },
  { id: 'g-zh-7', name: '叶再长', nameEn: 'Ye Zaichang', title: '创始人', titleEn: 'Founder', org: '盛大科技集团', orgEn: 'Shanda Technology Group', role: 'guest-domestic', avatar: avatar('doai-guest-7') },
  { id: 'g-zh-8', name: '俞斌', nameEn: 'Yu Bin', title: '总裁', titleEn: 'President', org: '华京投资', orgEn: 'Huajing Investment', role: 'guest-domestic', avatar: avatar('doai-guest-8') },
  { id: 'g-zh-9', name: '邵俊', nameEn: 'Shao Jun', title: '董事长', titleEn: 'Chairman', org: '德同资本', orgEn: 'DT Capital Partners', role: 'guest-domestic', avatar: avatar('doai-guest-9') },
  { id: 'g-zh-10', name: '邵钧', nameEn: 'Shao Jun', title: '创始人', titleEn: 'Founder', org: '创合汇', orgEn: 'Chuanghehui', role: 'guest-domestic', avatar: avatar('doai-guest-10') },
  { id: 'g-zh-11', name: '李泉生', nameEn: 'Li Quansheng', title: '合伙人', titleEn: 'Partner', org: '三角洲创投', orgEn: 'Delta Ventures', role: 'guest-domestic', avatar: avatar('doai-guest-11') },
  { id: 'g-zh-12', name: '吴正修', nameEn: 'Wu Zhengxiu', title: '博士', titleEn: 'PhD', org: '斯坦福大学', orgEn: 'Stanford University', role: 'guest-domestic', avatar: avatar('doai-guest-12') },
];

/** 拟邀国际顾问与嘉宾（5 位）— 身份逐字照抄招商方案。 */
export const invitedGuestsIntl: Person[] = [
  { id: 'g-in-1', name: 'Allen Yang', nameEn: 'Allen Yang', title: 'UC Berkeley · ROAR AI Racing', titleEn: 'UC Berkeley · ROAR AI Racing', org: '', orgEn: '', role: 'guest-international', avatar: avatar('doai-guest-i1') },
  { id: 'g-in-2', name: 'Andreas Ramo', nameEn: 'Andreas Ramo', title: '美国作家 · 数字营销专家', titleEn: 'American writer · digital marketing expert', org: '', orgEn: '', role: 'guest-international', avatar: avatar('doai-guest-i2') },
  { id: 'g-in-3', name: 'Amir Emadzadeh', nameEn: 'Amir Emadzadeh', title: 'UCLA 电气工程博士', titleEn: 'PhD in Electrical Engineering, UCLA', org: '', orgEn: '', role: 'guest-international', avatar: avatar('doai-guest-i3') },
  { id: 'g-in-4', name: 'Laiq Ahmad', nameEn: 'Laiq Ahmad', title: 'Pathward 高级副总裁', titleEn: 'Senior Vice President, Pathward', org: '', orgEn: '', role: 'guest-international', avatar: avatar('doai-guest-i4') },
  { id: 'g-in-5', name: 'Jason Mayes', nameEn: 'Jason Mayes', title: 'Google Web AI 负责人', titleEn: 'Head of Web AI, Google', org: '', orgEn: '', role: 'guest-international', avatar: avatar('doai-guest-i5') },
];

/* ------------------------------------------------------------------ 组织架构与伙伴 */

export interface Partner {
  id: string;
  name: string;
  nameEn: string;
  category: '指导单位' | '主办单位' | '联合主办单位' | '战略合作方' | '投资机构';
  categoryEn: string;
  desc: string;
  descEn: string;
}

export const partners: Partner[] = [
  { id: 'pt-gov', name: '长宁区人民政府', nameEn: 'Changning District People\u2019s Government', category: '指导单位', categoryEn: 'Guiding Unit', desc: '大会指导单位，政策与区域产业资源支持。', descEn: 'Guiding unit of the conference — policy and regional industry resources.' },
  { id: 'pt-db', name: '德必集团', nameEn: 'DoBe Group', category: '主办单位', categoryEn: 'Host', desc: '中国领先的文科创产业全价值链服务商，本次赛事及创客生态发起方。', descEn: 'A leading full-value-chain service provider for China’s cultural, creative and technology industries; initiator of this competition and its maker ecosystem.' },
  { id: 'pt-1', name: '原子公社 AtomHub', nameEn: 'AtomHub', category: '主办单位', categoryEn: 'Host', desc: '创客社区与赛事发起方，组队广场与数字名片模块提供方。', descEn: 'Maker community and contest initiator; provider of the teaming square and digital card modules.' },
  { id: 'pt-2', name: '上海市时代青年科创发展中心', nameEn: 'Shanghai Times Youth Science and Technology Innovation Development Center', category: '联合主办单位', categoryEn: 'Co-host', desc: '青年科创服务平台，联合主办单位。', descEn: 'Youth sci-tech innovation service platform; co-host of the conference.' },
  { id: 'pt-stepfun', name: '阶跃星辰', nameEn: 'StepFun', category: '战略合作方', categoryEn: 'Strategic Partner', desc: '战略合作方。', descEn: 'Strategic partner.' },
  { id: 'pt-sophnet', name: 'Sophnet/算能', nameEn: 'Sophnet', category: '战略合作方', categoryEn: 'Strategic Partner', desc: '战略合作方。', descEn: 'Strategic partner.' },
  { id: 'pt-zhihu', name: '知乎', nameEn: 'Zhihu', category: '战略合作方', categoryEn: 'Strategic Partner', desc: '战略合作方。', descEn: 'Strategic partner.' },
  { id: 'pt-ty', name: '涂鸦智能', nameEn: 'Tuya Smart', category: '战略合作方', categoryEn: 'Strategic Partner', desc: '战略合作方。', descEn: 'Strategic partner.' },
  { id: 'pt-sf', name: '上服集团', nameEn: 'SF Group', category: '战略合作方', categoryEn: 'Strategic Partner', desc: '战略合作方，FDE 赛道「海派定制服饰 AI 需求解构与可视化 Agent」命题发布方。', descEn: 'Strategic partner and brief issuer for the FDE track topic “AI demand deconstruction and visualisation agent for Shanghai-style bespoke tailoring”.' },
  { id: 'pt-fs', name: '飞书深诺', nameEn: 'SinoClick', category: '战略合作方', categoryEn: 'Strategic Partner', desc: '战略合作方，FDE 赛道「广告素材侵权风险快速筛查工具」命题发布方。', descEn: 'Strategic partner and brief issuer for the FDE track topic “fast infringement-risk screening for ad creatives”.' },
  { id: 'pt-raccoon', name: '商汤小浣熊', nameEn: 'SenseTime Raccoon', category: '战略合作方', categoryEn: 'Strategic Partner', desc: '战略合作方。', descEn: 'Strategic partner.' },
  { id: 'pt-damo', name: '阿里达摩院', nameEn: 'Alibaba DAMO Academy', category: '战略合作方', categoryEn: 'Strategic Partner', desc: '战略合作方。', descEn: 'Strategic partner.' },
  { id: 'pt-finewill', name: '风物资本', nameEn: 'FineWill Capital', category: '投资机构', categoryEn: 'Investment Institution', desc: '投资机构。', descEn: 'Investment institution.' },
];

export const partnerCategories = ['指导单位', '主办单位', '联合主办单位', '战略合作方', '投资机构'] as const;

/** 单位类别英文名，供英文模式下渲染分类标题。 */
export const partnerCategoryEn: Record<(typeof partnerCategories)[number], string> = {
  指导单位: 'Guiding Units',
  主办单位: 'Hosts',
  联合主办单位: 'Co-hosts',
  战略合作方: 'Strategic Partners',
  投资机构: 'Investment Institutions',
};

/** 执行架构（招商方案：大会组织结构）。 */
export const execGroups = [
  { name: '赛事组委会', nameEn: 'Contest Committee', duty: '命题 · 评审 · 路演', dutyEn: 'Briefs · Judging · Roadshow' },
  { name: '论坛组', nameEn: 'Forum Team', duty: '嘉宾 · 议程 · 分论坛', dutyEn: 'Speakers · Agenda · Sub-forums' },
  { name: '市集游园组', nameEn: 'Market & Fair Team', duty: '展商 · 体验 · 活动', dutyEn: 'Exhibitors · Experiences · Activities' },
  { name: '宣传招商组', nameEn: 'Marketing & Partnerships', duty: '媒体 · 合作 · 报名', dutyEn: 'Media · Partnerships · Registration' },
] as const;

/* ------------------------------------------------------- 赛题与赛制 */

/**
 * 命题正文分节 — 承载命题方原文中的痛点场景、能力要求、技术要求、边界说明等。
 * 与固定字段（背景 / 交付物 / 评审维度 / 配套资源）互补，避免把长文塞进 summary。
 */
export interface BriefSection {
  heading: string;
  headingEn?: string;
  /** 分节导语（可选） */
  body?: string;
  bodyEn?: string;
  /** 条目；output 为命题方要求的「输出物」 */
  items: { title?: string; titleEn?: string; desc: string; descEn?: string; output?: string; outputEn?: string }[];
}

/** 赛题 — FDE 赛道按招商方案为「真实产业命题」，发布日 10 月中旬。 */
export interface ContestBrief {
  id: string;
  code: string;
  track: 'industry' | 'creator';
  title: string;
  titleEn: string;
  sponsor: string;      // 命题发布方
  sponsorEn: string;
  status: 'open' | 'upcoming' | 'closed';
  publishDate: string;
  deadline: string;
  summary: string;
  summaryEn: string;
  background: string;
  backgroundEn: string;
  /** 命题方原文中的归属信息，如「赛道归属」「对应业务」 */
  meta?: { label: string; value: string }[];
  metaEn?: { label: string; value: string }[];
  /** 命题正文分节：痛点场景 / 能力要求 / 技术要求 / 边界说明 */
  sections?: BriefSection[];
  deliverables: string[];
  deliverablesEn: string[];
  criteria: { name: string; weight: string; desc: string }[];
  criteriaEn: { name: string; weight: string; desc: string }[];
  resources: string[];
  resourcesEn: string[];
}

export const contestBriefs: ContestBrief[] = [
  {
    id: 'b-prop-fs',
    code: 'FDE-01',
    track: 'industry',
    title: '广告素材侵权风险快速筛查工具',
    titleEn: 'Fast infringement-risk screening for ad creatives',
    sponsor: '飞书深诺',
    sponsorEn: 'SinoClick',
    status: 'open',
    publishDate: '2026-10-20',
    deadline: '2026-11-25',
    summary: '输入单张或批量广告素材，拆分图像元素并逐项反向检索，输出可追溯的侵权风险评估报告。',
    summaryEn: 'Upload one or a batch of ad creatives, split them into image elements, reverse-search each element and output a traceable infringement-risk report.',
    background: '飞书深诺每年为客户制作和投放数万条广告素材，来源包括设计师自制、客户提供、图库采购与网络参考二次创作，可能混入未授权图片、影视画面或摄影作品。现有内容合规审核难以完成版权来源比对，合成广告图又包含多个来源的元素，整图反向搜索往往无效，需要拆分后逐个核查。侵权素材上线可能导致下架、账户扣分或法律索赔。',
    backgroundEn: 'SinoClick produces and runs tens of thousands of ad creatives a year for its clients, sourcing them from in-house designers, client assets, stock libraries and reworked online references — any of which may carry unauthorised images, film stills or photography. Existing content-compliance review cannot compare copyright provenance, and because a composite ad contains elements from several sources, searching the whole image is usually useless: it has to be split and checked element by element. Shipping an infringing creative can mean take-downs, account penalties or legal claims.',
    meta: [{ label: '对应业务', value: '全业务线通用 · 广告素材审核与质量管理 · 法务合规支持' }],
    metaEn: [{ label: 'Business area', value: 'All business lines · ad creative review and quality control · legal compliance support' }],
    sections: [
      {
        heading: '工具能力要求',
        headingEn: 'What the tool must do',
        items: [
          { title: '素材元素拆分', titleEn: 'Element separation', desc: '将合成广告图自动拆分为产品主体、背景图、人物、logo / 水印、装饰元素等独立图像元素，支持人工框选修正。', descEn: 'Automatically split a composite ad into independent image elements — product subject, background, people, logo or watermark, decoration — with manual box selection to correct the result.' },
          { title: '逐元素反向检索', titleEn: 'Element-by-element reverse search', desc: '分别检索每个元素，返回高度相似图片的来源链接，标注来源域名类型：版权图库、社交媒体、新闻网站或其他。', descEn: 'Search each element separately and return source links for highly similar images, labelling the source domain type: stock library, social media, news site or other.' },
          { title: '元信息线索检测', titleEn: 'Metadata clue detection', desc: '提取 EXIF / 元数据中的图库水印痕迹、版权声明、相机型号等辅助线索。', descEn: 'Extract supporting clues from EXIF and other metadata — stock-library watermark traces, copyright notices, camera model.' },
          { title: '风险分级与证据链', titleEn: 'Risk grading with an evidence trail', desc: '综合检索结果给出高、中、低三级风险标注，每一级均须附可点击来源 URL 和相似度分值，供人工复核。', descEn: 'Grade each result high, medium or low risk, and attach a clickable source URL and similarity score to every judgement for human review.' },
          { title: '批量报告导出', titleEn: 'Batch report export', desc: '支持批量上传，导出 CSV 风险清单，包含文件名、风险等级、可疑元素和来源链接。', descEn: 'Support batch upload and export a CSV risk list with file name, risk level, suspicious element and source link.' },
        ],
      },
      {
        heading: '技术要求',
        headingEn: 'Technical requirements',
        items: [
          { desc: '支持 JPG / PNG 图片；短视频抽帧检测为进阶加分项，不强制要求。', descEn: 'JPG and PNG images must be supported; frame extraction from short video is a bonus, not a requirement.' },
          { desc: '每个拆分元素独立检索，结果与元素对应展示，并提供原始来源 URL。', descEn: 'Every separated element is searched independently, results are shown against that element, and the original source URL is provided.' },
          { desc: '来源域名识别至少覆盖 Getty Images、Shutterstock、视觉中国三家主流版权图库。', descEn: 'Source-domain recognition must cover at least Getty Images, Shutterstock and Visual China Group.' },
          { desc: '单张图片处理时间 ≤ 15 秒（含拆分与检索），批量 50 张 ≤ 3 分钟。', descEn: 'At most 15 seconds per image (splitting and searching included), and at most 3 minutes for a batch of 50.' },
          { desc: '工具显著位置须标注：本工具为风险筛查辅助，不构成法律意见，最终侵权认定需法务确认。', descEn: 'The tool must state prominently that it is a risk-screening aid, not legal advice, and that the final infringement judgement rests with legal counsel.' },
        ],
      },
    ],
    deliverables: ['轻量筛查工具：支持单张或批量广告素材输入，输出侵权风险评估报告', '可导出的 CSV 风险清单（文件名、风险等级、可疑元素、来源链接）'],
    deliverablesEn: ['A lightweight screening tool that accepts one or a batch of ad creatives and outputs an infringement-risk report', 'An exportable CSV risk list (file name, risk level, suspicious element, source link)'],
    criteria: [
      { name: '元素拆分效果', weight: '30%', desc: '能否准确拆分合成素材中的独立图像元素，拆分粒度是否合理' },
      { name: '检索覆盖率', weight: '25%', desc: '对已知侵权测试素材能否检索到版权来源，现场提供 10–20 张测试图' },
      { name: '证据链完整性', weight: '20%', desc: '每条风险判断是否有可追溯的来源 URL 和相似度依据' },
      { name: '交互体验', weight: '15%', desc: '批量处理、人工修正、报告导出是否流畅' },
      { name: '技术创新性', weight: '10%', desc: '是否有局部特征匹配、水印检测等超出基础反向搜索的创新点' },
    ],
    criteriaEn: [
      { name: 'Element separation quality', weight: '30%', desc: 'Whether independent elements are separated accurately and the granularity is sensible' },
      { name: 'Search coverage', weight: '25%', desc: 'Whether known infringing test material can be traced to its copyright source; 10–20 test images are provided on site' },
      { name: 'Evidence integrity', weight: '20%', desc: 'Whether every risk judgement carries a traceable source URL and similarity basis' },
      { name: 'Interaction experience', weight: '15%', desc: 'Whether batch processing, manual correction and report export run smoothly' },
      { name: 'Technical originality', weight: '10%', desc: 'Whether it goes beyond basic reverse search with local feature matching, watermark detection or similar' },
    ],
    resources: ['评审现场提供 10–20 张已知侵权测试图'],
    resourcesEn: ['10–20 known-infringing test images are provided at the judging session'],
  },
  {
    id: 'b-prop-sf',
    code: 'FDE-03',
    track: 'industry',
    title: '海派定制服饰 AI 需求解构与可视化 Agent',
    titleEn: 'AI demand deconstruction and visualisation agent for bespoke apparel',
    sponsor: '上服集团（上海服装集团）',
    sponsorEn: 'SF Group (Shanghai Garment Group)',
    status: 'open',
    publishDate: '2026-10-20',
    deadline: '2026-11-25',
    summary: '面向海派高级定制与团体职业服定制，解构客户感性需求、匹配集团资源，生成方案初稿、视觉提示词与业务台账。',
    summaryEn: 'For Shanghai-style haute couture and corporate uniform tailoring: deconstruct clients’ intuitive requirements, match group resources, and generate draft proposals, visual prompts and a business ledger.',
    background: '上海服装集团海派高级定制与团体职业服定制业务中，客户需求感性模糊，专业转化依赖资深人员，集团版型、面料、工艺及历史案例资源尚缺少结构化检索，方案缺少快速可视化和统一归档。Agent 定位业务辅助助手，降低沟通成本、复用存量定制资产、缩短洽谈周期并沉淀业务案例。',
    backgroundEn: 'In Shanghai Garment Group’s Shanghai-style haute couture and corporate uniform business, client requirements arrive as vague impressions, and turning them into specifications depends on senior staff. The group’s patterns, fabrics, craft techniques and past cases are not yet searchable in a structured way, proposals cannot be visualised quickly, and nothing is archived consistently. The agent is positioned as a business assistant: it lowers communication cost, reuses existing tailoring assets, shortens negotiation cycles and accumulates case history.',
    meta: [
      { label: '命题方板块', value: '上海服装集团 · 服装板块' },
      { label: '命题方原文赛道归属', value: 'AI+消费（IP类情绪消费 · 新消费）' },
      { label: '对应业务', value: '定制业务专员、职业服方案设计师、高级定制企划人员' },
    ],
    metaEn: [
      { label: 'Issuer unit', value: 'Shanghai Garment Group · Apparel division' },
      { label: 'Track as filed by the issuer', value: 'AI + consumer (IP-driven emotional consumption · new retail)' },
      { label: 'Business users', value: 'Custom tailoring specialists, uniform solution designers, haute couture planners' },
    ],
    sections: [
      {
        heading: '痛点场景',
        headingEn: 'Pain points',
        items: [
          { desc: '感性、碎片化需求难以转化为面料、领型、廓形、工艺等专业参数，沟通链路长且依赖资深经验。', descEn: 'Intuitive, fragmented requirements are hard to convert into fabric, collar, silhouette and craft parameters; the communication chain is long and depends on senior experience.' },
          { desc: '海派版型、特色面料、经典工艺与历史案例未数字化结构化，难以快速检索匹配。', descEn: 'Shanghai-style patterns, signature fabrics, classic techniques and past cases are neither digitised nor structured, so matching them quickly is impossible.' },
          { desc: '缺少即时可视化效果参考，客户意向确认慢、签单周期长、试错成本高。', descEn: 'Without instant visual references, clients confirm intent slowly, the sales cycle drags and trial-and-error is expensive.' },
          { desc: '方案输出缺少统一标准，新人上手慢，难以沉淀海派定制风格体系。', descEn: 'Proposals follow no shared standard, new staff ramp up slowly, and a Shanghai-style tailoring house style never accumulates.' },
          { desc: '洽谈、方案与资源匹配依赖手工台账，业务复盘与案例复用困难。', descEn: 'Negotiations, proposals and resource matching rely on manual ledgers, making review and case reuse difficult.' },
        ],
      },
      {
        heading: 'Agent 能力与输出物',
        headingEn: 'Agent capabilities and outputs',
        items: [
          { title: '结构化定制资产知识库', titleEn: 'Structured tailoring asset library', desc: '归集海派经典版型、特色面料、非遗或经典工艺、高端定制与职业服历史案例，完成标签化、风格化、场景化分类，明确资源适配场景与使用规范。', descEn: 'Consolidate classic Shanghai patterns, signature fabrics, intangible-heritage and classic techniques, and past haute couture and uniform cases; tag them by style and scenario and state where each asset fits and how it should be used.', output: '可检索定制资产知识库、定制资源分类清单', outputEn: 'A searchable tailoring asset library and a classified resource list' },
          { title: '自然语言需求解构', titleEn: 'Natural-language requirement deconstruction', desc: '将感性审美、穿搭场景、情绪偏好与使用人群需求拆解为风格调性、廓形要求、面料质感、工艺细节、色彩体系、场景适配度六大维度。', descEn: 'Break intuitive aesthetics, wearing occasions, emotional preferences and target wearer needs into six dimensions: style tone, silhouette, fabric hand-feel, craft detail, colour system and occasion fit.', output: '定制需求结构化参数清单、客户情绪审美标签报告', outputEn: 'A structured parameter list of the requirement and a report on the client’s emotional and aesthetic tags' },
          { title: '资源匹配与方案初稿', titleEn: 'Resource matching and draft proposal', desc: '匹配集团现有版型、面料、工艺，输出含风格定位、面料推荐、版型选择、工艺组合、适配场景与设计亮点的参考初稿；最终定稿、报价、商务洽谈及合同签订由业务人员完成。', descEn: 'Match existing patterns, fabrics and techniques and output a reference draft covering style positioning, fabric recommendations, pattern choice, craft combination, suitable occasions and design highlights. Final approval, pricing, negotiation and contracting stay with the business team.', output: '海派定制整体方案初稿、资源匹配适配说明、方案可行性提示', outputEn: 'A draft end-to-end proposal, a resource-matching rationale and a feasibility note' },
          { title: '可视化 AI 绘图提示词', titleEn: 'Visual AI drawing prompts', desc: '根据方案风格和参数生成适配主流 AI 设计工具的可复用提示词，支撑成衣、细节工艺与上身穿搭氛围图输出。', descEn: 'Turn the proposal’s style and parameters into reusable prompts for mainstream AI design tools, covering the finished garment, craft details and on-body styling mood images.', output: '成套标准化 AI 视觉提示词、定制视觉效果需求包', outputEn: 'A standardised prompt set and a visual-effect requirement pack' },
          { title: '全流程业务台账', titleEn: 'End-to-end business ledger', desc: '记录需求解构、资源匹配、方案生成与视觉辅助动作，归集项目信息、客户需求、方案成果与资源使用情况，支持导出归档。', descEn: 'Record requirement deconstruction, resource matching, proposal generation and visual assistance, gathering project information, client requirements, proposal outputs and resource usage, with export for archiving.', output: '可编辑、可上报的定制业务专题台账', outputEn: 'An editable, reportable project ledger for the tailoring business' },
        ],
      },
      {
        heading: '核心功能与业务边界',
        headingEn: 'Core functions and business boundaries',
        items: [
          { desc: '实现四大资产知识库标签化检索与场景化匹配、自然语言需求解构、自有资源组合匹配、方案初稿生成、AI 视觉提示词生成及全流程留痕与台账导出。', descEn: 'Deliver tagged search and scenario matching across four asset libraries, natural-language requirement deconstruction, matching of in-house resource combinations, draft proposal generation, AI visual prompt generation, and end-to-end traceability with ledger export.' },
          { desc: '所有输出均为需求拆解、参考方案、视觉辅助和台账草稿。定制终审、商务决策、版型定稿、生产下单全部由业务人员完成；Agent 不执行最终业务决策与对外商业动作。', descEn: 'All outputs are requirement breakdowns, reference proposals, visual aids and ledger drafts. Final tailoring approval, commercial decisions, pattern sign-off and production orders remain with the business team; the agent takes no final business decisions and performs no external commercial actions.' },
          { desc: '原型全部使用集团存量模拟静态定制数据，不对接生产系统或定制业务真实 API。', descEn: 'The prototype uses only existing, static, simulated tailoring data from the group, with no connection to production systems or the real tailoring business APIs.' },
        ],
      },
    ],
    deliverables: [
      '可演示 Agent 原型，全部使用集团存量模拟静态定制数据，不对接生产系统或真实业务 API',
      '1–2 套完整模拟业务案例，覆盖高端海派私定或团体职业服场景，演示「需求录入 → 智能解构 → 资源匹配 → 方案生成 → AI 视觉提示词输出 → 台账归档」',
      '完整方案文档：架构设计、业务流程、落地路径、风险合规说明，含独立章节《Agent 能力边界清单》',
    ],
    deliverablesEn: [
      'A demonstrable agent prototype using only existing static simulated tailoring data, with no connection to production systems or real business APIs',
      'One or two complete simulated cases covering haute couture or corporate uniforms, walking through requirement capture → intelligent deconstruction → resource matching → proposal generation → AI visual prompts → ledger archiving',
      'Full documentation: architecture, business flow, rollout path and risk-compliance notes, including a dedicated section listing the agent’s capability boundaries',
    ],
    criteria: [{ name: '评审标准', weight: '待公布', desc: '命题文件未提供具体评审维度与权重，待命题方公布' }],
    criteriaEn: [{ name: 'Judging criteria', weight: 'TBA', desc: 'The brief does not specify dimensions or weights; these are to be announced by the issuer' }],
    resources: ['配套资源待命题方公布'],
    resourcesEn: ['Supporting resources to be announced by the brief issuer'],
  },
  {
    id: 'b-cre-open',
    code: 'CRE-OPEN-01',
    track: 'creator',
    title: '自由创意赛道 · 开放命题',
    titleEn: 'Free Creation · open brief',
    sponsor: '不设命题方（开放申报）',
    sponsorEn: 'No brief issuer (open entry)',
    status: 'open',
    publishDate: '2026-09-28',
    deadline: '2026-11-25',
    summary: '不设命题方，下设 AI Infra、AI 应用、AI 智能硬件三条赛道，独立评审、独立评奖；鼓励从真实需求出发，用现有 AI 能力做出可体验、可落地的产品与服务。',
    summaryEn: 'No brief issuer. AI Infra, AI Applications and AI Smart Hardware are judged and awarded independently. Start with real needs and use existing AI capabilities to build usable, practical products and services.',
    background: creatorIntroduction,
    backgroundEn: creatorIntroductionEn,
    sections: [{
      heading: '三大方向',
      headingEn: 'Three directions',
      items: creatorDirections.map(direction => ({
        title: `${direction.title}：${direction.tagline}。`,
        titleEn: `${direction.titleEn}: ${direction.taglineEn}.`,
        desc: direction.desc,
        descEn: direction.descEn,
      })),
    }],
    deliverables: ['可运行 Demo 或线上访问地址', '3 分钟 Demo 视频（公开直链）', '项目说明文档（含架构与数据来源）'],
    deliverablesEn: ['A working demo or a publicly reachable URL', 'A 3-minute demo video (public direct link)', 'Project documentation covering architecture and data sources'],
    criteria: creatorCriteria,
    criteriaEn: creatorCriteriaEn,
    resources: ['德必大虹桥园区落地权益 · 算力与工具支持（以组委会公布为准）'],
    resourcesEn: ['Landing incentives at Dobe Greater Hongqiao Park · compute and tooling support (as announced by the organising committee)'],
  },
];

/** 赛制规则——每条都可展开查看细则。 */
export interface ContestRule {
  id: string;
  title: string;
  summary: string;
  items: { q: string; a: string }[];
}

export const contestRules: ContestRule[] = [
  {
    id: 'r-eligibility',
    title: '参赛资格',
    summary: '谁能报名，以及需要准备什么。',
    items: [
      { q: '个人可以报名吗？', a: '可以。自由创意赛道支持个人或团队报名；FDE 赛道建议以团队形式承接企业命题。' },
      { q: '团队人数有限制吗？', a: '建议 2—5 人，评审会关注分工清晰度，人数本身不设硬性上限。' },
      { q: '有地区或国籍限制吗？', a: '无。面向全球开发者、创业者、企业、大学生与公众征集。' },
      { q: '往届获奖项目可以再报吗？', a: '项目须为原创且未在其他同级赛事获奖，往届获奖项目需有明确迭代。' },
    ],
  },
  {
    id: 'r-submit',
    title: '作品提交要求',
    summary: '提交什么、怎么提交、什么时候截止。',
    items: [
      { q: '提交窗口是什么时候？', a: '报名通过后至赛前公布截止时间，逾期不予受理，以官网公告为准。' },
      { q: 'Demo 视频有什么要求？', a: '需为公开可访问的直链（支持 Bilibili、腾讯视频、YouTube），私有密码链接无法通过校验。' },
      { q: '需要提交哪些材料？', a: '项目说明文档、Demo 视频、团队信息与赛道选择；命题类赛题另需提交命题对应方案。' },
      { q: '可以修改已提交的版本吗？', a: '截止时间前可覆盖提交一次，以最后一次提交为准。' },
    ],
  },
  {
    id: 'r-review',
    title: '评审机制',
    summary: '谁评、怎么评、评什么。',
    items: [
      { q: '评审阵容怎么构成？', a: '投资机构与评委 12—20 家，涵盖投资机构、产业企业、技术专家（含海外）与主办方代表。' },
      { q: '评审维度是什么？', a: '自由创意三条赛道统一采用 100 分制：技术创新 20%、商业价值 25%、创新想法 20%、完成度 25%、长期发展 10%；不以自研模型或技术复杂度作为主要标准。FDE 赛道按各企业命题的评审标准执行。' },
      { q: '海外专家如何参与？', a: '经德必大虹桥园区线上评审室远程接入，路演现场同步连线。' },
      { q: '结果什么时候公布？', a: '赛前公布 20—30 个入围路演项目（80—100 队），以官网公告为准。' },
    ],
  },
  {
    id: 'r-roadshow',
    title: '决赛路演规则',
    summary: '线下决赛怎么比。',
    items: [
      { q: '路演赛制是什么？', a: '每个团队 8 分钟路演 + 5 分钟答辩，全程直播。' },
      { q: '在哪里路演？', a: '乐动虹桥 · 路演主会场（剧场级），12/6 全天进行。' },
      { q: '入围多少个团队？', a: '20—30 个项目（80—100 队，五大赛道合计）。' },
      { q: '现场需要准备什么？', a: '可运行的 Demo 演示环境、8 分钟讲解稿，以及产品文档与团队介绍材料。' },
    ],
  },
  {
    id: 'r-rights',
    title: '知识产权与诚信',
    summary: '作品归属、保密义务与违规处理。',
    items: [
      { q: '作品知识产权归谁？', a: '归参赛团队所有。组委会仅在大会宣传范围内使用作品信息与 Demo 片段。' },
      { q: '查重是怎么做的？', a: '提交后进行机审查重，与已提交项目重复度过高的申请可能被取消资格。' },
      { q: '会收费吗？', a: '全程免费。任何声称可代办入围或收取辅导费用的行为均为诈骗。' },
      { q: '奖金怎么发？', a: '税前金额，组委会依法代扣代缴个人所得税，赛后 30 个工作日内拨付。' },
    ],
  },
];

/* ------------------------------------------------------------ 活动动态 */

export interface NewsItem {
  id: string;
  date: string;
  category: '赛事' | '大会' | '分会场' | '合作' | '公告';
  categoryEn: string;
  title: string;
  titleEn: string;
  summary: string;
  summaryEn: string;
  body: string[];
  bodyEn: string[];
  pinned?: boolean;
}

// 待发布正式公告后填入，不展示示例新闻。
export const news: NewsItem[] = [];

export const newsCategories = ['全部', '赛事', '大会', '分会场', '合作', '公告'] as const;

/** 分类英文名，供英文模式下渲染分类 chip 与筛选按钮。 */
export const newsCategoryEn: Record<(typeof newsCategories)[number], string> = {
  全部: 'All',
  赛事: 'Contest',
  大会: 'Conference',
  分会场: 'Sub-forum',
  合作: 'Partnership',
  公告: 'Announcement',
};
