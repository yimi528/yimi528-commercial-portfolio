-- 数据清理操作，暂未在业务库执行。先应用渠道字段迁移，再运行本文件。
-- 仅处理 doai-2026 没有合法渠道的赛事报名和 attendance: 大会报名。
-- 同步清理对应回执、选手票和核销记录；论坛票、独立选手票、账号、团队及其他大会保留。
-- 请用遇错即退出的 MySQL 客户端执行，不使用 --force。删除和计数处于同一事务。

DROP TEMPORARY TABLE IF EXISTS doai_unassigned_registrations;
DROP TEMPORARY TABLE IF EXISTS doai_unassigned_tickets;
CREATE TEMPORARY TABLE doai_unassigned_registrations (id VARCHAR(36) PRIMARY KEY)
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TEMPORARY TABLE doai_unassigned_tickets (id VARCHAR(36) PRIMARY KEY)
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

START TRANSACTION;

INSERT INTO doai_unassigned_registrations (id)
SELECT id FROM doai_registrations
WHERE event_id = 'doai-2026'
  AND (channel IS NULL OR BINARY channel NOT IN ('public', 'atom', 'dobe', 'overseas'))
FOR UPDATE;

INSERT INTO doai_unassigned_tickets (id)
SELECT t.id FROM doai_tickets t
WHERE t.event_id = 'doai-2026' AND (
  (t.type = 'guest' AND t.booking_key LIKE 'attendance:%'
    AND (t.channel IS NULL OR BINARY t.channel NOT IN ('public', 'atom', 'dobe', 'overseas')))
  OR (t.type = 'maker' AND EXISTS (
    SELECT 1 FROM doai_unassigned_registrations r
    WHERE t.booking_key = CONCAT('registration:', r.id)
  ))
)
FOR UPDATE;

DELETE c FROM doai_checkins c JOIN doai_unassigned_tickets t ON t.id = c.ticket_id;
SET @doai_removed_checkins = ROW_COUNT();
DELETE q FROM doai_registration_requests q JOIN doai_unassigned_registrations r ON r.id = q.registration_id
WHERE q.event_id = 'doai-2026';
SET @doai_removed_requests = ROW_COUNT();
DELETE t FROM doai_tickets t JOIN doai_unassigned_tickets target ON target.id = t.id;
SET @doai_removed_tickets = ROW_COUNT();
DELETE r FROM doai_registrations r JOIN doai_unassigned_registrations target ON target.id = r.id;
SET @doai_removed_registrations = ROW_COUNT();

COMMIT;

SELECT @doai_removed_registrations AS removed_registrations,
       @doai_removed_tickets AS removed_tickets,
       @doai_removed_requests AS removed_requests,
       @doai_removed_checkins AS removed_checkins;

DROP TEMPORARY TABLE doai_unassigned_tickets;
DROP TEMPORARY TABLE doai_unassigned_registrations;
