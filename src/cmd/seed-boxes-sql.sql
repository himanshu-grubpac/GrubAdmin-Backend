-- Seed: Connect boxes to the test client and restaurant
-- Run this against: mysql://avnadmin:...@grubtest01-grubpac-test01.h.aivencloud.com:18771/defaultdb

-- Step 1: Set box.customer_id (Prisma calls it client_id) for both boxes
UPDATE box SET customer_id = '01KS0QHF59ZHVEVA64E4ZXSSE7'
WHERE id IN ('01KS0QHHJ44X3J2XTJM9HYG67X', '01KS0QHHTKCEDAY5GRT5J2X8TX');

-- Step 2: Mark both restaurant_box rows as 'shared' so the manager sees them as permitted
UPDATE restaurant_box SET status = 'shared'
WHERE restaurant_id = '01KS0QHFCQQP64WXY9RBNANCKT'
  AND box_id IN ('01KS0QHHJ44X3J2XTJM9HYG67X', '01KS0QHHTKCEDAY5GRT5J2X8TX');

-- Step 3: Connect GP-CP02 (active box) to the first active driver
--   First, find active drivers:
--   SELECT id, first_name, last_name FROM vertical_delivery_employee
--   WHERE client_id = '01KS0QHF59ZHVEVA64E4ZXSSE7' AND role = 'delivery' AND status != 'suspended';
--
--   If there are active drivers, run:
-- UPDATE box SET connection_employee_id = '<driver_id>'
-- WHERE id = '01KS0QHHTKCEDAY5GRT5J2X8TX';

-- Verify:
SELECT id, box_display_id, customer_id, status, connection_employee_id FROM box
WHERE id IN ('01KS0QHHJ44X3J2XTJM9HYG67X', '01KS0QHHTKCEDAY5GRT5J2X8TX');

SELECT rb.box_id, rb.restaurant_id, rb.status, b.box_display_id FROM restaurant_box rb
JOIN box b ON b.id = rb.box_id
WHERE rb.restaurant_id = '01KS0QHFCQQP64WXY9RBNANCKT';
