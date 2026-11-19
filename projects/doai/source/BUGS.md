# DOAI 官网缺陷清单与修复记录

> 2026-11-09 更新：下文 2026-10-20 清单及批次为历史记录，不代表当前未修复列表。当前代码已迁移到主站账号、NestJS 与 MySQL 架构。
>
> 本轮已修复：战队数据库分页及独立详情、申请审核定时同步、社区栏目/筛选/页码/滚动位置恢复、新账号名片默认公开、旧隐藏名片登录后自愿开启提示，以及页面按需加载。前端和本地主站源码均已修改；线上迁移、部署及真实账号验收尚未执行。详见 `backend/COMMUNITY-20261109.md`。


> 记录时间：2026-10-20
> 范围：`https://github.com/Karovia/doai-website`（`f5c43c5` 及其之后）
> 负载假设：700+ 报名、活动当天多闸口并发扫码、数名运营 + 完全公开的匿名访客。
> 编号与修复批次一一对应，每条都有「怎么复现 → 为什么会错 → 怎么修 → 不修会怎样」。

**审阅方式**：通读 `server.js`、`src/context/AppContext.tsx` 与报名/后台/消息/战队/名片/论坛相关页面，`npm run lint` 与 `npm run build` 均通过。未逐页审营销文案、未做浏览器端到端与压力测试（线上站点从本机连不上，结论来自源码与本地构建）。

**风险总览**

| 等级 | 数量 | 主题 |
|---|---|---|
| 必须修复 | 10 | 数据丢失/不可信、身份冒充、隐私泄露、功能假完成 |
| 应该修复 | 9 | 状态不回写、重复通知、权限失效、首屏性能、零测试 |
| 可以后做 | 1 | 清理 |

---

## 1. 必须修复（Must fix）

### BUG-01 大会报名生成的入场凭证没有入库，现场也扫不过
- **位置**：`src/components/detail/AttendView.tsx`（报名提交）、`server.js`（`/api/checkin` 校验）、`src/components/views/DashboardView.tsx`（主二维码）
- **复现**：打开「大会报名」选任一票种 → 提交 → 去 `/admin` 的核销页扫一眼，或刷新页面。
- **问题**：只调用了前端 `setTickets`/`setNotifications`，没有请求 `/api/tickets`，凭证从未落库；生成的码是 `DOAI-ATTEND-…`，而核销接口只认「库里已有的票」或 `DOAI-PASS` 前缀，扫码返回 422；Passport 主二维码只从 `type === 'maker'` 里取，参会票不会显示。
- **影响**：观众报名成功但进不了场，后台查不到人。
- **修法**：生成后逐张 `POST /api/tickets`；核销改为必须命中真实 ticket；统一前缀；主码取当前用户最新一张有效票。

### BUG-02 Vercel 上所有业务数据写在 `/tmp`，冷启动即消失
- **位置**：`server.js`（`DATA_DIR`）、`api/[...path].js`
- **复现**：部署到 Vercel，提交一次报名，等函数实例回收或下一次冷启动，再查后台。
- **问题**：`DATA_DIR` 固定为 `/tmp/doai-data`，每个 Serverless 实例的 `/tmp` 互相独立，且实例回收即清空；`seed()` 还会在冷启动时重复灌演示数据。
- **影响**：报名/战队/核销记录随机消失或前后不一致，现场核销结果不可信。
- **修法**：接持久化存储（Postgres / Upstash / Redis）。Serverless 没有共享磁盘，这是部署模型的限制，不是调参能解决的。

### BUG-03 所有写接口没有鉴权，任何人可冒充管理员
- **位置**：`server.js`（各写接口）、`src/components/router/RouterView.tsx`
- **复现**：不登录，直接 `curl -X POST /api/registration-status -d '{"id":"reg-001","status":"shortlisted"}'`；或浏览器打开 `/admin`。
- **问题**：接口直接信任 body 里的 `userId`/`byUserId`；`/admin` 页面前后端都没有权限检查。
- **影响**：审核结果、官方公告、任意用户资料、关注关系、组队申请都可被匿名篡改。
- **修法**：登录会话（签名 Cookie/JWT），服务端从会话取操作者；`/api/admin/*` 与 `/admin` 做角色校验，不再把 userId 当身份。

### BUG-04 报名手机号与入场二维码可被任何人读取
- **位置**：`server.js`（`GET /api/registrations`、`/api/tickets`、`/api/checkins`）
- **复现**：不登录访问 `/api/registrations` 与 `/api/tickets`。
- **问题**：三个列表接口都是公开的，返回所有报名（含成员完整手机号）、所有持票人与二维码、核销日志。
- **影响**：可批量拿到手机号和别人的入场码，再调 `/api/checkin` 就能在本人到场前把票核销掉。属于个人信息泄露与票被冒用。
- **修法**：加鉴权并按当前用户过滤；列表不返回完整手机号和 `qrCode`；核销日志仅管理员可见。

### BUG-05 JSON 直接覆盖写，崩溃一次可能丢光全部数据
- **位置**：`server.js`（`load`/`save`）
- **复现**：在 `save()` 写入过程中 kill 进程，然后重启服务并发起一次新的保存。
- **问题**：`save()` 直接 `writeFileSync` 覆盖正式文件；`load()` 把解析失败一律当空数组返回。
- **影响**：写入中途被杀会留下截断的 JSON，被读成空数组后又被下一次保存覆盖，整份数据丢失。
- **修法**：写临时文件 → `fsync` → `rename` 原子替换；解析失败时保留 `.bak` 并报错，不能静默当空。

### BUG-06 4 位随机 Maker ID / 二维码在 700 人规模必然撞号
- **位置**：`src/context/AppContext.tsx`（`submitRegistration`）、`server.js`（`upsertRegistration`、`POST /api/tickets`）
- **复现**：循环提交约 200 条报名，统计 `makerId` 重复数（4 位随机落在 9000 个值里，700 人撞号几乎是必然）。
- **问题**：Maker ID 与入场二维码都用 `1000–9999` 的 4 位随机数；票按 `qrCode` 去重和覆盖。
- **影响**：后提交的票会覆盖前一个人的票；核销去重会把两个人当成同一个人，有人到场发现票已被别人核销。
- **修法**：ID 与二维码改由服务端生成 UUID/ULID，前端不再生成身份标识。

### BUG-07 提交成功的报名在前端永远读不回来
- **位置**：`src/context/AppContext.tsx`（挂载同步）、`src/components/views/DashboardView.tsx`
- **复现**：登录 → 提交报名 → 刷新页面。
- **问题**：首次挂载只 `fetch('/api/registrations')` 判断要不要灌演示数据，从不 `setRegistrations` 回填；`myRegistration` 还会回退到 `registrations[0]`。
- **影响**：刷新后「我的报名」变回 4 条演示数据，自己的报名和作品都消失；新用户直接看到 Alex 的项目。
- **修法**：挂载时按当前用户拉取报名/作品/票并写入 state；演示数据只在明确 demo 模式下使用。

### BUG-08 登录是假的：8821 进的不是演示账号，刷新还会变回李晨
- **位置**：`src/context/AppContext.tsx`、`src/components/modals/LoginModal.tsx`
- **复现**：用尾号 8821 的手机号登录，然后刷新页面；或新用户改一次头像后看李晨的资料。
- **问题**：`currentUser` 初始就是 `user-101`（李晨）；登录时无论手机号都新建 `user-${Date.now()}`，登录态不落盘；`saveProfile` 永远写 `initialUser.id`。
- **影响**：8821 登录后拿到新 ID，Synapse Core 战队和种子通知都不见了；刷新后所有人都变回李晨；新用户改头像会改掉李晨的全局头像。
- **修法**：服务端会话 + 稳定用户 ID；持久化登录；`saveProfile` 用 `currentUser.id`；演示账号只在演示模式自动登录。

### BUG-09 审核结果通知发错人，而且一次发两条
- **位置**：`src/context/AppContext.tsx`（`updateRegistrationStatus`）、`server.js`（`/api/registration-status`）
- **复现**：在后台把任一报名改成「入围」，然后看李晨的消息中心。
- **问题**：前端提交报名不带 `ownerUserId`，服务端回退到 `user-101`；前端又额外 `pushNotification` 一条给 `user-101`。
- **影响**：真实报名人的审核结果永远发给李晨；每审一次李晨收到两条重复通知。
- **修法**：报名时写入 `ownerUserId`，服务端按它发；删掉前端重复的那条，以服务端为准。

### BUG-10 18 个分论坛的日期全是 2026-11-15，与站点口径 11.28—29 冲突
- **位置**：`src/context/AppContext.tsx`（`planForums` / `initialForums` / 种子票）、`src/components/views/ForumView.tsx`
- **复现**：打开 DOAI Forum 任一卡片，看日期；再预约一个场次，看票面。
- **问题**：18 个场次 `date` 都是 `2026-11-15`、`when` 写「15 日」；票面是 `2026-11-15 ~ 11-17`，而页面顶部与 README 都是 11.28—29。
- **影响**：观众按票面日期跑错场地。
- **修法**：统一成大会实际日期，票面从同一个常量生成。

---

## 2. 应该修复（Should fix）

### BUG-11 后台审核后表格不更新
- **位置**：`src/components/views/AdminView.tsx`
- **复现**：打开后台「报名评审审核」，点一次「入围」，看表格状态列。
- **问题**：`backendRegistrations` 只在挂载时 fetch 一次，之后表格一直渲染快照；审核只更新 context 里的 `registrations`。
- **影响**：状态列不变，运营以为没保存又点一次，结果重复发通知。
- **修法**：审核成功后更新 `backendRegistrations` 或重新 fetch，保持单一数据源。

### BUG-12 全员推送 / CMS / 广场下架只改本机内存
- **位置**：`src/components/views/AdminView.tsx`
- **复现**：后台发一条全员站内信，换一个浏览器打开消息中心；或改一次 CMS 数字后刷新。
- **问题**：全员推送只 `setNotifications`；CMS 只 `updateCMSData`；广场下架只 `setRecruitments`。
- **影响**：其他用户收不到公告；刷新后数字、公告、下架记录全部恢复原样。
- **修法**：全员推送调用已有的 `POST /api/notifications`（`to:'all'`）；CMS 与下架加持久化接口。

### BUG-13 已读状态和「申请已处理」不落库，刷新就复活
- **位置**：`src/context/AppContext.tsx`、`src/components/views/MessageCenter.tsx`、`server.js`
- **复现**：点「全部已读」后刷新；或确认一条组队申请后刷新。
- **问题**：已读只改本地 state；处理申请时不更新对应通知的 `applicationStatus`；`if (d?.ok?.notification)` 对布尔值取属性永远是 `undefined`，服务端返回的通知永远替换不了本地乐观插入的那条。
- **影响**：未读全部回来；确认/拒绝后按钮又出现，再点返回 409，用户以为操作没生效。
- **修法**：加已读接口；处理申请时同步更新对应通知；条件改成 `d?.ok && d.notification`。

### BUG-14 组队：受理时不复检，非队长也能拉人，一个人能进两个队
- **位置**：`server.js`（`/api/team-applications` 与 accept/decline）
- **复现**：B 在等待 A 邀请期间自己建了队，再点接受；或让普通队员调用发送申请接口。
- **问题**：受理申请时不复查申请人是否已有战队；发送申请时不校验 `fromUserId` 是队长。
- **影响**：队伍成员关系错乱，队长权限失效。
- **修法**：受理时重新检查 `teamOf(fromUserId)` 和人数上限；发送时区分「邀请」与「申请」两种语义并校验发起身份。

### BUG-15 报名表单预填演示项目，邀请链接写死且指向死路由
- **位置**：`src/components/views/RegisterView.tsx`
- **复现**：不填任何内容，一路点「下一步」到提交；或看第 4 步的邀请链接。
- **问题**：姓名、城市、队名、项目名、简介都预填成李晨 / Synapse Core / NeuroFlow；邀请链接写死 `https://doai2026.org/join?code=NF8921`，所有队伍同一个码，且 `/join` 不在路由表里（会回首页），域名也不是线上域名。
- **影响**：假报名污染后台；邀请功能不可用。
- **修法**：表单默认值为空；用 `submitRegistration` 返回的 `inviteCode` 生成链接；补 `/join/:code` 路由或先移除该入口。

### BUG-16 组队广场的发布、申请、点赞全是本地状态
- **位置**：`src/components/views/SquareView.tsx`、`src/context/AppContext.tsx`
- **复现**：发布一条招募 → 刷新；给一条招募点赞 → 刷新；申请加入 → 看对方消息中心。
- **问题**：发布只 `setRecruitments`；申请只弹「成功」；点赞只改本地计数。
- **影响**：刷新后回到 8 条种子数据；对方从来收不到申请；点赞数不是真的。
- **修法**：给招募、点赞、申请加后端端点，或先隐藏这些按钮。

### BUG-17 任何 `DOAI-PASS` 开头的码都能核销
- **位置**：`server.js`（`checkinHandler`）
- **复现**：在核销输入框输入 `DOAI-PASS-123` 并提交。
- **问题**：不在 tickets 表里的码，只要匹配 `/^DOAI-PASS/i` 就放行；输入框的 placeholder 已经把这个格式公开了。
- **影响**：无票入场，核销数据不可信。
- **修法**：核销必须命中真实 ticket；历史演示码如需保留，就作为种子票写进 tickets。

### BUG-18 首屏太重：单个 772 KB JS + 大量未压缩、未懒加载图片
- **位置**：构建产物、`src/components/views/HomeView.tsx`
- **复现**：`npm run build` 后看产物；统计 `<img>` 标签的 `loading` 属性。
- **问题**：产物是单个 772 KB（gzip 236 KB）JS；`src/assets/images` 共 12 MB；首页自动播放 1.3 MB 视频且 `preload="auto"`；23 个 `<img>` 里只有 1 个 `loading="lazy"`。
- **影响**：手机和会场 Wi-Fi 首屏很慢，流量大，报名转化会掉。
- **修法**：按路由 `React.lazy` + 分块；图片压成 WebP/AVIF 并缩到展示尺寸；首屏以下加懒加载；视频改 `preload="metadata"`。

### BUG-19 没有自动化测试，关键链路全靠手点
- **位置**：`package.json`（无 `test` script）、`scripts/`
- **复现**：`npm test`。
- **问题**：没有测试脚本；`scripts/` 里 29 个 Puppeteer 脚本都要手动起服务、手动跑。
- **影响**：撞号、参会票核销、重复通知、报名回读这几个已经上线的 bug 都没有测试能挡住。
- **修法**：至少补 4 个集成测试：生成 700 个 ID 断言唯一、参会报名→核销、报名→刷新→还能看到、审核→只发一条给本人。

---

## 3. 可以后做（Nice to have）

### BUG-20 清理：没用的依赖、一次性脚本、两套重复路由
- **位置**：`package.json`、`scripts/`、`server.js`、`README.md`
- **问题**：`@google/genai`、`motion`、`dotenv` 没有任何 import；29 个一次性脚本留在仓库；同一批接口同时存在多段和单段两套路由；README 写 React 18，实际是 19。
- **修法**：删除未用依赖和脚本；保留一套 API 路径；README 对齐实际版本。

**另有三处较小问题未单列**：管理后台 PV / 转化率是写死的（`12,480`、`registrations.length * 185 + 2`）；公众号抓取没有超时；通知 ID 用毫秒 + 3 位随机数，理论上会撞。

---

## 修复记录

> 每批修复一条：改了什么、验证到什么程度、还剩什么。

| 日期 | 批次 | 覆盖 | 验证 |
|---|---|---|---|
| 2026-10-20 | 批次 1 | BUG-01、06、07、09、10 | 见下 |
| 2026-10-20 | 批次 2 | BUG-05、11、13、17 | 见下 |
| 2026-10-20 | 批次 3 | BUG-08、12、14、15、16、19 | 见下 |
| 2026-10-20 | 批次 4 | BUG-18、20 | 见下 |
| 待定 | 批次 5 | BUG-02、03、04（需要账号体系与外部存储，见下） | — |

### 批次 1：报名、票、通知、日期（BUG-01/06/07/09/10）

**改了什么**

- `server.js`
  - 新增 `newId(prefix)`，用 `crypto.randomUUID()` 生成报名 ID / Maker ID / 票 ID / 二维码，替换所有 4 位随机数。
  - `POST /api/tickets` 改为幂等 upsert（按 `id`，其次 `qrCode`），不再让后提交的票覆盖别人的票；强制补齐 `holderName`、`status`、`issuedAt`。
  - 报名 upsert 时写入 `ownerUserId`，审核通知只发给 `ownerUserId`（不再回退到 `user-101`）。
  - `GET /api/registrations`、`GET /api/tickets` 支持 `userId` 过滤。
  - 会议日期抽成常量 `CONFERENCE = { day1: '2026-11-28', day2: '2026-11-29' }`，种子票票面改用常量。
- `src/context/AppContext.tsx`
  - 报名与论坛预约改用服务端返回的真实 `makerId` / `qrCode`（不再前端生成）。
  - 报名成功后通知本地插入一条（服务端已不再重复发）。
  - 挂载时按当前用户回读报名、票、通知、名片，写进 state，修复「刷新后报名消失」。
  - 论坛场次日期统一为 `2026-11-29`，`when` 文案同步。
- `src/components/detail/AttendView.tsx`：参会凭证改为调用 `POST /api/tickets` 持久化，二维码统一 `DOAI-PASS-` 前缀，通知改走 `pushNotification`。
- `src/components/views/DashboardView.tsx`：Passport 主二维码取「当前用户最新一张未核销的票」，不再只找 maker 票。

**验证**

- `npm run lint` 通过、`npm run build` 通过。
- 本地起 `npm run server` + `npm run dev:web`，跑报名向导 → Passport 出现票 → 后台核销成功；刷新后报名与票仍在。
- 新增 `scripts/verify_bugfix.mjs`：ID 唯一性（700 个不撞号）、参会报名→核销闭环、报名回读、审核通知只发一条且发给本人。

**没修的部分**：通知已读状态、组队受理复检、登录态与鉴权在后续批次。

### 批次 2：存储安全、后台状态、核销口径（BUG-05/11/13/17）

**改了什么**

- `server.js`
  - `save()` 改为写临时文件 → `fsync` → `rename` 原子替换；`load()` 解析失败时不再当空数组，备份为 `.corrupt-<时间戳>` 并返回 `[]` 前打印错误。
  - 核销去掉 `DOAI-PASS` 通配放行，必须命中 tickets 表里的票；种子演示码写进 tickets。
  - 通知新增 `POST /api/notifications/read`（按 id 或全部已读），并广播给全员时不漏本人。
  - 处理组队申请时同步更新对应通知的 `applicationStatus` 与 `handled`。
  - `pushNotice` 返回条件改为 `d?.ok && d.notification`，修掉前端乐观插入永远替换不掉的 bug。
- `src/context/AppContext.tsx`：`markAllNotificationsRead` / `markNotificationRead` 落库；`pushNotification` 的替换条件修正。
- `src/components/views/MessageCenter.tsx`：处理完组队申请后本地同步 `applicationStatus`，按钮即时消失。
- `src/components/views/AdminView.tsx`：审核成功后刷新报名数据，表格状态即时更新。

**验证**

- `npm run lint`、`npm run build` 通过。
- `scripts/verify_bugfix.mjs` 增加用例：重复核销返回 409、假 `DOAI-PASS-xxx` 返回 422、已读状态重启后仍在、处理申请后通知状态同步。
- 手工 kill 进程测试原子写：写入中被杀后文件未损坏，备份存在。

**没修的部分**：鉴权（BUG-03/04）依赖账号体系，留在批次 5。

### 批次 3：登录态、后台持久化、组队权限、表单、测试（BUG-08/12/14/15/16/19）

**改了什么**

- `src/context/AppContext.tsx`
  - 新增 `userId` 持久化（`localStorage`），刷新后保持同一身份；演示模式（`VITE_DEMO=1` 或默认）才自动登录 `user-101`。
  - `saveProfile` 改用 `currentUser.id`，不再写 `initialUser.id`。
- `src/components/modals/LoginModal.tsx`：8821 直接映射到 `user-101`，其余手机号生成稳定 ID（按手机号派生，不再每次 `Date.now()`）。
- `src/components/views/AdminView.tsx`
  - 全员推送调用 `POST /api/notifications`（`to:'all'`）。
  - CMS 与广场下架落到 `server.js` 新增的 `GET/POST /api/cms`、`POST /api/recruitments/delist`。
- `server.js`
  - 组队申请受理时复查「申请人是否已有战队」「战队是否满员」；发送申请校验发起者是队长。
  - 新增 `/api/cms`、`/api/recruitments/delist`。
- `src/components/views/RegisterView.tsx`：表单默认值清空；邀请链接用真实 `inviteCode` 生成；补 `/join/:code` 路由。
- `src/components/views/SquareView.tsx`：发布/申请/点赞走后端；无后端时按钮禁用并提示。
- `scripts/verify_bugfix.mjs`：补齐 4 个核心集成测试。

**验证**

- `npm run lint`、`npm run build`、`npm test` 通过。

**没修的部分**：鉴权仍在批次 5；广场点赞的并发计数用「读-改-写」，高并发下会丢，已记为已知限制。

### 批次 4：性能与清理（BUG-18/20）

**改了什么**

- `vite.config.ts` + 路由：按页面 `React.lazy` 分块，主包从 772 KB 降到约 300 KB。
- 图片：`src/assets/images` 转 WebP 并按展示尺寸缩放，总量 12 MB → 约 1.6 MB；首屏以下 `<img>` 补 `loading="lazy"`；首页视频改 `preload="metadata"`。
- 删除未使用依赖 `@google/genai`、`motion`、`dotenv`；删除 29 个一次性 Puppeteer 脚本，保留 `verify_bugfix.mjs`。
- `server.js`：保留单段 API 路径，多段路径改为转发到单段实现；README 的 React 版本改为 19。

**验证**

- `npm run lint`、`npm run build` 通过；`npm test` 通过；`gzip` 主包 236 KB → 约 95 KB。

### 批次 5（待定，需要决策）

BUG-02 / 03 / 04 需要账号体系和外部存储，改动超出「修 bug」范围：

- BUG-02：接 Postgres 或 Upstash，替换 JSON 文件存储。需要先确认有没有可用的库实例和预算。
- BUG-03 / 04：加登录会话与接口鉴权，`/admin` 与所有 `/api/admin/*` 做角色校验，列表接口不再返回完整手机号与二维码。需要确认：管理员账号怎么来（长宁组委会名单？）、是否允许外部服务（JWT 密钥存放）、以及是否接受「未登录只能看公开页」这个产品口径。

这三条不修，演示站可以继续用；接真实报名前必须先修。
