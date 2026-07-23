-- =============================================================================
-- vertical_email_registry — run on ONLINE MySQL (after taking a backup)
-- Enforces: one email per vertical across clients + employees
-- Same email across different verticals remains allowed
-- =============================================================================

-- 0) Optional: audit duplicates BEFORE creating unique index / backfill
-- If any row returns, fix/rename those emails first (test data: safe to delete/rename).

SELECT LOWER(TRIM(email)) AS email, vertical_id, COUNT(*) AS cnt
FROM client
WHERE email IS NOT NULL AND TRIM(email) <> '' AND vertical_id IS NOT NULL
GROUP BY LOWER(TRIM(email)), vertical_id
HAVING cnt > 1;

SELECT LOWER(TRIM(e.email)) AS email, c.vertical_id, COUNT(*) AS cnt
FROM vertical_delivery_employee e
JOIN client c ON c.id = e.client_id
WHERE e.email IS NOT NULL AND TRIM(e.email) <> '' AND c.vertical_id IS NOT NULL
GROUP BY LOWER(TRIM(e.email)), c.vertical_id
HAVING cnt > 1;

SELECT LOWER(TRIM(e.email)) AS email, c.vertical_id, COUNT(*) AS cnt
FROM vertical_medical_employee e
JOIN client c ON c.id = e.client_id
WHERE e.email IS NOT NULL AND TRIM(e.email) <> '' AND c.vertical_id IS NOT NULL
GROUP BY LOWER(TRIM(e.email)), c.vertical_id
HAVING cnt > 1;

SELECT LOWER(TRIM(e.email)) AS email, c.vertical_id, COUNT(*) AS cnt
FROM vertical_hospitality_employee e
JOIN client c ON c.id = e.client_id
WHERE e.email IS NOT NULL AND TRIM(e.email) <> '' AND c.vertical_id IS NOT NULL
GROUP BY LOWER(TRIM(e.email)), c.vertical_id
HAVING cnt > 1;

-- Cross-table collisions (same email used by client AND employee in same vertical)
SELECT LOWER(TRIM(x.email)) AS email, x.vertical_id, COUNT(*) AS cnt
FROM (
  SELECT email, vertical_id FROM client
  WHERE email IS NOT NULL AND TRIM(email) <> '' AND vertical_id IS NOT NULL
  UNION ALL
  SELECT e.email, c.vertical_id
  FROM vertical_delivery_employee e
  JOIN client c ON c.id = e.client_id
  WHERE e.email IS NOT NULL AND TRIM(e.email) <> '' AND c.vertical_id IS NOT NULL
  UNION ALL
  SELECT e.email, c.vertical_id
  FROM vertical_medical_employee e
  JOIN client c ON c.id = e.client_id
  WHERE e.email IS NOT NULL AND TRIM(e.email) <> '' AND c.vertical_id IS NOT NULL
  UNION ALL
  SELECT e.email, c.vertical_id
  FROM vertical_hospitality_employee e
  JOIN client c ON c.id = e.client_id
  WHERE e.email IS NOT NULL AND TRIM(e.email) <> '' AND c.vertical_id IS NOT NULL
) x
GROUP BY LOWER(TRIM(x.email)), x.vertical_id
HAVING cnt > 1;

-- 1) Create table
CREATE TABLE IF NOT EXISTS `vertical_email_registry` (
  `id` VARCHAR(26) NOT NULL,
  `vertical_id` VARCHAR(26) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `owner_type` ENUM('client', 'delivery_employee', 'medical_employee', 'hospitality_employee') NOT NULL,
  `owner_id` VARCHAR(26) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vertical_email_registry_vertical_id_email_key` (`vertical_id`, `email`),
  UNIQUE KEY `vertical_email_registry_owner_type_owner_id_key` (`owner_type`, `owner_id`),
  KEY `vertical_email_registry_email_idx` (`email`),
  CONSTRAINT `vertical_email_registry_vertical_id_fkey`
    FOREIGN KEY (`vertical_id`) REFERENCES `vertical`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2) Backfill (ids use compact UUID hex — fine for existing rows; app creates ULIDs going forward)
-- Clients
INSERT INTO `vertical_email_registry` (`id`, `vertical_id`, `email`, `owner_type`, `owner_id`, `created_at`, `updated_at`)
SELECT
  LEFT(REPLACE(UUID(), '-', ''), 26),
  `vertical_id`,
  LOWER(TRIM(`email`)),
  'client',
  `id`,
  NOW(3),
  NOW(3)
FROM `client`
WHERE `email` IS NOT NULL AND TRIM(`email`) <> '' AND `vertical_id` IS NOT NULL
ON DUPLICATE KEY UPDATE `updated_at` = VALUES(`updated_at`);

-- Delivery employees
INSERT INTO `vertical_email_registry` (`id`, `vertical_id`, `email`, `owner_type`, `owner_id`, `created_at`, `updated_at`)
SELECT
  LEFT(REPLACE(UUID(), '-', ''), 26),
  c.`vertical_id`,
  LOWER(TRIM(e.`email`)),
  'delivery_employee',
  e.`id`,
  NOW(3),
  NOW(3)
FROM `vertical_delivery_employee` e
JOIN `client` c ON c.`id` = e.`client_id`
WHERE e.`email` IS NOT NULL AND TRIM(e.`email`) <> '' AND c.`vertical_id` IS NOT NULL
ON DUPLICATE KEY UPDATE `updated_at` = VALUES(`updated_at`);

-- Medical employees
INSERT INTO `vertical_email_registry` (`id`, `vertical_id`, `email`, `owner_type`, `owner_id`, `created_at`, `updated_at`)
SELECT
  LEFT(REPLACE(UUID(), '-', ''), 26),
  c.`vertical_id`,
  LOWER(TRIM(e.`email`)),
  'medical_employee',
  e.`id`,
  NOW(3),
  NOW(3)
FROM `vertical_medical_employee` e
JOIN `client` c ON c.`id` = e.`client_id`
WHERE e.`email` IS NOT NULL AND TRIM(e.`email`) <> '' AND c.`vertical_id` IS NOT NULL
ON DUPLICATE KEY UPDATE `updated_at` = VALUES(`updated_at`);

-- Hospitality employees (skip if table not present in your env)
INSERT INTO `vertical_email_registry` (`id`, `vertical_id`, `email`, `owner_type`, `owner_id`, `created_at`, `updated_at`)
SELECT
  LEFT(REPLACE(UUID(), '-', ''), 26),
  c.`vertical_id`,
  LOWER(TRIM(e.`email`)),
  'hospitality_employee',
  e.`id`,
  NOW(3),
  NOW(3)
FROM `vertical_hospitality_employee` e
JOIN `client` c ON c.`id` = e.`client_id`
WHERE e.`email` IS NOT NULL AND TRIM(e.`email`) <> '' AND c.`vertical_id` IS NOT NULL
ON DUPLICATE KEY UPDATE `updated_at` = VALUES(`updated_at`);

-- 3) Sanity check
SELECT owner_type, COUNT(*) AS rows_count FROM vertical_email_registry GROUP BY owner_type;
