-- Rename tables from vertical_food_* to vertical_delivery_* to match Prisma schema
-- This preserves all existing data in the tables

-- Drop foreign keys with old naming (they need to be recreated after rename)
ALTER TABLE `vertical_food_employee` DROP FOREIGN KEY `vertical_food_employee_client_id_fkey`;
ALTER TABLE `vertical_food_employee` DROP FOREIGN KEY `vertical_food_employee_restaurant_id_fkey`;
ALTER TABLE `vertical_food_employee_box` DROP FOREIGN KEY `vertical_food_employee_box_box_id_fkey`;
ALTER TABLE `vertical_food_employee_box` DROP FOREIGN KEY `vertical_food_employee_box_employee_id_fkey`;
ALTER TABLE `vertical_food_consumer` DROP FOREIGN KEY `vertical_food_consumer_client_id_fkey`;

-- Rename tables (RENAME TABLE is non-destructive and preserves all data)
RENAME TABLE `vertical_food_employee` TO `vertical_delivery_employee`;
RENAME TABLE `vertical_food_employee_box` TO `vertical_delivery_employee_box`;
RENAME TABLE `vertical_food_employee_deleted` TO `vertical_delivery_employee_deleted`;
RENAME TABLE `vertical_food_consumer` TO `vertical_delivery_consumer`;

-- Recreate foreign keys with new naming
ALTER TABLE `vertical_delivery_employee` ADD CONSTRAINT `vertical_delivery_employee_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `vertical_delivery_employee` ADD CONSTRAINT `vertical_delivery_employee_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `vertical_delivery_employee_box` ADD CONSTRAINT `vertical_delivery_employee_box_box_id_fkey` FOREIGN KEY (`box_id`) REFERENCES `box`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `vertical_delivery_employee_box` ADD CONSTRAINT `vertical_delivery_employee_box_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `vertical_delivery_employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `vertical_delivery_consumer` ADD CONSTRAINT `vertical_delivery_consumer_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
