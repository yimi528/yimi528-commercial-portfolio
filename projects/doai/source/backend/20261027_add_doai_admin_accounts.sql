-- DOAI 管理员名单持久化增量。先执行此 SQL，再部署配套后端与前端。
-- 目标为主站业务库；不在 atom_users 账号权威库执行，不授予任何初始权限。
-- DOAI_ADMIN_USER_IDS 仍为初始管理员来源；此表仅保存管理员明确执行的名单变更。
-- 可重复执行，不修改旧表、不清空数据、不增加跨模块外键。
CREATE TABLE IF NOT EXISTS `doai_admin_accounts` (
  `user_id` VARCHAR(36) NOT NULL COMMENT '已有原子公社内容侧 users.id，不创建新账号',
  `enabled` BOOLEAN NOT NULL DEFAULT true COMMENT '是否启用管理员权限',
  `updated_by` VARCHAR(36) NOT NULL COMMENT '最近操作管理员 users.id，由会话推导',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '最后更新时间',
  PRIMARY KEY (`user_id`),
  KEY `doai_admin_accounts_enabled_updated_at_idx` (`enabled`, `updated_at`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='DOAI 管理员启用名单；初始管理员仍由环境配置维护';
