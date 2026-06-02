-- ============================================================
-- Database Integrity & Verification Queries
-- Run these against the MySQL database to validate state
-- ============================================================

-- 1. ROLES: Verify all seeded roles exist with correct permissions
SELECT id, name, name_normalized, is_super_admin, status,
       JSON_PRETTY(permissions_json) as permissions
FROM role
ORDER BY name;

-- 2. ADMINS: Verify all seeded admin users
SELECT a.id, a.first_name, a.last_name, a.email, a.status,
       r.name as role_name, r.is_super_admin
FROM admin a
LEFT JOIN role r ON a.role_id = r.id
ORDER BY a.created_at;

-- 3. VERTICALS: Verify all seeded verticals
SELECT id, name, status FROM vertical ORDER BY name;

-- 4. CLIENTS: Verify all clients with their vertical assignments
SELECT c.id, c.name, c.client_display_id, c.email, c.status,
       v.name as vertical_name,
       (SELECT COUNT(*) FROM box b WHERE b.client_id = c.id) as box_count,
       (SELECT COUNT(*) FROM vertical_food_employee e WHERE e.client_id = c.id) as employee_count,
       (SELECT COUNT(*) FROM restaurant r WHERE r.client_id = c.id) as restaurant_count
FROM client c
LEFT JOIN vertical v ON c.vertical_id = v.id
ORDER BY c.created_at;

-- 5. Find clients with NULL vertical_id (orphaned)
SELECT id, name, email, status
FROM client
WHERE vertical_id IS NULL;

-- 6. Find clients with vertical_id pointing to non-existent vertical
SELECT c.id, c.name, c.vertical_id
FROM client c
LEFT JOIN vertical v ON c.vertical_id = v.id
WHERE v.id IS NULL;

-- 7. EMPLOYEES (vertical_food_employee): Verify all records
SELECT e.id, e.first_name, e.last_name, e.email, e.employee_display_id,
       e.role, e.status,
       c.name as client_name, c.id as client_id,
       r.name as restaurant_name
FROM vertical_food_employee e
LEFT JOIN client c ON e.client_id = c.id
LEFT JOIN restaurant r ON e.restaurant_id = r.id
ORDER BY e.created_at;

-- 8. Find employees with NULL client_id (orphaned)
SELECT id, first_name, last_name, email, role, status
FROM vertical_food_employee
WHERE client_id IS NULL;

-- 9. Find employees with client_id pointing to non-existent client
SELECT e.id, e.first_name, e.last_name, e.email, e.client_id
FROM vertical_food_employee e
LEFT JOIN client c ON e.client_id = c.id
WHERE c.id IS NULL;

-- 10. Find employees with duplicate emails (should not exist due to @@unique constraint)
SELECT email, COUNT(*) as cnt
FROM vertical_food_employee
GROUP BY email
HAVING COUNT(*) > 1;

-- 11. Find employees with same email as their client (potential conflict)
SELECT e.id as employee_id, e.email, e.first_name, e.last_name,
       c.id as client_id, c.name as client_name
FROM vertical_food_employee e
JOIN client c ON e.client_id = c.id AND e.email = c.email;

-- 12. DUPLICATE EMAIL CHECK: Admin vs Client vs Employee cross-table
SELECT 'admin' as source, email FROM admin WHERE email IS NOT NULL
UNION ALL
SELECT 'client', email FROM client WHERE email IS NOT NULL
UNION ALL
SELECT 'employee', email FROM vertical_food_employee WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;

-- 13. INACTIVE/SUSPENDED accounts
SELECT 'client' as type, name as display_name, email, status
FROM client WHERE status IN ('suspended', 'inactive')
UNION ALL
SELECT 'employee', CONCAT(first_name, ' ', last_name), email, status
FROM vertical_food_employee WHERE status IN ('suspended', 'unassigned')
UNION ALL
SELECT 'admin', CONCAT(first_name, ' ', last_name), email, status
FROM admin WHERE status IN ('suspended', 'unassigned')
ORDER BY type;

-- 14. RESTAURANTS: Verify ownership
SELECT r.id, r.name, r.status, r.city, r.state,
       c.name as client_name,
       (SELECT COUNT(*) FROM vertical_food_employee e WHERE e.restaurant_id = r.id) as employee_count,
       (SELECT COUNT(*) FROM restaurant_box rb WHERE rb.restaurant_id = r.id) as box_count
FROM restaurant r
LEFT JOIN client c ON r.client_id = c.id
ORDER BY r.created_at;

-- 15. Find restaurants with NULL or invalid client_id
SELECT r.id, r.name, r.client_id
FROM restaurant r
LEFT JOIN client c ON r.client_id = c.id
WHERE c.id IS NULL;

-- 16. BOXES: Verify ownership
SELECT b.id, b.name, b.box_display_id, b.status, b.vehicle_number,
       c.name as client_name, v.name as vertical_name,
       e.first_name as connected_employee_first_name, e.last_name as connected_employee_last_name
FROM box b
LEFT JOIN client c ON b.client_id = c.id
LEFT JOIN vertical v ON b.vertical_id = v.id
LEFT JOIN vertical_food_employee e ON b.connection_employee_id = e.id
ORDER BY b.created_at;

-- 17. Find boxes with NULL client_id
SELECT id, box_display_id, name, status
FROM box
WHERE client_id IS NULL;

-- 18. Find boxes with client_id pointing to non-existent client
SELECT b.id, b.box_display_id, b.client_id
FROM box b
LEFT JOIN client c ON b.client_id = c.id
WHERE c.id IS NULL;

-- 19. EMPLOYEE-BOX assignments (vertical_food_employee_box)
SELECT eb.id, e.first_name, e.last_name, e.email,
       b.box_display_id, eb.status, eb.access
FROM vertical_food_employee_box eb
JOIN vertical_food_employee e ON eb.employee_id = e.id
JOIN box b ON eb.box_id = b.id
ORDER BY e.first_name;

-- 20. BOX-LOCKS: Verify each box has at most one lock
SELECT b.id, b.box_display_id,
       bl.id as lock_id, bl.lock_status
FROM box b
LEFT JOIN box_lock bl ON bl.box_id = b.id;

-- 21. Find boxes with duplicate locks
SELECT box_id, COUNT(*) as lock_count
FROM box_lock
GROUP BY box_id
HAVING COUNT(*) > 1;

-- 22. SESSIONS / TOKENS: Check MongoDB collections (run in MongoDB shell)
-- db.admin_update_otp.find().pretty()
-- db.food_employee_otp.find().pretty()
-- db.otp.find().pretty()
-- db.otp_attempt.find().pretty()

-- 23. FULL INTEGRITY: Complete chain check
-- Client -> Employees -> Restaurants -> Boxes
SELECT 
    c.name as client_name,
    c.status as client_status,
    COUNT(DISTINCT e.id) as employee_count,
    COUNT(DISTINCT r.id) as restaurant_count,
    COUNT(DISTINCT b.id) as box_count
FROM client c
LEFT JOIN vertical_food_employee e ON e.client_id = c.id
LEFT JOIN restaurant r ON r.client_id = c.id
LEFT JOIN box b ON b.client_id = c.id
GROUP BY c.id, c.name, c.status
ORDER BY c.created_at;

-- 24. PERMISSION SUMMARY: Show all unique permissions across roles
SELECT r.name as role_name,
       r.is_super_admin,
       JSON_KEYS(r.permissions_json) as permission_topics
FROM role r
ORDER BY r.name;

-- 25. NOTIFICATIONS: Verify client associations
SELECT n.id, n.title, n.type, n.is_read, n.is_dismissed,
       c.name as client_name, c.id as client_id
FROM notification n
LEFT JOIN client c ON n.client_id = c.id
ORDER BY n.created_at DESC;
