# DOAI · Dobe AI 全球创客大会 · 官方网站

> **DOAI · Dobe AI 全球创客大会（DOBE AI MAKERS CONFERENCE）**
> 2026.12.5 — 12.6（周六—周日，共 2 天）· 上海 · 长宁 · 双会场（德必大虹桥园区 × 乐动虹桥）
>
> - 线上地址：<https://doai-website-three.vercel.app>
> - 代码仓库：<https://github.com/atomesh-network/atomhub-web/tree/main/doai>
> - 内容口径：以《DOAI 大会介绍》PPT（2026.11 版，43 页）为最新权威基准，《对外招商方案》为补充；所有名称、名单、日程、数字以该文档为准，全站为「长宁 / 12.5—12.6 / 双会场」口径。

---

## 目录

- [项目简介](#项目简介)
- [技术栈](#技术栈)
- [功能总览](#功能总览)
- [快速开始](#快速开始)
- [账号与业务数据](#账号与业务数据)
- [架构说明](#架构说明)
- [后端 API 一览](#后端-api-一览)
- [⚠️ Vercel 部署的两条铁律](#️-vercel-部署的两条铁律)
- [目录结构](#目录结构)
- [验收与自检](#验收与自检)
- [已知边界与后续计划](#已知边界与后续计划)
- [更新日志（近期）](#更新日志近期)

---

## 项目简介

DOAI 官网是大会的**线上入口与数字基础设施**：一端连接全球开发者与创客（赛事报名、组队、论坛预约、项目展示），一端连接公众与消费者（游园会、市集、AI 互动体验）。线上完成「报名 → 组队 → 提交 → 评审 → 线下路演」全链路，线下双会场落地。

- **指导单位**：长宁区人民政府
- **主办单位**：德必集团、原子公社 AtomHub
- **联合主办单位**：上海市时代青年科创发展中心
- **双会场**：德必大虹桥园区（12/5 下午—晚间：开幕主论坛、签约、社交与 After Party）× 乐动虹桥（12/6 全天：决赛路演、游园、市集、分论坛与展商），相距约 500 米，步行 8—10 分钟，短驳车循环接驳

## 技术栈

| 层 | 技术 |
|---|---|
| 构建 | Vite 8 + TypeScript |
| 前端 | React 19 + Tailwind CSS + lucide-react + qrcode.react + jsqr（摄像头扫码） |
| 后端 | 主站 NestJS DoaiModule + Prisma/MySQL；本站 Express 仅做同源代理 |
| 部署 | Vercel —— 静态 `dist/` + `api/[...path].js`（Express 全量托管为 Serverless） |
| 测试 | Puppeteer（端到端内容验收 / 功能验证脚本，见 `scripts/`） |

## 功能总览

### 前台

- **首页**：官方 Logo 组合标、口号位（政府支持 × 全球链接 × 产业落地 × 全民参与）、两日日期与双会场、亮点卡片、合作方名片墙（指导 2 + 主办 2 + 联合主办 1 + 战略合作 4）、拟邀顾问与嘉宾（国内 11 + 国际 5，带「拟邀」标识）、组织架构与执行架构
- **大会介绍**：愿景使命、六大亮点（可赛 / 可逛 / 可玩 / 可学 / 可合作 / 全球化）、双会场逐层空间导览（乐动虹桥 1F 七点位 / 4F—5F 七点位 / 德必园区，配示意图与「图片为示意图」免责说明）、海外分会场（香港 / 佛罗伦萨 / 硅谷 线上联动）、AI×万物 8 大话题、两日日程总览、四层合作体系与招商对接、活动动态
- **赛事中心**：六大赛道总览（FDE 赛道三条真实企业命题 + 自由创意赛道三条技术方向）、赛事流程、评审维度与完整奖项体系（总池 20 万 / 奖金 12 万按六赛道分布）；**赛题与赛制直接展开在「FDE 赛道」「自由创意赛道」两个方框内部**（题面 / 赛题全文 / 赛制条款 / 评审与提交 / 本赛道奖项 / 报名入口），赛事中心保持单页、不设子 tab，旧 `/rules` 入口自动回到赛事中心
- **大会报名**：全程免费，四类票种 + 场次选座，电子凭证自动入 Passport
- **创客社区**：项目招募墙（筛选 / 点赞 / 申请加入）+ **创客名片墙**（关注 / 互关 / **双向名片交换**）
- **直播中心**：入口暂隐藏，等待正式直播安排；组件显示未开播状态
- **我的 DOAI**：
  - 数字身份卡（Passport）：入场二维码、电子凭证、现场核销
  - 我的报名：状态流转 + 提交作品
  - **消息中心**：站内通知统一收件箱（赛事审核 / 组队动态 / 论坛票务核销 / 名片与关注 / 官方公告），组队申请**可在消息内直接确认或拒绝**
  - 我的战队：建队 / 编辑 / 移除成员 / 退出解散，组队申请（需互相关注）
  - 资料与隐私：昵称修改、**头像拖拽 / 点击上传**（自动居中裁剪压缩 256×256）、AtomClub 头像一键同步
  - **已互换的名片盒**：双向名片（「对方换给我 / 我换给对方」徽标）+ 名片墙
- **管理后台**（`/admin`）：数据大盘与漏斗、**扫码核销（摄像头实时识别 jsQR + 扫码枪 + 手动输入三通道）**、报名评审审核（结果自动发站内通知）、广场内容治理、论坛场次管理、CMS 首页配置、全员站内信推送、CSV 导出

### 后端（主站 DoaiModule）

DOAI 业务已按星火计划接入 `atomhub-api/src/modules/doai.module.ts`，复用主站 AuthGuard、账号和 Prisma/MySQL。`server.js` 仅提供同源代理，不再生成 JSON 演示数据。

## 快速开始

**环境要求**：Node.js ≥ 20（本项目在 22 下开发）。

```bash
# 1. 安装依赖（历史原因必须带 --legacy-peer-deps，vercel.json 已配置同名安装命令）
npm install --legacy-peer-deps

# 2. 配置 .env 中的 ATOMHUB_API_URL，启动同源代理（:3102）
npm run server

# 3. 启动前端（另开终端；Vite 将 /api 交给 :3102 同源代理）
npm run dev:web        # 或 npm run dev（同时拉起前后端）

# 4. 生产构建与类型检查
npm run build
npm run lint           # tsc --noEmit
npm run test:auth      # 检查同源转发、会话 Cookie 和错误处理，不发送真实短信
```

截图反馈回归：先运行 `BASE=/doai/ npm run build` 和 `node scripts/prod-server.mjs`，再运行 `node scripts/verify_feedback_flow.mjs`。脚本通过本地模拟接口检查命题报名、刷新回显、合作联系方式、项目展示、票务旧链接、中英文及手机布局，不创建线上报名。根路径预览可通过 `TEST_SITE=http://127.0.0.1:4173` 指定。

报名与作品回归：在同一个本地预览上运行 `npm run test:entries`，覆盖慢加载、加载失败重试、多条报名切换、同名账号隔离、作品链接提交与更新、防重复提交、失败后保留输入、刷新后的材料回显，以及退出换号后的旧响应隔离。全部账号与接口数据为本地模拟。

登录与预约回归：运行 `npm run test:booking`，验证短信和登录防重复请求、登录时锁定输入、旧身份查询不覆盖新登录、票据加载与重试、预约／取消共享请求状态、取消失败保留预约、换号后的预约响应隔离、多场次出票部分失败后的保留与重试、新旧票据合并，以及单条／全部已读保存失败和重试。所有短信、登录、票据和通知请求均被本地拦截，不调用真实业务写接口。

资料同步回归：运行 `npm run test:profile`，检查缺字段主站响应不写入、旧内容回执不报成功、保存后响应丢失的重试、双击锁、刷新恢复、明确清空、无头像、异常展示字段和手机布局。所有资料与身份接口在本地拦截；旧 `scripts/verify_profile.mjs` 入口也运行同一验证，不再修改演示姓名或头像。

消息已读回归：运行 `npm run test:notifications`，验证当前消息 ID 清单、重复点击、回执前新到消息、抽屉重新加载、异常回执、旧后端、刷新与重试、换号迟到响应及手机布局。所有接口在本地拦截；新接口缺失时不调用旧的无范围批量写入。

名片与组队回归：运行 `npm run test:social`，覆盖消息／名片盒／名片墙初始加载失败与重试、关注失败、名片交换失败不报成功、重复交换去重、旧列表响应合并、换号隔离，以及队长发送邀请、无战队的成员接收邀请、从通知接受后同步战队和旧申请流程。

社区回归：运行 `npm run test:community`，检查匿名心动先登录、访客草稿保留、换号后的点赞／申请隔离、详情加载失败与真实 404、称呼与技能随申请保存、旧通知链接跳转、发起人处理申请与结果回显，以及发布时的角色／技能／阶段、失败草稿、防重复提交和慢列表合并。另检查详情页滚动复位、赛事锚点再次点击、长标题手机换行与缺失／失效头像降级。

进入创客社区或打开通知时会刷新当前账号的数据；后台读取失败不会抹掉已确认发布的帖子。发布表单可以明确选择远程协作，并保存技能标签和项目阶段。默认头像按 Unicode 字符生成，emoji 昵称不会再导致登录资料转换失败；账号主接口缺少真实 ID 时也不会显示为已登录。

招募详情按 `GET /api/doai/recruitments/:id` 查询，不会因为帖子不在列表前 500 条而误报删除。发起人或管理员可查看申请并通过 `POST /api/doai/recruitment-application-action` 表达“愿意沟通／暂不合适”，结果保存并通知真实申请人；此流程不自动改变正式战队成员。新旧通知链接均可正常打开详情，招募通知有独立分类。

后台回归：运行 `npm run test:admin`，检查审核失败保留弹窗与反馈、提交中的重复操作、最新作品链接与 CSV、配置慢加载与错误重试、中英文文案、并发版本冲突后的草稿保留／显式重新读取、群发防重复，以及管理员切换与权限撤销后的缓存隔离。`npm run test:data` 验证作品字段兼容与 CSV 转义。

CMS 保存会携带读取时的 `updatedAt` 作为 `expectedUpdatedAt`；后端在同一事务中比较版本并更新，冲突返回 409。首次保存未配置的页面使用 `null`。后台读配置失败时不允许保存默认值，冲突时保留草稿，只有点击“加载服务器当前值（替换草稿）”才替换输入。前后端需配套发布。

真实数据库验证：后端先生成 Prisma Client 并构建，再运行 `DOAI_BACKEND_DIR=/path/to/atomhub-api npm run test:social:mysql`。脚本要求本地 Docker 与已缓存的 `mysql:8.0` 镜像，在独立临时容器中建立业务与账号两个隔离库，执行迁移两次、调用真实 DoaiService／两套 Prisma Client 检查持久化、并发五人上限、双向交换唯一性及解散清理；数据库地址由本容器的随机本地端口显式构造，结束即删除容器，不使用 `.env` 的生产数据库地址。

具体申报命题／技术方向会以 `【申报方向：编号 · 名称】` 首行保存到现有 `projectSummary` 字段，兼容当前主站接口；报名详情、个人中心和审核导出均可读取。旧报名缺少此信息时如实标注，不推断命题。项目展示页目前显示「入围项目待公布」，不读取或公开参赛者私有申报资料。

分享页面提供静态正文、封面及 Open Graph 信息，部署后可检查抓取结果；微信内的图文分享卡片仍需真机验收，不能仅凭这些元信息认定已生效。

> Windows 拷贝过来的 `node_modules` 不可用，务必重新安装；安装报 peer 冲突时加 `--legacy-peer-deps`。

## 账号与业务数据

- 登录使用**原子公社真实手机号与短信验证码**，由原子公社后端校验，本地与线上均不支持任意验证码登录。
- 服务端代理地址由 `.env` 的 `ATOMHUB_API_URL` 配置（默认 `https://v2.atomclub.cn`，不带 `/api`），修改后重启代理。
- 身份复用主站 `/api/auth/*` 和 `/api/user/me`；业务请求为 `/api/doai/*`，支持主站 Cookie 与 Bearer token。
- 报名、预约和消息从数据库恢复；客户端不会向空库写入演示报名或入场凭证。
- 页面不预填演示人物、队员或项目，不展示示例新闻、虚构直播人数或弹幕；后台统计直接按接口返回的报名记录计算。
- 管理员由主站后端 `DOAI_ADMIN_USER_IDS` 配置，前端不能自行授予权限。

## 架构说明

```
浏览器 ──┬── 网站静态资源（支持 /doai/ 子路径）
         └── 独立部署 /api/*，子路径部署 /doai/api/* ► 同源转发
                          ► ATOMHUB_API_URL 主站 NestJS
                          ├── /api/auth/*、/api/user/me：共享账号与登录
                          └── /api/doai/*：DoaiModule ► Prisma ► MySQL doai_ 表
```

- 主站 `DoaiModule` 是业务实现，数据存入 MySQL `doai_` 表。
- `server.js` 是本地与 Vercel 共用的代理。
- 前端调用经 `src/lib/api.ts`，统一业务命名空间和主站登录态。

## 后端 API 一览

业务统一使用 `/api/doai` 前缀，账号接口复用主站。个人接口从登录态取身份，审核及核销要求管理员。

| 端点 | 说明 |
|---|---|
| `POST /api/auth/send-code` / `POST /api/auth/login` | 复用主站验证码与登录服务 |
| `GET /api/user/me` / `POST /api/auth/logout` | 主站真实资料 / 退出共享会话 |
| `POST /api/doai/registrations` / `GET /api/doai/registrations` | 报名提交 / 列表 |
| `GET /api/doai/registration-requests/:key` | 本人报名提交回执恢复 |
| `GET /api/doai/me` | DOAI 个人配置与后端管理员权限 |
| `POST /api/doai/registration-work` | 提交作品（id 走 body） |
| `POST /api/doai/registration-status` | 审核状态变更 + 给报名者发站内通知（id 走 body） |
| `GET /api/doai/tickets` / `POST /api/doai/tickets` | 电子凭证 |
| `POST /api/doai/checkin` / `GET /api/doai/checkins` | 现场核销（去重）/ 核销记录（管理员专用） |
| `GET /api/doai/users` | 用户目录（名片墙 / 战队邀请数据源） |
| `GET/POST/DELETE /api/doai/follows` | 关注 / 取关（返回 mutual 互关状态） |
| `GET /api/doai/my-team` / `POST /api/doai/teams` | 我的战队 / 建队 |
| `POST /api/doai/team-update` `…/team-remove-member` `…/team-leave` | 战队管理（teamId 走 body） |
| `GET/POST /api/doai/team-applications` | 组队申请（互关校验；成功自动通知队长） |
| `POST /api/doai/team-application-action` | 确认 / 拒绝申请（`{id, action, byUserId}`；结果通知申请人） |
| `POST /api/doai/notifications/read-ids` | 按本人当前消息 ID 清单确认已读，返回完整保存回执 |
| `GET/POST /api/doai/notifications` | 站内通知（`to`=userId 或 `'all'`；消息中心数据源） |
| `GET/POST /api/doai/cards` | **双向名片交换**（存双方快照；交换后对方收通知） |
| `GET/POST /api/doai/profile` | 个人资料和隐私配置（头像为 http/https URL） |
| `GET /api/doai/atomclub/avatar` | 读取主站真实头像 |
| `GET /api/doai/wx-articles` | 公众号文章摘要 |

## Vercel 部署

`vercel.json` 的 SPA fallback 必须排除 `/api/*`，账号和业务请求由 `api/[...path].js` 转发给主站。Vercel 不保存业务数据，冷启动不影响主站 MySQL 中的报名和票据。发布前先完成主站 SQL 与后端部署，并配置 `ATOMHUB_API_URL`。

### 线上只支持单段 `/api` 路径（必须遵守）

实测该 Vercel 项目的 Serverless 函数**只命中单段路径**：`/api/doai` 进函数、`/api/doai/health` 直接被平台判成 `404 NOT_FOUND`（响应头 `x-vercel-error: NOT_FOUND`，不是 Express 的报错）。

因此前端 `src/lib/api.ts` 的 `flattenApiPath()` 会把第一段之后的路径压进 `__p` 查询参数：

```
/api/doai/me                      → /api/doai?__p=me
/api/doai/notifications?userId=x  → /api/doai?userId=x&__p=notifications
/api/wx/cover?u=https%3A%2F%2F…   → /api/wx?u=https%3A%2F%2F…&__p=cover
```

`server.js` 的 `restoreApiPath()` 在路由前把它们还原成真实路径，所以**代理、白名单和上游调用看到的都是标准 `/api/...`**。新增前端接口调用只要走 `apiUrl()` / `apiRequest()` 即自动兼容；直接 `fetch('/api/x/y')` 会在线上 404。

- 白名单判定使用 `new URL()` 规范化后的 `pathname`，并锁定上游 origin。`/api/doai/../admin/delete` 这类路径规范化后不在白名单，返回本地 404，不会被转发。
- `__p` 里的尾段还要过 `isSafeTail()`：含 `.` / `..` 或非常规字符就判定非法（`restoreApiPath()` 原样保留 `__p`，代理层见到 `__p` 直接 404）。否则 `/api/doai?__p=../auth/send-code` 会被 `new URL()` 规范化成 `/api/auth/send-code` 从而穿过白名单。
- `GET /api/health` 是单段探针：返回 `{ok, proxy, upstream, doai}`，其中 `doai` 为 `ok` / `unreachable` / `http_4xx`，用来判断主站 DoaiModule 是否已发布。
- 公众号同步由本站提供：`GET /api/wx/articles`（或单段别名 `/api/wx-articles`）与封面防盗链代理 `GET /api/wx/cover?u=`，封面只允许 `https` 的 `mmbiz.qpic.cn` / `mmbiz.qlogo.cn`。

## 目录结构

```
doai-2026-ai-创客大会官网/
├── api/[...path].js          # Vercel Serverless 入口（托管 server.js 的 Express app）
├── server.js                 # 主站 API 同源代理
├── index.html                # SPA 壳（title / meta 按招商方案口径）
├── vercel.json               # 构建与 rewrite（已排除 /api/）
├── vite.config.ts            # dev 代理 /api → :3102
├── scripts/                  # Puppeteer 验收脚本（verify_prod_content.mjs 等）
└── src/
    ├── main.tsx / App.tsx
    ├── types/index.ts        # 领域类型（Registration / NotificationItem / ExchangeCard…）
    ├── lib/api.ts            # apiUrl()（子路径兼容）
    ├── context/AppContext.tsx# 全局状态 + 全部业务动作（报名/组队/名片/通知…）
    ├── data/                 # 静态内容数据（conference / plan / community / showcase）
    ├── components/
    │   ├── layout/           # Navbar（官方 Logo）/ Footer（联系方式）
    │   ├── sections/         # PeopleSection（拟邀嘉宾+组织架构）/ CardWall（名片墙，社区与个人中心共用）
    │   ├── views/            # Home / Conference / Maker / Square / Forum / Live
    │   │                     # / Dashboard（Passport/报名/消息中心/战队/资料）/ Admin / Register…
    │   ├── detail/           # Attend / News / Rules / Schedule / Module 详情页
    │   ├── modals/           # Login / NotificationDrawer / Policy
    │   └── common/           # DoAiLogo 等留存组件
    └── assets/               # 官方 Logo PNG（doai-logo-official.png）/ 图片 / hero 影片
        └── images/ppt/       # 场馆示意图（15 张，压缩自大会介绍 PPT，页面需标注「图片为示意图」）
```

## 验收与自检

任何内容改动后、提测前必须跑：

```bash
# 1. 源码自检：禁用词（旧口径）0 残留 + 必备词（长宁口径）全命中
python3 官网修改自检.py .                      # 脚本在交付包内，或 ~/Desktop/DOAI/官网修改自检_修复版1019.py
python3 官网修改自检.py --url https://doai-website-three.vercel.app   # 线上复查（抓 JS 包）

# 2. 多路由内容验收（Puppeteer，首页/赛事/赛道/大会/报名/向导 6 项）
node scripts/verify_prod_content.mjs
```

- 自检脚本的**禁用词清单不能在仓库任何文本文件中原样出现**（包括注释），`scripts/verify_prod_content.mjs` 里的清单做了拆分书写，新增禁用词时请沿用该写法；
- 验收脚本里的功能测试若用到摄像头，可用 Chrome 假设备：
  `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream --use-file-for-fake-video-capture=<y4m 文件>`。

## 已知边界与后续计划

- [x] **业务数据持久化实现**：使用主站 Prisma/MySQL 的 `doai_` 表；本站仅做同源转发。发布仍需按说明执行配套 SQL 和后端部署，代码上传不会自动迁移生产库。
- [x] **招募帖 / 达人名片 / 首页配置已接后端**：主站 `atomhub-api` 的 `DoaiModule` 已补出 `doai_recruitments` / `doai_recruitment_likes` / `doai_recruitment_applications` / `doai_profile_likes` / `doai_site_configs` 五张表与对应接口（`GET/POST /api/doai/recruitments`、`DELETE /api/doai/recruitments/:id`、`POST /api/doai/recruitments/:id/like`、`POST /api/doai/recruitments/:id/apply`、`GET /api/doai/recruitments/:id/applications`、`GET /api/doai/talents`、`POST /api/doai/talents/:id/like`、`GET/POST /api/doai/site-config`）。前端已全部改为接口调用，`src/lib/localStore.ts` 已删除，界面上「仅本机保存」的提示与假成功文案一并撤掉。写操作的身份（发起人 / 申请人 / 点赞人）一律由服务端会话推导，`likes` 与 `applicationsCount` 由明细表真实条数回写。
- [x] **登录与名片身份**：手机号验证码由原子公社校验；DOAI 服务端桥接 HttpOnly 会话，从原子公社读取姓名、头像、城市、简介和技能。通过同源代理兼容 Vercel 域名，主站负责会话校验。
- [x] **DOAI 业务接口鉴权**：`DoaiService.uid(user)` 只从会话取用户，前端已不再传 `userId` / `fromUserId` / `byUserId` / `leaderId` 这类可伪造的身份字段（2026-11 清理）。
- [x] **管理后台访问鉴权**：前端根据后端返回的管理员权限显示入口，敏感接口由服务端初始名单 `DOAI_ADMIN_USER_IDS` 与数据库启用名单共同复核，不能靠显示名或本地状态授权。
- [ ] 拟邀嘉宾头像、分会场承办方名单等待官宣后填充
- [ ] 直播开播提醒类通知暂未纳入消息中心（2026-10-19 口径确认）

## 更新日志（近期）

- **2026-11（本轮加固）** 代理层与前端健壮性收口：
  1. `server.js` 新增 `restoreApiPath()` + `__p` 单段压缩，绕开 Vercel catch-all 只命中单段路径的限制；
  2. 堵住 `__p` 跨命名空间逃逸（`__p=../auth/send-code` 曾可穿过白名单），`isSafeTail()` 逐段校验 + 还原失败强制 404；
  3. 修掉首页/广场 `TypeError: reading 'some'`（上游返回 200 但缺数组字段），CardWall / TeamPanel / AdminView / MessageCenter / NewsView 同类解构一并加 `Array.isArray` 兜底；
  4. 招募帖、达人名片、首页 CMS 配置统一走主站 `DoaiModule` 落库（增量迁移 `20261026_add_doai_community_cms.sql`），招募帖点赞 / 申请 / 下架与首页配置写接口的身份（发起人、申请人、点赞人、管理员）全部由服务端会话推导，`likes` / `applicationsCount` 由明细表真实条数回写，界面不再出现「仅本机保存」与假成功提示；
  5. 前端不再传 `userId` / `fromUserId` / `byUserId` / `leaderId` 等废弃身份字段，身份一律由会话推导；
  6. 新增页面级 `ErrorBoundary`（`src/components/common/ErrorBoundary.tsx`），任一视图渲染抛错只降级该区域，导航与页脚仍可用，用户看到的是可读提示 + 重试按钮而不是整站白屏；
  7. 面向用户的文案去掉开发者术语：三处「后端服务不可用，请确认 server.js 已启动（npm run server）」改为「服务暂时不可用，请稍后重试」。
- **2026-11** 按《DOAI 大会介绍》PPT（43 页）重做内容口径：会期改为 12.5—12.6；主办调整（德必集团 × 原子公社 AtomHub）、联合主办为上海市时代青年科创发展中心；规模升级为 100+ 展位（60+ 企业 + 40+ 选手作品）；拟邀国内嘉宾调整为 11 位。新增 `src/data/showcase.ts` 与大会介绍页三大板块（六大亮点、逐层场馆导览、四层合作体系），全站改用六大赛道表述（FDE 3 条真实命题 + 自由创意 3 条技术方向），奖项按六赛道均分重排、总额 12 万不变。
- **2026-10-19** 全站内容改版为「长宁 / 11.28—29 / 双会场」招商方案口径；官方组合标 Logo 上线（导航栏 + Hero）；修复生产 `/api` 全挂（rewrite 排除 + 单段别名）；后台摄像头扫码核销；个人中心名片墙 + 双向名片交换；消息中心（四类通知同步 + 组队申请消息内确认/拒绝）；头像拖拽上传；修复组队「接受申请加错成员」与 TeamPanel 5 个多段接口线上 404。
- **2026-10-18** Hero LOGO 重绘、名片墙「交换名片」功能、页脚清理。
- **2026-10-13** 会议结论改造：报名漏斗统一双赛道、战队编辑、导航头像入口等（commit `1533873`）。

---

联系组委会：**jocelyn@atomesh.cn**
DOAI · Dobe AI 创客大会 | 2026 年 12 月 | 上海 · 长宁 · 德必大虹桥园区 × 乐动虹桥

## 后端模块与 SQL

- [后端开发分支 dev-20261023-doai-module](https://github.com/atomesh-network/atomhub-api/tree/dev-20261023-doai-module)
- [建表 SQL](https://github.com/atomesh-network/atomhub-api/blob/dev-20261023-doai-module/prisma/migrations/sql/20261023_add_doai.sql)
- [发布步骤与接口说明](https://github.com/atomesh-network/atomhub-api/blob/dev-20261023-doai-module/docs/doai-release.md)

发布顺序：先在主站业务库应用 SQL、生成 Prisma Client 并发布主站后端，再发布本站前端。上传开发分支不会自动执行 SQL 或切换生产流量。

上一轮的 [邀请补丁快照](backend/doai-social-invitations.patch) 保留供比对，当前发布使用下一段的累计包。新增 [邀请 SQL](backend/20261026_add_doai_team_invitations.sql) 只创建 `doai_team_invitations` 表，需先在业务库执行，再生成 Prisma Client、部署后端，最后部署前端。旧的成员申请接口保留，新的队长邀请使用 `POST /api/doai/team-invitations` 和 `POST /api/doai/team-invitation-action`。通知和组队收件箱会读取新表，不能跳过这次迁移。

当前累计修复使用 [完整后端补丁](backend/doai-backend-fixes.patch)，包含邀请／名片、审核与 CMS、招募详情、申请处理、幂等点赞／申请，以及管理员管理、资料同步、现场核销、分论坛统计与收藏、会话一致性及报名重试去重。干净后端仅应用这个累计包，不要再叠加上一轮的邀请补丁；相邻工作区已包含全部改动。累计包需执行邀请 SQL、[管理员 SQL](backend/20261027_add_doai_admin_accounts.sql)、[收藏 SQL](backend/20261027_add_doai_forum_bookmarks.sql) 和 [报名回执 SQL](backend/20261027_add_doai_registration_requests.sql)，再生成 Prisma Client 并配套发布前后端。管理员 SQL 只创建空表，不自动授权；不要在账号权威库执行。累计包经过 `git apply --check` 检查，能用于后端原始版本。

新增 SQL 已在独立临时 MySQL 8.0 容器中执行两次；真实 Prisma／DoaiService 邀请持久化、并发五人上限、双向名片唯一性及解散清理检查通过。没有执行生产数据库迁移，也没有部署线上服务。


2026-10-27：补齐管理员名单读取、授权与停用接口，生产授权使用当前权威账号映射；初始管理员和本人不能从页面停用。个人中心“同步资料”现在保存最新主站展示字段并保留隐私设置，另有只读的“重新读取账号”。后端全量 207 项测试、前端身份与数据 32 项测试、隔离 MySQL 角色与同步验证通过；未部署生产。浏览器专项验证运行 `npm run test:accounts`。

现场核销补充修复：手动／摄像头共用提交锁，只有匹配的有效审计记录才显示成功；失败保留输入并提供扫码重试，核销记录加载失败有明确提示。核销与持票人通知在后端同一事务保存；跨大会票据不可被取消或混入核销记录。后端全量 210 项测试与临时 MySQL 并发验证通过，浏览器二维码视频流专项运行 `npm run test:checkin`。本节不增加 SQL，仍需配套发布累计包；未上线。

隐私设置补充修复：公开名片／允许交换仅在返回本人已保存的严格布尔值后更新；未确认或失败响应保留原状态。隐私保存、主站资料同步与重新读取共用按账号隔离的请求锁，切换页面不绕过，旧账号回包不影响新账号。DOAI 隐私资料未读取成功时显示重试提示，不将默认开关当作已保存状态。浏览器专项运行 `npm run test:privacy`；测试使用拦截 API，另在临时 MySQL 验证隐藏名片从目录移除、交换关闭及独立隐私字段的并发保存。此项不增加后端接口或 SQL，依赖前述配套后端；未部署生产。

参会报名补充修复：切换票种清空隐藏选座，公众开放日不再误报主会场，分论坛选座进入真实论坛预约；机构信息随票据保存。媒体／行业申请使用独立预约键，先待审核，通过前无可用二维码；后台新增参会申请审核及持久化结果通知。我的凭证展示申请状态、机构和拒绝原因。配套后端新增 `GET attendance-applications`、`POST attendance-review`，旧前端须更新以传入匹配的 `passType`；复用现有状态字符串和 JSON，不新增 SQL，也不自动改判无法识别来源的历史普通票。后端 215 项测试和隔离 MySQL 并发验证通过，浏览器专项运行 `npm run test:attendance`。累计后端补丁需重新应用到干净原版本，不能叠加旧补丁；未上线。

分论坛规则补充修复：统一开场前 48 小时的取消截止，截止瞬间起停止自助取消；已核销不可取消，已结束不能新预约。服务端按当前公布排期计算上海时间，不信任客户端日期；列表与详情同步状态并显示截止时间。取消与核销在事务中互斥，已保存的取消可安全重试。新增前后端一致的时刻表文件已纳入累计补丁，无新增 SQL；变更排期须同步两份文件。后端 221 项测试、前端规则及隔离 MySQL 并发验证通过，浏览器专项运行 `npm run test:forum-rules`。仍需配套发布，尚未上线。

分论坛统计补充修复：`GET forum-stats` 从当前大会真实论坛票聚合预约／核销人数，取消票、媒体 guest 票、其他大会与未知场次不计入；不返回个人信息，也不受个人列表 500 条限制。列表、详情、后台改用真实统计并区分加载、失败和零；预约／取消／核销后刷新，旧回包不会覆盖新结果。统计失败不阻断预约，后台也按排期显示已结束状态。后端 223 项测试与 600 张临时 MySQL 票据验证通过，浏览器专项运行 `npm run test:forum-stats`。累计补丁已包含新接口，无新增 SQL，未部署生产。

分论坛收藏与分享补充修复：收藏改为服务端按大会与账号保存，增加「我的 DOAI · 收藏的论坛」和 `dashboard/bookmarks` 深链，支持刷新、移除和失败重试。旧账号或旧读取不会覆盖新状态，分享会复制可打开的网址，剪贴板失败时给出可选中的链接。新增 [收藏 SQL](backend/20261027_add_doai_forum_bookmarks.sql) 必须先在业务库执行，再生成 Prisma Client、配套发布前后端；它只创建收藏表，不恢复过去的页面临时状态。后端 227 项测试、临时 MySQL 持久化／隔离验证通过，浏览器专项运行 `npm run test:bookmarks`。未执行生产迁移或部署。

存储与公告发布补充修复：浏览器存储受限不再导致白屏，当前文档内保留必要的语言／认证回退；无效语言缓存回退中文，并同步页面语言。后台确认保存的公告和公示指标已接入首页，中英文缺失时使用同一来源内容；不再把空配置或错误读取当作已发布默认值。异常数据、未递增版本和晚到保存均不能覆盖有效公告。人数只接受范围内整数，内部链接拒绝反斜线和编码分隔符。后端 228 项测试和隔离 MySQL 验证通过，浏览器专项运行 `npm run test:storage`、`npm run test:cms-publication`。本节无新增 SQL，未上线。

会话切换补充修复：新前端通过 `X-DOAI-Actor` 核对页面账号与实际会话，后台在处理器前拒绝错账号请求；它不替代 Bearer／Cookie 鉴权。代理已透传，nginx 也须保留该头。多标签页共享凭据变化会清理旧私有状态并重新确认身份，不自动重提旧操作；迟到登录、退出和 401 不影响新账号。退出失败会提示远端会话未确认。后端 234 项测试及双标签页验证通过，专项运行 `npm run test:session-switch`。累计包已包含共享 AuthGuard 改动与新辅助文件，无新增 SQL；需前后端配套发布并刷新旧页面，未上线。


报名重试补充修复：每次逻辑提交使用稳定请求标识，提交前查询本人回执；丢失响应、重复点击、刷新或同内容新请求均复用已有报名与选手票，不重复通知。服务端在同一事务保存内容去重键及请求别名，不改写已有审核／作品／核销状态。草稿与已保存内容不一致时展示真实项目和 Maker ID，并提供「查看已有报名」或显式「另报项目（保留当前草稿）」；确认页显示实际状态。新前端遇到不支持回执的旧后端不发送 POST。新增 [报名回执 SQL](backend/20261027_add_doai_registration_requests.sql) 须先在业务库执行，再生成 Prisma Client、部署后端和前端；不会导入、合并或删除历史报名。后端 239 项测试、前端报名重试单元测试及隔离 MySQL 验证通过，浏览器专项运行 `npm run test:registration-retry`。本地修复与验证，未执行上线。


资料同步完整性补充修复：同步前确认主站字段完整，后端拒绝缺字段快照，避免读取异常时用空值覆盖已有资料；正常清空和无头像仍支持。回执逐项核对姓名、头像、城市、简介和技能，旧内容或不完整 HTTP 200 不再显示成功。异常展示字段安全降级，不再把对象或非列表技能传入页面；隐私异常仍不可操作。技能与主站保持 50 项／每项 100 字符的限制，空白标签会移除。后端 241 项、前端 69 项单元测试及构建通过，Chrome 资料／隐私／换号和隔离 MySQL 验证通过，专项运行 `npm run test:profile`。本节无新增 SQL，累计后端补丁已更新；本地修复与验证，未执行上线。


报名账号联系方式补充修复：兼容主站只返回 `maskedPhone` 的账号资料，报名页和队长摘要显示脱敏号码，提交时不把它当作真实联系号码。新报名独立保存从当前账号读取的联系方式，并使用同一号码签发选手票；正常主站部署通过 userIdUuid 查账号权威库，不信任客户端注入或旧号码镜像。确认页、私人详情、后台审核和 CSV 正确展示对应联系方式及来源，按真正的队长标记取人。旧记录不回填，缺少号码如实显示。新前端提交前确认后端的账号联系能力；历史报名仍可恢复。后端 243 项、前端 72 项单元测试以及 Chrome 和真实双库 MySQL 验证通过。本节无新增 SQL，累计补丁已更新；本地修复与验证，未执行上线。


消息已读补充修复：新 `POST notifications/read-ids` 按当前已加载的明确消息清单保存，前端核对本人和完整 ID 回执后才改变状态，新到消息和换号后列表不受旧回包影响。缺消息或包含他人消息时整批拒绝，广播读状态按账号隔离；旧 read-all 与列表统一查询最新 500 条，修复无排序写入任意 500 条导致刷新后重新未读的问题。按钮明确“当前消息全部已读”，不宣称清理不可见历史消息；缺少 id 的旧单条入口不再误标全体。后端 247 项测试、前端 33 项业务测试及构建通过，Chrome 专项与 600 条临时 MySQL 消息验证通过，运行 `npm run test:notifications`。本节无新增 SQL，累计后端补丁已更新；本地修复与验证，未执行上线。


报名城市与技能补充修复：第一步填写的城市和技能现在作为独立申报人快照随项目保存，确认页、私人详情、审核弹窗和 CSV 均读取已保存值；不会修改账号资料或公开名片。首次登录会保留此前已填的个人草稿，换号仍清理私人草稿。真实长度 Maker ID 在手机确认卡、已有报名提示和数字凭证中可换行，二维码保留完整位置。城市／技能纳入新请求去重和冲突检查；旧调用缺字段时保留原摘要字节，历史资料不推断或回填。新前端提交前检查 `applicantPolicy`，旧后端无法静默丢字段。后端 249 项测试、前端 36 项业务测试、Chrome 和隔离双库验证通过，报名专项仍运行 `npm run test:registration-retry`。本节无新增 SQL，累计补丁已更新；本地修复与验证，未执行上线。


发布门禁补充修复：旧 `verify_prod_content.mjs` 的旧日期／演示流程和 FAIL 仍退出 0 已移除。`npm run test:release` 使用当前 dist 与本地隔离 API 跑 22 项只读对照；`npm run audit:production` 对真实公开页面、API、分享正文／封面和入口做同一验收，阻止所有写请求，失败退出 1。两份 JSON 报告位于 `/tmp/doai-local-release-audit.json`、`/tmp/doai-production-audit.json`。`npm run package:release` 检查本地门禁版本后打包前端、累计后端补丁、6 项业务库 SQL、发布说明和差异报告，生成 manifest／SHA256 并核对归档清单，不包含环境文件与凭据。本次线上只读门禁 10 通过、12 失败，本地候选 22 项全部通过；确认线上仍有旧入口和接口，不能仅凭 health 200 认定修复已发布。未执行生产迁移或部署。


发布包还原与启动补充修复：后端实际产物为 `dist/src/main.js`，修正原 `start:prod` 指向不存在的 `dist/main`，并把 package.json 纳入累计补丁。新增 `npm run test:restore -- /absolute/path/to/candidate.tar.gz --mysql`：从包内清单对应的 Git 原始提交还原，校验 SHA256／SQL／文档，隔离生成两套 Prisma Client、测试与构建，再检查生产命令对应的入口确实存在；可选执行同一代码的临时双库验证。报告在 `/tmp/doai-release-restore-report.json`，不执行真实应用启动或生产操作。当前生产发布授权仍待确认。


名片展示补充修复（当前仅本地）：用户已选择暂不上线。交换后不再显示“交换后可见”的误导联系方式提示，展示流程不包含账号手机号，旧接口夹带的号码和历史未知字段均不进入展示。前后端共同规范化名片字段，异常技能 JSON、对象姓名和城市不再破坏名片墙／人才卡；回执核对发起人与目标 ID，非法记录显示重试。互换日期按上海日历日显示，头像失效降级，手机长姓名及空姓名反馈可用。后端 253 项、前端 41 项业务测试及构建通过，Chrome 社交／隐私／换号与临时双库验证通过，专项运行 `npm run test:cards`。业务测试通过 tsx 兼容当前无扩展名 TS 数据导入。本轮无新增 SQL，累计后端补丁已更新；此前候选包为历史快照，后续决定发布时应重新生成并验收。

报名字段与作品链接调整（当前仅本地）：申报人信息新增必填邮箱与个人简介，随报名快照保存，确认页、私人详情、审核和 CSV 可查看；新前端通过 `applicantPolicy: snapshot-v2` 确认保存能力。作品提交保留 Demo 视频必填，在线 Demo / 官网、GitHub 仓库与新增的在线项目简介文档（如飞书）为选填，填写时校验链接，并支持更新与清空。作品文档随 `submission` 保存，兼容历史文档字段。无需新增 SQL，需先发布配套后端再发布前端；累计后端补丁已同步更新，未执行上线。


### 海外专场报名

海外专场入口为 `/track/overseas`，报名入口为 `/register/overseas`，沿用现有申报人、团队、项目与作品提交流程，额外必填国家／地区和高校。当前接口的 `track` 仍使用 `creator`；海外报名标记及高校信息通过 `contestEntry.ts` 随已持久化的 `projectSummary` 保存，独立于项目正文解析。个人中心、后台统计、审核与 CSV 导出使用解析后的报名赛道，避免将海外项目计入普通自由创意报名。无需新增数据库字段；现有回执核对与重试协议同时校验这些信息。


2026-10-28 邀请码与队伍同步修复：新增 `POST /api/doai/team-join` 与战队页输入／复制邀请码入口，持有效码可直接加入，支持大小写及首尾空格粘贴。入队身份取自当前会话，事务检查本届队伍、唯一归属与五人上限；同队重试不重复入队或通知，高并发冲突有退避重试。公开队伍列表隐藏邀请码。战队页每 10 秒、切回窗口或恢复可见时读取最新队伍、邀请和申请；同步失败保留上次资料并提供手动刷新，后台更新保留未保存的编辑。新增 `npm run test:team-code`（双客户端浏览器）及 `npm run test:team-code:mysql`（独立临时 MySQL）验证。累计后端补丁已更新，并补齐原报名战队绑定辅助文件，基线为 `b327f36`；这次无新增 SQL，需要配套发布前后端。未部署线上。

2026-11-06 创客社区新增「社区战队」，读取现有 `GET /api/doai/teams` 公开列表，展示队名、赛道、简介、成员与人数，支持搜索、赛道筛选、每 10 秒同步、窗口恢复同步及手动刷新。创建、改名、成员变化和解散都会反映到社区；刷新失败保留上次成功读取的列表。邀请码和赛事报名资料不进入社区展示数据，无需新增接口或 SQL。验证：`node --import tsx --test scripts/verify_public_teams.test.mjs`、`TEST_SITE=http://127.0.0.1:3219 node scripts/verify_community_teams_flow.mjs`（隔离浏览器会话及模拟接口）。


登录恢复补充修复：验证码登录已返回凭据但账号读取失败时，保留“待确认”状态并提供“重新读取账号”，不重复提交已用验证码；刷新和其他标签页也须等待确认后再接受该登录。首次账号读取的网络／服务错误显示重试提示，正常 401 仍显示未登录。退出请求未确认时保留退出意图，刷新不自动恢复 Cookie 登录，可显式“重试退出”；服务确认退出或完成新登录后清理标记。标记依赖可用的本地存储，存储被禁止时保留当前文档回退。前端 API 请求增加 20 秒超时，包含响应体读取；超时后登录窗口恢复操作。专项运行 `npm run test:auth`、`npm run test:auth-recovery`，浏览器测试使用模拟账号、短信和 Cookie，不操作真实账号。无后端接口或 SQL 变更，未部署生产。

本轮验证：52 项认证单元测试、6 项登录恢复浏览器场景、5 种存储场景、7 项账号切换场景，以及 TypeScript 和构建通过。当前 `plan.ts` 无已发布论坛，3 项依赖论坛预约的换号场景明确跳过；重新发布论坛后自动恢复执行。换号测试同步补齐当前报名表必填输入及本人战队读取回执，继续验证私有报名草稿隔离。


### 四渠道报名与运营权限（2026-10-30，当前仅本地）

- 赛事报名和大会报名表均必填“报名渠道”：公开渠道、原子公社、德必集团、海外专场。来源与赛道、票种分开保存；独立分论坛选座沿用原预约流程。
- 总管理员在“管理员管理”中为已有账号分配“总管理员”或“渠道运营 + 负责渠道”，重新输入已有账号可调整权限。初始管理员及当前总管理员不能在此降权。
- 渠道运营可进入运营后台，仅查看、审核和导出所属渠道的赛事报名及大会报名；大盘、详情、参会人数统计与 CSV 使用相同范围。参会人数按账号去重，场次记录单独计数。总管理员可以筛选全部渠道或四个具体渠道。CMS、群发、核销和账号授权仍仅对总管理员开放。
- 后端使用当前会话及数据库权限，列表在查询时隔离，详情和两类审核校验记录渠道，审核事务内再次确认权限。改绑、停用及同账号权限变化会使前端旧列表失效。前端隐藏不是权限边界。
- 未标注或渠道无效的历史报名按要求清理；后台筛选、大盘、审核和导出仅展示四个合法渠道的报名，不提供“未标注渠道”选项。重复申报的内容比较包含渠道，已有参会场次不能通过重报覆盖原渠道。
- 清理脚本：[删除未标注渠道报名](backend/20261030_delete_unassigned_registrations.sql)。在业务库完成渠道字段迁移后单独执行，限定 `doai-2026`，事务内删除未标注渠道的赛事报名、大会参会报名及关联回执、选手票和核销记录。独立论坛票不要求渠道，予以保留。该脚本不属于自动执行的建表迁移；目前只清理本地旧 JSON 测试数据，未处理线上业务库，暂不上线。清理验证：`node scripts/verify_unassigned_cleanup.mjs`，使用自动销毁的独立 MySQL 容器，覆盖空渠道、无效渠道、关联清理、四渠道／论坛票／其他大会保留及重复执行。
- 新增 [渠道迁移 SQL](backend/20261030_add_doai_registration_channels.sql)，可重复执行。先在业务库执行迁移，再生成 Prisma Client、发布后端，最后发布前端。前端会确认渠道保存／授权能力，旧后端不会静默丢字段或把渠道运营误授权为总管理员。累计后端补丁 `backend/doai-backend-fixes.patch` 已更新并双向验证；发布打包脚本包含第七项 SQL。
- 验证入口：`npm run test:channels`、`npm run test:channels:integration`；真实 MySQL：`DOAI_BACKEND_DIR=/path/to/atomhub-api npm run test:channels:mysql`。浏览器使用本地模拟接口，MySQL 验证使用自动销毁的独立容器。未执行生产迁移或部署。


### 运营后台布局整理（2026-10-30，当前仅本地）

后台桌面端改为按“报名与现场／内容与发布／权限管理”分组的左侧导航；手机使用功能选择框。顶部以紧凑标签显示管理范围，渠道筛选及报名导出仅出现在报名相关页面。CMS 表单使用完整内容区，公示规模独立成组，中英文奖项及公告对齐并排，底部统一保存发布及状态提示。移除页面上的开发阶段标语和数据库实现说明，继续使用既有白底、深蓝文字、品牌蓝和圆角输入框。类型检查、构建、CMS 发布、后台审核及渠道权限浏览器回归已通过，桌面与手机布局已截图检查。


### 论坛场次管理（2026-10-30）

后台「论坛场次管理」支持新增、编辑议题／分类／介绍／中英文字段／嘉宾、上海时间排期、场地、人数上限（空值不限）、草稿／发布／下架和预约开放／暂停；未发布且无有效预约的草稿可删除。默认没有已确认的场次，不会自动恢复此前撤回的临时议题。

- `GET /api/doai/forums`：公开已发布场次；`GET /api/doai/admin/forums`：总管理员读取全部场次和实际预约／核销数。
- `POST /api/doai/admin/forums`：以 `{forum, expectedVersion}` 保存；`DELETE /api/doai/admin/forums/:id`：以 `{expectedVersion}` 删除草稿。版本冲突返回 409，界面保留编辑内容，显式重新加载后再保存。
- 数据复用业务库 `doai_site_configs`，独立 key 为 `doai-2026-forums-v1`，与首页配置分开。无需新增 SQL，须已执行社区／CMS 基础迁移。服务端统一校验发布、预约开关、结束时间与名额；人数上限计入已核销票，取消后释放名额，Serializable 事务避免超售。
- 已有有效预约时禁止删除或变更时间／场地，允许下架与暂停；已有电子票保留，在「我的 DOAI → 身份与凭证」仍可于开场前 48 小时之前取消。已核销票不可取消。公开统计只包含已发布场次，后台统计包含草稿。
- 配套发布后端与前端。累计补丁 `backend/doai-backend-fixes.patch` 已包含本次功能；仅在已应用此前累计修复的后端上增量更新时使用 `backend/doai-forum-management.patch`，两者不要叠加。相邻后端工作区已同步，本次未执行生产部署或生产数据写入。
- 浏览器隔离验证：`TEST_SITE=http://127.0.0.1:3218/doai npm run test:forum-management`（启动 `BASE=/doai/ npm run dev:web -- --port 3218`）。数据库验证：构建后端后运行 `DOAI_BACKEND_DIR=/path/to/atomhub-api npm run test:forum-management:mysql`，仅使用临时 Docker MySQL，结束自动删除。
