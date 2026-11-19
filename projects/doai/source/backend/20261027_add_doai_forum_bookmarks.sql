-- DOAI 分论坛个人收藏。业务库增量，不在账号权威库执行。
-- 先执行 SQL，再生成 Prisma Client 并配套发布前后端。
-- 可重复执行；不修改旧表，不导入本机临时收藏，不发送通知。
CREATE TABLE IF NOT EXISTS `doai_forum_bookmarks` (
  `event_id` VARCHAR(36) NOT NULL DEFAULT 'doai-2026' COMMENT '大会标识，由服务端限定',
  `user_id` VARCHAR(36) NOT NULL COMMENT '真实会话对应的内容侧 users.id',
  `forum_id` VARCHAR(64) NOT NULL COMMENT '已公布场次标识，例如 forum-1',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '收藏时间；重复收藏保留原时间',
  PRIMARY KEY (`event_id`, `user_id`, `forum_id`),
  KEY `doai_forum_bookmarks_event_id_user_id_created_at_idx` (`event_id`, `user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='DOAI 分论坛个人收藏；按大会与会话账号隔离';
