-- Add display_order column to vertical table for explicit ordering
ALTER TABLE `vertical` ADD COLUMN `display_order` INT NOT NULL DEFAULT 999;

-- Set display_order for known verticals
UPDATE `vertical` SET `display_order` = 1 WHERE LOWER(`name`) = 'delivery';
UPDATE `vertical` SET `display_order` = 2 WHERE LOWER(`name`) = 'medical';
UPDATE `vertical` SET `display_order` = 3 WHERE LOWER(`name`) = 'hospitality';
UPDATE `vertical` SET `display_order` = 4 WHERE LOWER(`name`) = 'camping';
