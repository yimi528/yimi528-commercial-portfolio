[作品集](../../README.md) / DOAI &nbsp;&nbsp; 简体中文 / [English](README.en.md)

# DOAI

### 全球创客大会官网与活动业务平台

我独立负责项目整体开发与迭代：从需求梳理、页面与交互，到前后端业务、数据库、自动化验证和部署适配。

`React` `TypeScript` `NestJS` `Prisma` `MySQL` `Vercel`

![DOAI 大会介绍页与手机端界面实拍](images/project-cover.png)

[桌面端原图](images/conference-desktop.png) &nbsp; / &nbsp; [手机端原图](images/conference-mobile.png) &nbsp; / &nbsp; **[完整开发详解](IMPLEMENTATION.md)**

## 一个活动平台，连接三类用户

**参会者**了解大会、申请参会、预约论坛并领取电子凭证。**创客**报名参赛、提交作品、组建战队和寻找协作者。**运营人员**审核申请、维护内容与场次，并完成现场核销。

我将这些需求组织成同一套前后台业务流程，并接入既有主站账号体系。

## 我交付了什么

- **大会网站**：首页、赛事、日程、场地导览、合作方案、中英文内容与手机端布局。
- **报名与票务**：分步报名、团队关联、作品更新、参会审核、论坛预约、电子票和数字 Passport。
- **社区与协作**：招募、关注、名片交换、战队申请与邀请、个人资料和隐私设置。
- **消息与运营**：统一消息中心、审核通知、后台 CMS、论坛管理、渠道权限、导出和扫码核销。
- **后端与数据**：NestJS 业务模块、Prisma / MySQL 持久化、权限校验、数据库迁移与主站集成。
- **质量与交付**：浏览器回归、隔离数据库验证、并发与失败恢复、部署适配和发布包工具。

## 页面展示

<table>
<tr>
<td width="50%">
<a href="images/venue-desktop.png"><img src="images/venue-desktop.png" alt="场地导览：楼层切换与点位说明" width="100%"></a>
<br><strong>场地导览</strong><br>
按场地与楼层组织内容，支持活动入口直达对应点位。
</td>
<td width="50%">
<a href="images/partnership-desktop.png"><img src="images/partnership-desktop.png" alt="合作页面：分层权益与咨询入口" width="100%"></a>
<br><strong>合作方案</strong><br>
将合作权益与预算独立呈现，建立合作方的访问路径。
</td>
</tr>
</table>

<details>
<summary>查看账号登录界面</summary>

![账号登录：手机号、验证码与协议确认](images/login-desktop.png)

接入主站账号体系，处理验证码、会话、资料映射与登录反馈。

</details>

## 关键实现

**让提交结果可信。** 报名使用请求标识与回执查询，处理重复点击、超时和回执丢失；保存成功后校验返回状态，再更新界面。

**让多用户操作保持一致。** 后端事务处理预约名额、组队人数与核销状态；CMS 和论坛编辑进行版本校验，冲突时保留草稿。

**让账号与权限有明确边界。** 服务端会话确定操作者，按本人、队长、渠道或管理员校验权限；前端隔离换号前的缓存和迟到响应。

### 技术架构

React / TypeScript 前端通过 Express 同源代理接入 NestJS 业务模块，使用 Prisma / MySQL 保存数据，并复用既有账号服务。支持 Vercel 与 `/doai/` 子路径部署。

**[阅读完整开发详解](IMPLEMENTATION.md)**：十个工作模块、完整用户流程、系统架构、技术取舍、测试覆盖与简历描述。

---

<sub>截图记录早期版本，拍摄于 2026-11-02；完整工作范围包含后续迭代。部分新功能仍需配套数据库迁移和前后端生产发布。图中参会规模与合作金额属于活动规划或方案，场地图为示意素材。</sub>
