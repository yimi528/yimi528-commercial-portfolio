/** 自由创意赛道统一口径，供赛道介绍、开放命题和评审说明复用。 */
export const creatorIntroduction = '自由创意赛道分为三大方向，鼓励参赛者从真实需求出发，用现有 AI 能力做出可体验、可落地的产品与服务：';
export const creatorIntroductionEn = 'Free Creation has three directions. Start with real needs and use existing AI capabilities to build products and services that people can try and put to use:';

export const creatorDirections = [
  {
    title: 'AI Infra 赛道',
    titleEn: 'AI Infra',
    tagline: '让 AI 更好用',
    taglineEn: 'Make AI easier to use',
    desc: '聚焦 AI 使用过程中的实际问题，降低使用门槛、提高效率（如知识库搭建、工作流编排、插件与工具开发、多模型接入管理、AI 使用成本优化）。',
    descEn: 'Solve practical problems in using AI, lower barriers and improve efficiency: knowledge bases, workflow orchestration, plugins and tools, multi-model access management and AI cost optimisation.',
  },
  {
    title: 'AI 应用赛道',
    titleEn: 'AI Applications',
    tagline: '用 AI 探索新消费与出海机会',
    taglineEn: 'Explore new consumer experiences and global opportunities with AI',
    desc: '重点推荐 AI＋新消费、AI＋出海 两大方向（如个性化定制、兴趣与情绪消费、消费体验创新、跨境电商提效、海外内容创作与营销、面向海外用户的 AI 产品与服务）。',
    descEn: 'Recommended directions: AI + new consumer experiences and AI + global markets. Examples include personalisation, interest- and emotion-driven purchases, consumer experience innovation, cross-border e-commerce efficiency, content and marketing for overseas markets, and AI products and services for international users.',
  },
  {
    title: 'AI 智能硬件赛道',
    titleEn: 'AI Smart Hardware',
    tagline: '让身边的设备更智能',
    taglineEn: 'Make everyday devices smarter',
    desc: '鼓励基于现有硬件、开源模块或成熟设备，做出实用的智能产品（如 AI 语音交互小装置、陪伴与学习设备、门店智能设备、家居设备智能改造、软硬件结合的创意产品）。',
    descEn: 'Build practical smart products with existing hardware, open-source modules or established devices: small AI voice gadgets, companion and learning devices, smart devices for shops, home device upgrades and creative products combining software and hardware.',
  },
] as const;

export const creatorScoringIntroduction = '采用 100 分制，兼顾创意、落地与商业潜力，适用于自由创意三条赛道。';
export const creatorScoringIntroductionEn = 'All three Free Creation tracks use a 100-point system balancing creativity, practical delivery and commercial potential.';

export const creatorCriteria = [
  { name: '技术创新', weight: '20%', desc: '是否合理运用 AI 技术，在能力组合、交互体验、效率或成本方面形成改进。不以自研模型或技术复杂度作为主要标准。' },
  { name: '商业价值', weight: '25%', desc: '是否解决真实需求，目标用户是否清晰，是否具备付费意愿与可行的盈利方式。' },
  { name: '创新想法', weight: '20%', desc: '是否发现新需求、新场景或新切入点，与现有方案相比是否具有差异化和吸引力。' },
  { name: '完成度', weight: '25%', desc: '是否形成可演示、可体验的产品或服务原型，核心流程是否完整，是否有用户测试或实际验证。' },
  { name: '长期发展', weight: '10%', desc: '是否具备持续迭代、用户积累和业务拓展的空间，团队是否有清晰、可执行的后续计划。' },
];

export const creatorCriteriaEn = [
  { name: 'Technical innovation', weight: '20%', desc: 'Does the project use AI effectively to improve capability combinations, interaction, efficiency or cost? Proprietary models and technical complexity are not the primary criteria.' },
  { name: 'Commercial value', weight: '25%', desc: 'Does it address a real need with clear target users, willingness to pay and a viable revenue model?' },
  { name: 'Original ideas', weight: '20%', desc: 'Does it identify new needs, scenarios or approaches, with differentiation and appeal compared with existing solutions?' },
  { name: 'Completeness', weight: '25%', desc: 'Is there a demonstrable, usable product or service prototype with complete core workflows and user testing or real-world validation?' },
  { name: 'Long-term development', weight: '10%', desc: 'Is there room for continued iteration, user growth and business expansion, with a clear, actionable follow-up plan?' },
];
