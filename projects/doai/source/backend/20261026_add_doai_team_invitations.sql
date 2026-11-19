-- DOAI 战队邀请增量建表，MySQL 8.x；先执行此 SQL，再发布新的 DoaiModule。
-- 目标为 DATABASE_URL 指向的 atomhubv2 业务库，不在 atom_users 账号权威库执行。
-- 独立保存队长发出的邀请；现有 doai_team_applications 继续保存成员申请。
-- 不修改旧表、账号、权限或数据；不新增跨模块物理外键。
-- 可重复执行。回滚应用时保留本表，删除数据须另行确认与备份。
CREATE TABLE IF NOT EXISTS `doai_team_invitations` (
  `id` VARCHAR(36) NOT NULL COMMENT '业务主键，服务端 UUID',
  `team_id` VARCHAR(36) NOT NULL COMMENT '邀请加入的 doai_teams.id',
  `from_user_id` VARCHAR(36) NOT NULL COMMENT '发起队长 users.id，由会话推导',
  `to_user_id` VARCHAR(36) NOT NULL COMMENT '被邀请人 users.id，只有本人可以处理',
  `message` VARCHAR(1000) NOT NULL DEFAULT '' COMMENT '邀请留言',
  `status` VARCHAR(24) NOT NULL DEFAULT 'pending' COMMENT 'pending/accepted/declined',
  `handled_by` VARCHAR(36) NULL COMMENT '处理人 users.id',
  `handled_at` DATETIME(3) NULL COMMENT '处理时间',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `doai_team_invitations_team_id_to_user_id_key` (`team_id`, `to_user_id`),
  KEY `doai_team_invitations_from_user_id_created_at_idx` (`from_user_id`, `created_at`),
  KEY `doai_team_invitations_to_user_id_status_created_at_idx` (`to_user_id`, `status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='DOAI 队长邀请成员入队，独立于成员申请';
