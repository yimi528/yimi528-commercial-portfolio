-- DOAI 报名请求回执。业务库增量，不修改已有报名与票据。
-- 先执行此 SQL，再生成 Prisma Client 并配套发布后端与前端。
-- 可重复执行；不导入、合并或删除旧报名，不增加跨模块外键。
CREATE TABLE IF NOT EXISTS `doai_registration_requests` (
  `event_id` VARCHAR(36) NOT NULL DEFAULT 'doai-2026' COMMENT '大会标识，由服务端限定',
  `user_id` VARCHAR(36) NOT NULL COMMENT '真实会话对应的内容侧 users.id',
  `request_key` VARCHAR(64) NOT NULL COMMENT '客户端同一次提交的稳定请求标识；旧调用由服务端生成',
  `payload_hash` VARCHAR(64) NOT NULL COMMENT '服务端规范化报名内容的 SHA256，不接受客户端指定',
  `dedupe_hash` VARCHAR(64) NULL COMMENT '原始请求的内容去重键；后续请求别名为空',
  `registration_id` VARCHAR(36) NOT NULL COMMENT '原子创建的报名记录标识',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '提交回执创建时间',
  PRIMARY KEY (`event_id`, `user_id`, `request_key`),
  UNIQUE KEY `doai_registration_requests_event_id_user_id_dedupe_hash_key` (`event_id`, `user_id`, `dedupe_hash`),
  KEY `doai_registration_requests_registration_id_idx` (`registration_id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='DOAI 报名请求回执；防止重复报名、票据及通知';
