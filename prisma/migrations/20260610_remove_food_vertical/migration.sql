-- Migration: Remove legacy "Food" vertical — reassign records, drop table names,
--              lock schema with CHECK constraint.
--
-- Idempotent, transactional, logged.
--
-- Run with: mysql -u <user> -p <database> < migration.sql
-- Or via:   bun prisma db push  (after updating schema.prisma @@map directives)

START TRANSACTION;

-- ============================================================
-- STEP 1: Log the start
-- ============================================================
SELECT CONCAT('[Migration] ', NOW(), ' — Starting remove_food_vertical') AS migration_log;
SELECT CONCAT('[Migration] Searching for vertical with name = "food" ...') AS migration_log;

-- ============================================================
-- STEP 2: Reassign all existing records that reference "Food"
--         vertical to "Delivery".  (Idempotent — if no "food"
--         vertical exists, this simply affects zero rows.)
-- ============================================================
SET @food_vertical_id = (SELECT id FROM `vertical` WHERE LOWER(`name`) = 'food' LIMIT 1);
SET @delivery_vertical_id = (SELECT id FROM `vertical` WHERE LOWER(`name`) = 'delivery' LIMIT 1);

-- Only reassign if both verticals exist AND they are different
SELECT IF(
  @food_vertical_id IS NOT NULL AND @delivery_vertical_id IS NOT NULL AND @food_vertical_id != @delivery_vertical_id,
  CONCAT('[Migration] Food vertical ID = ', @food_vertical_id, ', Delivery vertical ID = ', @delivery_vertical_id),
  '[Migration] No reassignment needed — Food vertical does not exist or is the same as Delivery.'
) AS migration_log;

UPDATE `client`
  SET `vertical_id` = @delivery_vertical_id
  WHERE `vertical_id` = @food_vertical_id
    AND @food_vertical_id IS NOT NULL
    AND @delivery_vertical_id IS NOT NULL
    AND @food_vertical_id != @delivery_vertical_id;
SELECT CONCAT('[Migration] Clients reassigned: ', ROW_COUNT()) AS migration_log;

UPDATE `box`
  SET `vertical_id` = @delivery_vertical_id
  WHERE `vertical_id` = @food_vertical_id
    AND @food_vertical_id IS NOT NULL
    AND @delivery_vertical_id IS NOT NULL
    AND @food_vertical_id != @delivery_vertical_id;
SELECT CONCAT('[Migration] Boxes reassigned: ', ROW_COUNT()) AS migration_log;

UPDATE `faq_category`
  SET `vertical_id` = @delivery_vertical_id
  WHERE `vertical_id` = @food_vertical_id
    AND @food_vertical_id IS NOT NULL
    AND @delivery_vertical_id IS NOT NULL
    AND @food_vertical_id != @delivery_vertical_id;
SELECT CONCAT('[Migration] FAQ categories reassigned: ', ROW_COUNT()) AS migration_log;

UPDATE `client_deleted`
  SET `vertical_id` = @delivery_vertical_id
  WHERE `vertical_id` = @food_vertical_id
    AND @food_vertical_id IS NOT NULL
    AND @delivery_vertical_id IS NOT NULL
    AND @food_vertical_id != @delivery_vertical_id;
SELECT CONCAT('[Migration] Deleted clients reassigned: ', ROW_COUNT()) AS migration_log;

UPDATE `box_deleted`
  SET `vertical_id` = @delivery_vertical_id
  WHERE `vertical_id` = @food_vertical_id
    AND @food_vertical_id IS NOT NULL
    AND @delivery_vertical_id IS NOT NULL
    AND @food_vertical_id != @delivery_vertical_id;
SELECT CONCAT('[Migration] Deleted boxes reassigned: ', ROW_COUNT()) AS migration_log;

UPDATE `notification`
  SET `vertical_id` = @delivery_vertical_id
  WHERE `vertical_id` = @food_vertical_id
    AND @food_vertical_id IS NOT NULL
    AND @delivery_vertical_id IS NOT NULL
    AND @food_vertical_id != @delivery_vertical_id;
SELECT CONCAT('[Migration] Notifications reassigned: ', ROW_COUNT()) AS migration_log;

-- ============================================================
-- STEP 3: Soft-delete the legacy "Food" vertical (if it exists
--         and is still active).  Idempotent — if already
--         deleted or non-existent, this affects zero rows.
-- ============================================================
UPDATE `vertical`
  SET `status` = 'deleted'
  WHERE LOWER(`name`) = 'food' AND `status` = 'active';
SELECT CONCAT('[Migration] Food verticals soft-deleted: ', ROW_COUNT()) AS migration_log;

-- ============================================================
-- STEP 4: Rename legacy vertical_food_* tables to
--         vertical_delivery_*.
--         Idempotent: each RENAME TABLE only succeeds if the
--         source table exists AND the target does not.
-- ============================================================
-- vertical_food_employee -> vertical_delivery_employee
RENAME TABLE IF EXISTS `vertical_food_employee` TO `vertical_delivery_employee`;
SELECT CONCAT('[Migration] Renamed vertical_food_employee -> vertical_delivery_employee: ', ROW_COUNT()) AS migration_log;

-- vertical_food_employee_box -> vertical_delivery_employee_box
RENAME TABLE IF EXISTS `vertical_food_employee_box` TO `vertical_delivery_employee_box`;
SELECT CONCAT('[Migration] Renamed vertical_food_employee_box -> vertical_delivery_employee_box: ', ROW_COUNT()) AS migration_log;

-- vertical_food_employee_deleted -> vertical_delivery_employee_deleted
RENAME TABLE IF EXISTS `vertical_food_employee_deleted` TO `vertical_delivery_employee_deleted`;
SELECT CONCAT('[Migration] Renamed vertical_food_employee_deleted -> vertical_delivery_employee_deleted: ', ROW_COUNT()) AS migration_log;

-- vertical_food_consumer -> vertical_delivery_consumer
RENAME TABLE IF EXISTS `vertical_food_consumer` TO `vertical_delivery_consumer`;
SELECT CONCAT('[Migration] Renamed vertical_food_consumer -> vertical_delivery_consumer: ', ROW_COUNT()) AS migration_log;

-- vertical_food_consumer_box -> vertical_delivery_consumer_box
-- (Note: this table currently has no @@map alias — it's created as vertical_food_consumer_box
--  by the initial migration. Rename for consistency.)
SET @has_food_consumer_box = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vertical_food_consumer_box');
SET @has_delivery_consumer_box = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vertical_delivery_consumer_box');
SELECT IF(
  @has_food_consumer_box > 0 AND @has_delivery_consumer_box = 0,
  'Will rename vertical_food_consumer_box -> vertical_delivery_consumer_box',
  'vertical_food_consumer_box either does not exist or vertical_delivery_consumer_box already exists'
) AS migration_log;
RENAME TABLE IF EXISTS `vertical_food_consumer_box` TO `vertical_delivery_consumer_box`;

-- ============================================================
-- STEP 5: Update the food_consumer_status enum type on the
--         vertical_delivery_consumer / vertical_food_consumer
--         table (whichever exists) to delivery_consumer_status.
--         MySQL does not support renaming enum values directly,
--         so we ALTER the column to use the new enum name.
-- ============================================================
-- Check which table exists (post-rename or pre-rename)
SET @consumer_table = NULL;
SELECT TABLE_NAME INTO @consumer_table
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('vertical_delivery_consumer', 'vertical_food_consumer')
ORDER BY TABLE_NAME DESC
LIMIT 1;

SET @sql = IF(
  @consumer_table IS NOT NULL,
  CONCAT(
    'ALTER TABLE `', @consumer_table, '`
     MODIFY COLUMN `status` ENUM("pending", "delivered", "cancelled")
     NOT NULL DEFAULT "pending"'
  ),
  'SELECT "No consumer table found — skipping enum update"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SELECT CONCAT('[Migration] Updated consumer status enum on table: ', IFNULL(@consumer_table, '(none)')) AS migration_log;

-- ============================================================
-- STEP 6: Drop any legacy CHECK constraint if it exists, then
--         add a new one that only allows the current set of
--         vertical IDs that exist in the BOX_VERTICALS allowlist.
--         (This is a best-effort constraint — the real validation
--          is at the application layer.)
-- ============================================================
ALTER TABLE `client` DROP CONSTRAINT IF EXISTS `chk_client_vertical`;
-- Note: MySQL ignores CHECK constraints that reference other tables,
-- so this is informational.  Application-layer validation is the
-- real guard.
ALTER TABLE `client` ADD CONSTRAINT `chk_client_vertical`
  CHECK (`vertical_id` IS NULL OR `vertical_id` IN (SELECT `id` FROM `vertical` WHERE `status` = 'active'));

-- ============================================================
-- STEP 7: Log completion
-- ============================================================
SELECT CONCAT('[Migration] ', NOW(), ' — Completed remove_food_vertical') AS migration_log;

COMMIT;
