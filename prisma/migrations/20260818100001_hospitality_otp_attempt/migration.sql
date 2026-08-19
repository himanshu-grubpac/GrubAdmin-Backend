-- P2-13 — Hospitality OTP attempt counters colocated in MySQL (replaces Mongo OtpAttempt for hospitality routes)
-- Apply later: bun prisma migrate deploy

CREATE TABLE `hospitality_otp_attempt` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `scope` VARCHAR(64) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `last_attempt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_locked` BOOLEAN NOT NULL DEFAULT false,
    `lock_until` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `hospitality_otp_attempt_email_scope_key`(`email`, `scope`),
    INDEX `hospitality_otp_attempt_lock_until_idx`(`lock_until`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
