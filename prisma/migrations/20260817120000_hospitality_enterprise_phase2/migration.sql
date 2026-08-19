-- Hospitality Enterprise Phase 2 — consolidated migration
-- Apply later: bun prisma migrate deploy
--
-- Includes:
--   1. Composite index on box (customer_id + vertical_id + status) for list/filter hot paths (P2-01 / C6)
--   2. hospitality_outbox_event table for MySQL↔Mongo dual-write outbox stub (P2-08)
--
-- Replaces (do not apply separately):
--   - 20260817000001_hospitality_box_list_composite_indexes
--   - 20260817100001_hospitality_outbox_event

-- ── P2-01: box list composite index ──────────────────────────────────────────
-- Hospitality box actions filter by client_id + vertical_id + status
-- (active inventory, suspended list, search). Single-column indexes on client_id
-- and vertical_id alone force wider scans at scale.
--
-- Index order: client_id (tenant) → vertical_id (vertical scope) → status (active/suspended).
-- Safe for all verticals sharing the box table; benefits hospitality grubpac lists most.

CREATE INDEX `box_client_vertical_status_idx` ON `box`(`customer_id`, `vertical_id`, `status`);

-- ── P2-08: outbox event table ────────────────────────────────────────────────

CREATE TABLE `hospitality_outbox_event` (
    `id` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(32) NOT NULL,
    `kind` ENUM('notification', 'log') NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `last_error` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `hospitality_outbox_status_created_idx`(`status`, `created_at`),
    INDEX `hospitality_outbox_client_kind_idx`(`client_id`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
