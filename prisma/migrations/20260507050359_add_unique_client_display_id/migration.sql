-- CreateTable
CREATE TABLE `admin` (
    `id` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `last_name` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `mobile_number` VARCHAR(191) NULL,
    `country_code` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `joining_date` DATETIME(3) NULL,
    `role_id` VARCHAR(191) NULL,
    `status` ENUM('active', 'suspended', 'unassigned') NULL DEFAULT 'unassigned',
    `avatar` VARCHAR(191) NULL,
    `employee_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admin_email_key`(`email`),
    UNIQUE INDEX `admin_employee_id_key`(`employee_id`),
    INDEX `admin_role_id_fkey`(`role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_dismissed` (
    `id` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `last_name` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `mobile_number` VARCHAR(191) NULL,
    `country_code` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `is_super_admin` BOOLEAN NOT NULL DEFAULT true,
    `location` VARCHAR(191) NULL,
    `joining_date` DATETIME(3) NULL,
    `role` VARCHAR(191) NULL,
    `employee_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admin_dismissed_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_config` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_config_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `icon` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `bucket_key` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    FULLTEXT INDEX `icon_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vertical` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vertical_name_key`(`name`),
    INDEX `vertical_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `client_display_id` VARCHAR(191) NOT NULL,
    `organization_name` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `mobile_number` VARCHAR(191) NULL,
    `country_code` VARCHAR(191) NULL,
    `status` ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `vertical_id` VARCHAR(191) NULL,
    `profile_pic` VARCHAR(191) NULL,

    UNIQUE INDEX `client_client_display_id_key`(`client_display_id`),
    INDEX `client_name_idx`(`name`),
    INDEX `client_organization_name_idx`(`organization_name`),
    INDEX `client_country_idx`(`country`),
    INDEX `client_state_idx`(`state`),
    INDEX `client_email_idx`(`email`),
    INDEX `client_mobile_number_idx`(`mobile_number`),
    UNIQUE INDEX `client_vertical_id_email_key`(`vertical_id`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `faq_category` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `icon_id` VARCHAR(191) NULL,
    `vertical_id` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` ENUM('active', 'suspended', 'deleted') NOT NULL DEFAULT 'active',
    `index` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `faq_category_name_idx`(`name`),
    INDEX `faq_category_description_idx`(`description`),
    INDEX `faq_category_icon_id_fkey`(`icon_id`),
    INDEX `faq_category_vertical_id_fkey`(`vertical_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `faq_question` (
    `id` VARCHAR(191) NOT NULL,
    `question` VARCHAR(191) NOT NULL,
    `answer` LONGTEXT NOT NULL,
    `publishing_status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
    `status` ENUM('active', 'suspended', 'deleted') NOT NULL DEFAULT 'active',
    `attachments` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `faq_question_question_idx`(`question`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `faq_question_category` (
    `id` VARCHAR(191) NOT NULL,
    `question_id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `faq_question_category_category_id_fkey`(`category_id`),
    INDEX `faq_question_category_question_id_fkey`(`question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `name_normalized` VARCHAR(191) NOT NULL,
    `is_super_admin` BOOLEAN NOT NULL DEFAULT false,
    `permissions_json` JSON NOT NULL,
    `status` ENUM('active', 'deleted') NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `role_name_normalized_key`(`name_normalized`),
    INDEX `role_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `box` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `box_display_id` VARCHAR(191) NOT NULL,
    `vertical_id` VARCHAR(191) NULL,
    `customer_id` VARCHAR(191) NULL,
    `status` ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `vehicle_number` VARCHAR(191) NULL,
    `connection_employee_id` VARCHAR(191) NULL,

    UNIQUE INDEX `box_box_display_id_key`(`box_display_id`),
    INDEX `box_client_id_fkey`(`customer_id`),
    INDEX `box_vertical_id_fkey`(`vertical_id`),
    INDEX `box_connection_employee_id_fkey`(`connection_employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `restaurant` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `city` VARCHAR(191) NULL,
    `google_place_id` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `line_one` VARCHAR(191) NULL,
    `line_two` VARCHAR(191) NULL,
    `longitude` DOUBLE NULL,
    `pincode` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `status` ENUM('active', 'suspended') NOT NULL DEFAULT 'active',

    INDEX `restaurant_client_id_fkey`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vertical_food_employee` (
    `id` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `last_name` VARCHAR(191) NOT NULL,
    `country_code` VARCHAR(191) NOT NULL,
    `mobile_number` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NULL,
    `employee_display_id` VARCHAR(191) NOT NULL,
    `joining_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `client_id` VARCHAR(191) NULL,
    `restaurant_id` VARCHAR(191) NULL,
    `role` ENUM('manager', 'delivery') NOT NULL,
    `status` ENUM('active', 'suspended', 'unassigned') NOT NULL DEFAULT 'unassigned',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `profile_pic` VARCHAR(191) NULL,

    UNIQUE INDEX `vertical_food_employee_email_key`(`email`),
    UNIQUE INDEX `vertical_food_employee_employee_display_id_key`(`employee_display_id`),
    INDEX `vertical_food_employee_client_id_fkey`(`client_id`),
    INDEX `vertical_food_employee_restaurant_id_fkey`(`restaurant_id`),
    UNIQUE INDEX `vertical_food_employee_country_code_mobile_number_key`(`country_code`, `mobile_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vertical_food_employee_box` (
    `id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NULL,
    `box_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `status` ENUM('shared', 'blocked') NOT NULL DEFAULT 'shared',
    `access` ENUM('direct', 'public', 'all_employees') NOT NULL DEFAULT 'direct',

    INDEX `vertical_food_employee_box_box_id_fkey`(`box_id`),
    INDEX `vertical_food_employee_box_employee_id_fkey`(`employee_id`),
    UNIQUE INDEX `vertical_food_employee_box_employee_id_box_id_key`(`employee_id`, `box_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `restaurant_box` (
    `id` VARCHAR(191) NOT NULL,
    `restaurant_id` VARCHAR(191) NOT NULL,
    `box_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `status` ENUM('shared', 'not_shared', 'blocked') NOT NULL DEFAULT 'shared',

    INDEX `restaurant_box_box_id_fkey`(`box_id`),
    INDEX `restaurant_box_restaurant_id_fkey`(`restaurant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vertical_food_employee_deleted` (
    `id` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `last_name` VARCHAR(191) NOT NULL,
    `country_code` VARCHAR(191) NOT NULL,
    `mobile_number` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `employee_display_id` VARCHAR(191) NOT NULL,
    `joining_date` DATETIME(3) NOT NULL,
    `client_name` VARCHAR(191) NOT NULL,
    `role_name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `profile_pic` VARCHAR(191) NULL,
    `client_id` VARCHAR(191) NULL,
    `x_primary_key` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `restaurant_deleted` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NULL,
    `client_name` VARCHAR(191) NULL,
    `manager_id` VARCHAR(191) NULL,
    `manager_name` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `google_place_id` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `line_one` VARCHAR(191) NULL,
    `line_two` VARCHAR(191) NULL,
    `longitude` DOUBLE NULL,
    `pincode` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `x_primary_key` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `box_deleted` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `box_display_id` VARCHAR(191) NOT NULL,
    `vertical_id` VARCHAR(191) NULL,
    `vertical_name` VARCHAR(191) NULL,
    `client_id` VARCHAR(191) NULL,
    `client_name` VARCHAR(191) NULL,
    `vehicle_number` VARCHAR(191) NULL,
    `x_primary_key` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vertical_food_consumer` (
    `id` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `country_code` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `status` ENUM('pending', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
    `client_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `vertical_food_consumer_client_id_fkey`(`client_id`),
    UNIQUE INDEX `vertical_food_consumer_phone_country_code_key`(`phone`, `country_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vertical_food_consumer_box` (
    `id` VARCHAR(191) NOT NULL,
    `consumer_id` VARCHAR(191) NOT NULL,
    `box_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `vertical_food_consumer_box_box_id_fkey`(`box_id`),
    INDEX `vertical_food_consumer_box_consumer_id_fkey`(`consumer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `box_lock` (
    `id` VARCHAR(191) NOT NULL,
    `box_id` VARCHAR(191) NOT NULL,
    `lock_status` ENUM('locked', 'unlocked', 'not_available', 'offline') NOT NULL DEFAULT 'unlocked',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_status` DATETIME(3) NOT NULL,

    UNIQUE INDEX `box_lock_box_id_key`(`box_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification` (
    `id` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `box_id` VARCHAR(191) NULL,
    `box_display_id` VARCHAR(191) NULL,
    `box_name` VARCHAR(191) NULL,
    `restaurant_name` VARCHAR(191) NULL,
    `type` ENUM('warning', 'error', 'success', 'notification') NOT NULL DEFAULT 'notification',
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `is_dismissed` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `notification_client_id_idx`(`client_id`),
    INDEX `notification_box_id_idx`(`box_id`),
    INDEX `notification_is_read_idx`(`is_read`),
    INDEX `notification_is_dismissed_idx`(`is_dismissed`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `box_telemetry_latest` (
    `id` VARCHAR(191) NOT NULL,
    `box_id` VARCHAR(191) NOT NULL,
    `health_status` ENUM('critical', 'healthy', 'attention') NULL DEFAULT 'healthy',
    `power_status` ENUM('on', 'off', 'unknown') NULL DEFAULT 'unknown',
    `battery_percentage` INTEGER NULL,
    `memory_percentage` INTEGER NULL,
    `ext_temp` INTEGER NULL,
    `zone1_temp` INTEGER NULL,
    `zone2_temp` INTEGER NULL,
    `ioniser_status` ENUM('on', 'off', 'unknown') NULL DEFAULT 'unknown',
    `adas_status` ENUM('on', 'off', 'unknown') NULL DEFAULT 'unknown',
    `bluetooth_status` ENUM('on', 'off', 'unknown') NULL DEFAULT 'unknown',
    `camera_status` ENUM('on', 'off', 'unknown') NULL DEFAULT 'unknown',
    `gps_status` ENUM('on', 'off', 'unknown') NULL DEFAULT 'unknown',
    `gyrosensor_status` ENUM('on', 'off', 'unknown') NULL DEFAULT 'unknown',
    `port_big_status` ENUM('on', 'off', 'unknown') NULL DEFAULT 'unknown',
    `port_small_status` ENUM('on', 'off', 'unknown') NULL DEFAULT 'unknown',
    `save_to_memory_status` ENUM('on', 'off', 'unknown') NULL DEFAULT 'unknown',
    `sim_status` ENUM('on', 'off', 'unknown') NULL DEFAULT 'unknown',
    `solar_status` ENUM('on', 'off', 'unknown') NULL DEFAULT 'unknown',
    `turn_signal_status` ENUM('on', 'off', 'unknown') NULL DEFAULT 'unknown',
    `wifi_status` ENUM('on', 'off', 'unknown') NULL DEFAULT 'unknown',
    `advert_screen_status` ENUM('on', 'off', 'unknown') NULL DEFAULT 'unknown',
    `dual_zone_status` ENUM('on', 'off', 'unknown') NULL DEFAULT 'unknown',
    `connection_status` ENUM('connected', 'disconnected', 'unknown') NULL DEFAULT 'unknown',
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `box_telemetry_latest_box_id_key`(`box_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `admin` ADD CONSTRAINT `admin_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client` ADD CONSTRAINT `client_vertical_id_fkey` FOREIGN KEY (`vertical_id`) REFERENCES `vertical`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `faq_category` ADD CONSTRAINT `faq_category_icon_id_fkey` FOREIGN KEY (`icon_id`) REFERENCES `icon`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `faq_category` ADD CONSTRAINT `faq_category_vertical_id_fkey` FOREIGN KEY (`vertical_id`) REFERENCES `vertical`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `faq_question_category` ADD CONSTRAINT `faq_question_category_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `faq_category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `faq_question_category` ADD CONSTRAINT `faq_question_category_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `faq_question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `box` ADD CONSTRAINT `box_connection_employee_id_fkey` FOREIGN KEY (`connection_employee_id`) REFERENCES `vertical_food_employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `box` ADD CONSTRAINT `box_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `box` ADD CONSTRAINT `box_vertical_id_fkey` FOREIGN KEY (`vertical_id`) REFERENCES `vertical`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `restaurant` ADD CONSTRAINT `restaurant_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vertical_food_employee` ADD CONSTRAINT `vertical_food_employee_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vertical_food_employee` ADD CONSTRAINT `vertical_food_employee_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vertical_food_employee_box` ADD CONSTRAINT `vertical_food_employee_box_box_id_fkey` FOREIGN KEY (`box_id`) REFERENCES `box`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vertical_food_employee_box` ADD CONSTRAINT `vertical_food_employee_box_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `vertical_food_employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `restaurant_box` ADD CONSTRAINT `restaurant_box_box_id_fkey` FOREIGN KEY (`box_id`) REFERENCES `box`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `restaurant_box` ADD CONSTRAINT `restaurant_box_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vertical_food_consumer` ADD CONSTRAINT `vertical_food_consumer_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vertical_food_consumer_box` ADD CONSTRAINT `vertical_food_consumer_box_box_id_fkey` FOREIGN KEY (`box_id`) REFERENCES `box`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vertical_food_consumer_box` ADD CONSTRAINT `vertical_food_consumer_box_consumer_id_fkey` FOREIGN KEY (`consumer_id`) REFERENCES `vertical_food_consumer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `box_lock` ADD CONSTRAINT `box_lock_box_id_fkey` FOREIGN KEY (`box_id`) REFERENCES `box`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification` ADD CONSTRAINT `notification_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `box_telemetry_latest` ADD CONSTRAINT `box_telemetry_latest_box_id_fkey` FOREIGN KEY (`box_id`) REFERENCES `box`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
