-- Drop hospitality employee junction tables first (depend on employee)
DROP TABLE IF EXISTS `vertical_hospitality_employee_box`;
DROP TABLE IF EXISTS `vertical_hospitality_employee_deleted`;

-- Remove FK and column from box table before dropping employee
ALTER TABLE `box` DROP FOREIGN KEY IF EXISTS `box_hospitality_connection_employee_id_fkey`;
ALTER TABLE `box` DROP INDEX IF EXISTS `box_hospitality_connection_employee_id_fkey`;
ALTER TABLE `box` DROP COLUMN IF EXISTS `hospitality_connection_employee_id`;

-- Drop the main hospitality employee table
DROP TABLE IF EXISTS `vertical_hospitality_employee`;

-- Clean up the vertical_email_owner_type enum if it references hospitality_employee
-- Note: MySQL ENUM values cannot be removed with ALTER without redefining the column.
-- This requires: ALTER TABLE vertical_email_registry MODIFY owner_type ENUM('client','delivery_employee','medical_employee') NOT NULL;
-- Only run if vertical_email_registry has no rows with owner_type = 'hospitality_employee'
