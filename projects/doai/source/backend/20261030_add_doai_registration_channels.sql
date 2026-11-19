-- DOAI 四渠道报名与运营权限。仅业务库执行；先迁移，再生成 Prisma Client、发布后端及前端。
-- 可重复执行，不改写历史来源。既有管理员保留总管理员权限，新运营由总管理员明确授权。

SET @doai_channel_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='doai_registrations' AND COLUMN_NAME='channel'), 'SELECT 1', 'ALTER TABLE `doai_registrations` ADD COLUMN `channel` VARCHAR(24) NULL COMMENT ''报名来源渠道；历史记录为空''');
PREPARE doai_channel_stmt FROM @doai_channel_ddl;
EXECUTE doai_channel_stmt;
DEALLOCATE PREPARE doai_channel_stmt;

SET @doai_channel_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='doai_tickets' AND COLUMN_NAME='channel'), 'SELECT 1', 'ALTER TABLE `doai_tickets` ADD COLUMN `channel` VARCHAR(24) NULL COMMENT ''大会报名渠道；论坛及历史票据为空''');
PREPARE doai_channel_stmt FROM @doai_channel_ddl;
EXECUTE doai_channel_stmt;
DEALLOCATE PREPARE doai_channel_stmt;

SET @doai_channel_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='doai_admin_accounts' AND COLUMN_NAME='role'), 'SELECT 1', 'ALTER TABLE `doai_admin_accounts` ADD COLUMN `role` VARCHAR(32) NOT NULL DEFAULT ''super_admin'' COMMENT ''super_admin 或 channel_operator''');
PREPARE doai_channel_stmt FROM @doai_channel_ddl;
EXECUTE doai_channel_stmt;
DEALLOCATE PREPARE doai_channel_stmt;

SET @doai_channel_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='doai_admin_accounts' AND COLUMN_NAME='channel'), 'SELECT 1', 'ALTER TABLE `doai_admin_accounts` ADD COLUMN `channel` VARCHAR(24) NULL COMMENT ''渠道运营负责的唯一渠道；总管理员为空''');
PREPARE doai_channel_stmt FROM @doai_channel_ddl;
EXECUTE doai_channel_stmt;
DEALLOCATE PREPARE doai_channel_stmt;

SET @doai_channel_ddl = IF(EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='doai_registrations' AND INDEX_NAME='doai_registrations_event_id_channel_created_at_idx'), 'SELECT 1', 'CREATE INDEX `doai_registrations_event_id_channel_created_at_idx` ON `doai_registrations` (`event_id`, `channel`, `created_at`)');
PREPARE doai_channel_stmt FROM @doai_channel_ddl;
EXECUTE doai_channel_stmt;
DEALLOCATE PREPARE doai_channel_stmt;

SET @doai_channel_ddl = IF(EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='doai_tickets' AND INDEX_NAME='doai_tickets_event_id_channel_created_at_idx'), 'SELECT 1', 'CREATE INDEX `doai_tickets_event_id_channel_created_at_idx` ON `doai_tickets` (`event_id`, `channel`, `created_at`)');
PREPARE doai_channel_stmt FROM @doai_channel_ddl;
EXECUTE doai_channel_stmt;
DEALLOCATE PREPARE doai_channel_stmt;
