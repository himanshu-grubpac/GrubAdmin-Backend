-- CreateTable
CREATE TABLE `hospitality_employee_otp` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `role` ENUM('admin') NOT NULL,
    `otp` VARCHAR(191) NOT NULL,
    `otp_id` VARCHAR(32) NOT NULL,
    `for_what` ENUM('login', 'forget_password', 'set_new_password', 'delete_account') NOT NULL DEFAULT 'login',
    `metadata` JSON NULL,
    `failed_attempts` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `hospitality_employee_otp_otp_id_key`(`otp_id`),
    INDEX `hospitality_employee_otp_email_created_at_idx`(`email`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
