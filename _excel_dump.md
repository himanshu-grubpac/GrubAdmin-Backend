# List of common API's_endpoint .xlsx

## Sheet names

- `Common APIS`
- `Admin`
- `Hospitality`

## Sheet: Common APIS

**Dimensions:** 117 rows × 8 columns

| Module  | Endpoint | Method | Admin | Delivery | Medical | Hospitality | Description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Groups  | POST /groups | POST  | Absent | present | present | present | Creates a new group.  |
| Groups  | GET /groups | GET  | Absent | present | present | present | Paginated list with filters: query, status, manager, driver, box. Supports group_by=boxes to split into "with boxes" / "without boxes" groups. |
| Groups  | GET /groups/details | GET  | Absent | present | present | present | Fetches a single groups full details by ?id=.... |
| Groups  | GET /groups/delete-summary | GET  | Absent | present | present | present but only grubpacs | Shows employee_count, box_count, and whether reassign_required before deleting a group. |
| Groups  | GET /groups/reassignment-candidates | GET  | Absent | present | present | present | Lists active groups(excluding current) as potential destinations for reassigning employees/boxes. |
| Groups  | POST /groups/reassign/validate | POST  | Absent | present | present | present | Checks if reassigning from group_ids[] to destination_group_id is valid (e.g., no manager conflicts). |
| Groups  | PATCH /groups/resource/suspend | PATCH  | Absent | present | present | present | Suspends only the resources (employees + boxes) of groups, not the group itself. Can reassign resources to another groups. |
| Groups  | PATCH /groups/suspend | PATCH  | Absent | present | present | present | Suspends groups by ids[]. Optionally reassigns their employees/boxes to a destination_group_id. |
| Groups  | PATCH /groups/reactivate | PATCH  | Absent | present | present | present | Reactivates groups by ids[]. Can also reactivate_employees and reactivate_boxes at the same time. |
| Groups  | PUT /groups | PUT  | Absent | present | present but group name and status | present but group name and status | Updates name, address, location, status. Managers can only edit their own group . Logs change history. |
| Groups  | PATCH /groups/resource/reassign | PATCH  | Absent | present | present | present | Bulk moves employees and/or boxes from group_ids[] to a destination_group_ids. If destination is null, resources are unassigned instead. |
| Groups  | DELETE /groups | DELETE  | Absent | present | present | present | Bulk deletes groups by ids[]. Optionally reassigns employees/boxes to a destination_groups_id. |
| Groups  | PATCH /groups/assign | PATCH  | Absent | present | present but only employees(no manager or driver) | Absent | Assigns employee_ids[] to a group with a given role (driver/manager). |
| Groups  | GET /groups/search | GET  | Absent | present | present | present | Lightweight search returning id, name, status, box_count — for dropdowns/autocomplete. |
| GrubPac | POST /grubpac | POST | present | absent | absent | absent | Creates a new box/grubpac |
| GrubPac | GET /grubpac | GET | present | present | present | present | Lists boxes/grubpacs |
| GrubPac | PUT /grubpac | PUT | present | present | present | present | Updates a box/grubpac |
| GrubPac | DELETE /grubpac | DELETE | present | present | present | present | Deletes boxes/grubpacs |
| GrubPac | PATCH /grubpac/assign | PATCH | present | absent | absent | absent | Assigns boxes to groups |
| GrubPac | PATCH /grubpac/assign/remove | PATCH | present | absent | absent | absent | Unassigns boxes from groups |
| GrubPac | GET /grubpac/search | GET | absent | present | present | present | Searches grubpacs |
| GrubPac | GET /grubpac/details | GET | absent | present | present | present | Gets grubpac details by ID |
| GrubPac | GET /grubpac/dropdowns | GET | absent | present | present | present | Gets grubpac dropdown options |
| GrubPac | PATCH /grubpac/reassign | PATCH | absent | present | present | present | Reassigns grubpac to another restaurant |
| GrubPac | PATCH /grubpac/reassign/employee | PATCH | absent | present | present | absent | Reassigns an employee to a grubpac |
| GrubPac | PATCH /grubpac/block/employee | PATCH | absent | present | present | absent | Blocks an employee from a grubpac |
| GrubPac | PATCH /grubpac/remove/employee | PATCH | absent | present | present | absent | Removes an employee from a grubpac |
| GrubPac | PATCH /grubpac/action | PATCH | absent | present | present | present | Performs an action on a grubpac |
| GrubPac | PATCH /grubpac/suspend | PATCH | absent | present | present | present | Suspends a grubpac |
| GrubPac | PATCH /grubpac/reactivate | PATCH | absent | present | present | present | Reactivates a grubpac |
| GrubPac | POST /grubpac/logs | POST | absent | present | present | present | Fetches grubpac audit logs |
| GrubPac | GET /grubpac/logs/dropdowns | GET | absent | present | present | present | Gets log filter dropdowns |
| GrubLock | GET /grublock | GET | absent | present | present | present | Lists grublocks |
| GrubLock | GET /grublock/search | GET | absent | present | present | present | Searches grublocks |
| GrubLock | GET /grublock/details | GET | absent | present | present | present | Gets grublock details |
| GrubLock | PATCH /grublock/lock | PATCH | absent | present | present | present | Locks a grublock |
| GrubLock | PATCH /grublock/unlock | PATCH | absent | present | present | present | Unlocks a grublock |
| GrubLock | PATCH /grublock/unlock/verify | PATCH | absent | present | present | present | Verifies unlock OTP |
| GrubLock | PATCH /grublock/emergency_unlock | PATCH | absent | present | present | present | Emergency unlocks a grublock |
| GrubLock | POST /grublock/logs | POST | absent | present | present | present | Fetches grublock audit logs |
| GrubLock | GET /grublock/logs/dropdowns | GET | absent | present | present | present | Gets grublock log filter dropdowns |
| Auth | POST /auth/login | POST | present | present | present | present | Login with credentials |
| Auth | POST /auth/logout | POST | present | present | present | present | Logout & invalidate session |
| Auth | POST /auth/send-otp | POST | present | present | present | present | Send OTP for verification |
| Auth | POST /auth/verify-otp | POST | present | present | present | present | Verify OTP |
| Auth | POST /auth/resend-otp | POST | present | present | present | present | Resend OTP |
| Auth | GET /auth/verify-authenticated | GET | present | absent | present | present | Check if session is still valid |
| Auth | POST /auth/reset-password/otp/send | POST | present | absent | present | present | Send reset password OTP |
| Auth | POST /auth/reset-password/otp/resend | POST | present | absent | present | present | Resend reset password OTP |
| Auth | POST /auth/reset-password/confirm | POST | present | absent | present | present | Confirm reset password with OTP |
| Auth | POST /auth/forget-password/send | POST | present | present | present | present | Send forget password magic link |
| Auth | POST /auth/forget-password/verify | POST | present | present | present | present | Verify forget password magic link |
| Auth | POST /auth/reset-password | POST | present | present | present | present | Reset password via magic link |
| Auth | POST /auth/set-password | POST | present | present | present | present | Set new password after first login |
| Auth | POST /auth/impersonate | POST | present | absent | absent | absent | Impersonate a delivery account |
| Profile | GET /account/me | GET | present | present | present | present | Retrieve active user profile details |
| Profile | PUT /account | PUT | present | present | present | present | Update user account details |
| Profile | PATCH /account/update/resend-otp | PATCH | present | present | present | present | Resend verification OTP code for account update |
| Profile | PATCH /account/confirm | PATCH | present | present | present | present | Confirm user account update with OTP |
| Profile | GET /account/delete-eligibility | GET | present | absent | absent | absent | Check if admin account can be deleted |
| Profile | POST /account/transfer-ownership | POST | absent | present | present | present | Initiate ownership transfer of client account |
| Profile | POST /account/transfer-ownership/verify | POST | absent | present | present | present | Confirm account ownership transfer |
| profile | POST /account/transfer-entire-account | POST | absent | absent | absent | present | Transfers entire account ownership to another user |
| Profile | GET /account/mygrubpacs | GET | absent | present | present | present | Retrieve list of user's assigned boxes |
| Profile | DELETE /account | DELETE | absent | present | present | present | Delete client account |
| Employee | POST /employee | POST | present | present | present | absent | Creates a new employee |
| Employee | GET /employee | GET | present | present | present | absent | Lists employees |
| Employee | PUT /employee | PUT | present | present | present | absent | Updates an employee |
| Employee | DELETE /employee | DELETE | present | present | present | absent | Deletes employees |
| Employee | PATCH /employee/suspend | PATCH | present | present | present | absent | Suspends employees |
| Employee | PATCH /employee/reactivate | PATCH | present | present | present | absent | Reactivates employees |
| Employee | GET /employee/details | GET | absent | present | present | absent | Gets employee by ID |
| Employee | GET /employee/dropdowns | GET | absent | present | present | absent | Gets employee dropdown options |
| Employee | GET /employee/search | GET | absent | present | present | absent | Searches employees |
| Employee | PATCH /employee/reassign | PATCH | absent | present | present | absent | Reassigns employee to another restaurant |
| Employee | POST /employee/logs | POST | absent | present | present | absent | Fetches employee audit logs |
| Employee | GET /employee/logs/dropdowns | GET | absent | present | present | absent | Gets log filter dropdowns |
| Employee | PATCH /employee/assign-role/bulk | PATCH | present | absent | present | absent | Bulk assigns roles to employees |
| Employee | GET /employee/export | GET | present | absent | present | absent | Exports employee data |
| Support | GET /support/category | GET | absent | present | present | present | Retrieve support categories |
| Support | GET /support/faq | GET | absent | present | present | present | Retrieve support FAQ questions |
| Support | GET /support/search | GET | absent | present | present | present | Search support FAQs |
| Support | GET /support/answer | GET | absent | present | present | present | View details of support FAQ answer |
| Support | GET /support/faq/attachment/download | GET | absent | present | present | present | Download files attached to support FAQs |
| Support | POST /faq-category | POST | present | absent | absent | absent | Create FAQ category (Admin) |
| Support | GET /faq-category | GET | present | absent | absent | absent | List all FAQ categories (Admin) |
| Support | PATCH /faq-category/reorder | PATCH | present | absent | absent | absent | Reorder FAQ categories (Admin) |
| Support | PATCH /faq-category/suspend | PATCH | present | absent | absent | absent | Suspend FAQ categories (Admin) |
| Support | PATCH /faq-category/reactivate | PATCH | present | absent | absent | absent | Reactivate suspended FAQ categories (Admin) |
| Support | PUT /faq-category | PUT | present | absent | absent | absent | Update FAQ category details (Admin) |
| Support | DELETE /faq-category | DELETE | present | absent | absent | absent | Delete FAQ categories (Admin) |
| Support | POST /faq | POST | present | absent | absent | absent | Create FAQ question (Admin) |
| Support | GET /faq | GET | present | absent | absent | absent | List all FAQ questions (Admin) |
| Support | PUT /faq | DELETE | present | absent | absent | absent | Delete FAQ questions (Admin) |
| Support | DELETE /faq | PUT | present | absent | absent | absent | Update FAQ details (Admin) |
| Support | GET /faq/:id | PUT | present | absent | absent | absent | Modify specific FAQ question (Admin) |
| Support | PATCH /faq/status/toggle | PATCH | present | absent | absent | absent | Toggle FAQ draft/publishing status (Admin) |
| Support | PATCH /faq/suspend | PATCH | present | absent | absent | absent | Suspend FAQ questions (Admin) |
| Support | PATCH /faq/reactivate | PATCH | present | absent | absent | absent | Reactivate FAQ questions (Admin) |
| Support | PATCH /faq/change-category/bulk | PATCH | present | absent | absent | absent | Bulk move support FAQs to different categories (Admin) |
| Export | GET /customer/export | GET | present | absent | absent | absent | Export all client/customer accounts (Admin) |
| Export | GET /admin/export | GET | present | absent | absent | absent | Export administrator user data (Admin) |
| Export | GET /faq-category/export | GET | present | absent | absent | absent | Export FAQ categories database (Admin) |
| Export | GET /faq/export | GET | present | absent | absent | absent | Export support FAQ questions and answers (Admin) |
| Notifications | GET /notifications | GET | present | absent | absent | absent | Fetch admin notifications (Admin) |
| Notifications | PATCH /notifications | PATCH | present | absent | absent | absent | Mark admin notifications as read (Admin) |
| Notifications | GET /notification | GET | absent | present | present | absent | Fetch client notifications (Restaurant / Medical) |
| Notifications | PATCH /notification | PATCH | absent | present | present | absent | Mark client notifications as read (Restaurant / Medical) |
| Notifications | GET /notification/dropdowns | GET | absent | present | present | absent | Get query options for notifications |
| Notifications | GET /notification/count | GET | absent | present | present | absent | Get unread notifications count |
| Dashboard | GET /dashboard | GET | absent | present | present | present | Fetch portal statistics and metrics |
| System | /common/permissions | GET | present | present | present | present | Retrieve the system-wide permissions list config. |
| System | /common/icons | GET | present | present | present | present | Fetch UI icon files and assets configurations. |
| System | /common/health | GET | present | present | present | present | Core server connection health check. |
| System | /common/healthz | GET | present | present | present | present | Core server liveness status check. |
| System | /common/readyz | GET | present | present | present | present | Verify Prisma and MongoDB readiness states. |

## Sheet: Admin

**Dimensions:** 41 rows × 4 columns

| Module | Endpoint | Method | Description |
| --- | --- | --- | --- |
| Client | POST /customer | POST | Creates a new client/customer account |
| Client | GET /customer | GET | Lists all clients with pagination & filters |
| Client | GET /customer/export | GET | Exports client data |
| Client | GET /customer/:id | GET | Gets client details by ID |
| Client | PATCH /customer/:id | PATCH | Updates client account details |
| Client | DELETE /customer/:id | DELETE | Deletes a client account |
| Client | PATCH /customer/:id/status | PATCH | Patches client status (active/suspended/dismissed) |
| Client | POST /customer/:id/impersonate | POST | Impersonates a client account |
| Client | POST /customer/exit-impersonation | POST | Exits impersonation mode |
| Config | POST /config | POST | Creates application configuration |
| Vertical | POST /vertical | POST | Creates a new vertical |
| Vertical | GET /vertical | GET | Lists all verticals |
| Vertical | DELETE /vertical/:id | DELETE | Deletes a vertical |
| Icon | POST /icon | POST | Creates/upload icons |
| FAQ | GET /faq/export | GET | Exports FAQ questions |
| Role | POST /role | POST | Creates a new role |
| Role | GET /role | GET | Lists all roles |
| Role | PUT /role/:id | PUT | Updates a role by ID |
| Role | DELETE /role/:id | DELETE | Deletes a role |
| Logs | GET /logs | GET | Fetches admin audit logs |
| GrubPac | POST /box | POST | Creates a new box/grubpac |
| GrubPac | PATCH /box/assign | PATCH | Assigns boxes to groups |
| GrubPac | PATCH /box/assign/remove | PATCH | Unassigns boxes from groups |
| Profile | GET /account/delete-eligibility | GET | Check if admin account can be deleted |
| Support | POST /faq-category | POST | Create FAQ category (Admin) |
| Support | GET /faq-category | GET | List all FAQ categories (Admin) |
| Support | PATCH /faq-category/reorder | PATCH | Reorder FAQ categories (Admin) |
| Support | PATCH /faq-category/suspend | PATCH | Suspend FAQ categories (Admin) |
| Support | PATCH /faq-category/reactivate | PATCH | Reactivate suspended FAQ categories (Admin) |
| Support | PUT /faq-category | PUT | Update FAQ category details (Admin) |
| Support | DELETE /faq-category | DELETE | Delete FAQ categories (Admin) |
| Support | POST /faq | POST | Create FAQ question (Admin) |
| Support | GET /faq | GET | List all FAQ questions (Admin) |
| Support | PUT /faq | PUT | Update FAQ details (Admin) |
| Support | DELETE /faq | DELETE | Delete FAQ questions (Admin) |
| Support | GET /faq/:id | GET | Get specific FAQ question by ID (Admin) |
| Support | PATCH /faq/status/toggle | PATCH | Toggle FAQ draft/publishing status (Admin) |
| Support | PATCH /faq/suspend | PATCH | Suspend FAQ questions (Admin) |
| Support | PATCH /faq/reactivate | PATCH | Reactivate FAQ questions (Admin) |
| Support | PATCH /faq/change-category/bulk | PATCH | Bulk move support FAQs to different categories (Admin) |

## Sheet: Hospitality

**Dimensions:** 0 rows × 0 columns

_Empty sheet._

---

# Vertical Comparison sheet.xlsx

## Sheet names

- `Grubpacs`
- `Employees`
- `Support`
- `System logs`
- `Notification`
- `Accounts`
- `Groups`
- `Clients`
- `Grublock`

## Sheet: Grubpacs

**Dimensions:** 23 rows × 26 columns

| Grubpacs | Admin | Delivery | Medical | Hospitality | Difference | Status | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 | Column 20 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Add box | yes | No | No | No | only Admin can add box |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Grouped as Assigned/Unassigned by default | Yes | Powered On/Off | Powered On/Off | Powered On/Off | Only admin has assigned option |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Powered on/off | Assigned / Unassigned | Yes | Yes | Yes | there is no power status in admin |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Groupby | Vertical | Restaurant and Unassigned | Department(eg Blood bank) And Unassigned | Floors And Unassigned |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Box details | basic details+ client info, vertical, status, updated on | basic details + lock/unlock,power, battery, settings, handler, bike No,  | same but no Bike Number  | all details,id,room,power,setting,added on |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| edit box details | Boxid, name, verticals, status(active/Inactive) |  restaurant, assigned vehicle, manage permission | department,manage permission | assigned group, assigned room | admin and hospitality dont have check permissions |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Remove assignment | yes | no | no | no | admin can remove box assignment from a client |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| check permission | no | yes | yes | no | admin and hospitality dont have check permissions |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| view settings | no  | yes | yes | yes | admin dont have box settings |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| suspend box | no | yes | yes | yes | admin can not suspend box |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| delete box | yes | no | no | no | box can be only deleted by admin |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| remove box | no | yes | yes | yes | admin cannot remove box |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Transfer Ownership | no | yes | yes | yes | only verticals have transfer ownership |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| search box | yes | yes | yes | yes |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Activate Box | no | yes | yes | yes | box can be activated from suspend status in verticals only |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reassign box to  | client | Restaurant | Department(eg Blood bank) | group | admin can reassign/assign box to client while verticals can assign/reassign boxes to their departments only |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| settings | No | connections(wifi, Bt, 4G, gps) + box(power,grublock, ioniser, dualzone, Ext. thermostat sensor, gyrosensor) +  camera+ lights + storage + power | connections(wifi, Bt, 4G, gps) + box(power,grublock, ioniser, dualzone, Ext. thermostat sensor, gyrosensor) +  camera+ lights + storage + power | connections(wifi, Bt, 4G, gps) + box(power,grublock, ioniser, dualzone, Ext. thermostat sensor, gyrosensor)+power | there is no box settings in admin , hospitality has limited settings |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| edit settings | No | power, Ioniser,dualzone,box cam, Advert screen | power, Ioniser,dualzone,box cam, Advert screen | power , Ioniser, dualZone | editing settings option is only there in verticals with limited access |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Box logs | No | yes | yes | yes | log of boxes are there in verticals only |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Track | No | yes | yes | No | only delivery, and medical has trackign option |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Watch live cam | NO | yes | yes | No | only delivery, and medical has cam option |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Multi-Select | Remove box Assignment(if assigned ), Assign to client (if not assigned), Delete | Power, Ioniser, Temp, More , Delete | Power, Ioniser, Temp, More , Delete | Power, Ioniser, Temp, More , Delete | only admin has remove box assignment and assign to client option and admin doesn't have box settings option |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Sheet: Employees

**Dimensions:** 19 rows × 26 columns

| Employees | Admin | Delivery | Medical | Hospitality | Difference | Status | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 | Column 13 | Column 14 | Column 15 | Column 16 | Column 17 | Column 18 | Column 19 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Add new employee | Yes | Yes | Yes | Absent | Admin- EmpID, assigned location, joining date(optional),  Delivery & medical- Assigned restaurant, assigned department (optional) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Roles | Yes | Yes | Yes | Absent | Admin- (Superadmin, admin) and Delivery & Medical- (Driver and manager) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Create a new role | Yes | No | No | Absent | Only Grubadmin has manage roles |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Edit role details | Yes | No | No | Absent | Only Grubadmin has manage roles |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Delete role | Yes | No | No | Absent | Only Grubadmin has manage roles |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Suspend Employee | Yes | Yes | Yes | Absent | Admin(Group as per role),Delivery and Medical(Grouped) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Delete Employee | Yes | Yes | Yes | Absent |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Group  | Yes | Yes | Yes | Absent | Admin- as per role and Delivery & Medical- as per restaurant & Department |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Export employee list | Yes | No | No | Absent | Only Grubadmin has Export employees list |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Activate all employees | yes | yes | yes | Absent |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Activate employee | yes | yes | yes | Absent |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reassign | No | yes | yes | Absent | Delivery- reassign to restaurant & Medical- reassign to department |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Edit employee details | yes | yes | yes | Absent |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| All boxes | No | yes | yes | Absent | Only Delivery And Medical Have "All Boxes" Option In Employee Section |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Remove boxes | No | Yes | yes | Absent |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Search box | Yes | Yes | Yes | Absent |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Dismissed employee | Yes | No | No | Absent | Only Admin Has Dissmissed employee  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Multi-select | Reasssign Role, Suspend Selection, Delete | Reassign Restraunt, Suspend Selection, Delete | Reassign Department, Suspend Selection, Delete | Absent |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Sheet: Support

**Dimensions:** 14 rows × 7 columns

| Support | Admin | Delivery | Medical | Hospitality | Difference | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Add a new category | Yes | No | No | No |  |  |
| Reorder Categories | Yes | No | No | No |  |  |
| Export | Yes | No | No | No |  |  |
| Edit category | Yes | No | No | No |  |  |
| Suspend category | Yes | No | No | No |  |  |
| Delete category | Yes | No | No | No |  |  |
| Add a new FAQ | Yes | No | No | No |  |  |
| Edit FAQ | Yes | No | No | No |  |  |
| Change category | Yes | No | No | No |  |  |
| Delete FAQ | Yes  | No | No | No |  |  |
| Write to us | No | Yes | Yes | Yes |  |  |
| Search box | Yes | Yes | Yes | Yes |  |  |
| Filter  | Yes | No | No | No |  |  |

## Sheet: System logs

**Dimensions:** 3 rows × 7 columns

| System logs | Admin | Delivery | Medical | Hospitality | Difference | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Export | Yes | Yes | Yes | Yes |  |  |
| Search  | Yes | Yes | Yes | Yes |  |  |

## Sheet: Notification

**Dimensions:** 6 rows × 7 columns

| Notification | Admin | Delivery | Medical | Hospitality | Difference | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Dismiss | Yes | Yes | Yes | Yes |  |  |
| Dismiss all | Yes | Yes | Yes | Yes |  |  |
| View all | Yes | Yes | Yes | Yes |  |  |
| Multiselect(mark as read) | Yes | Yes | Yes | Yes |  |  |
| Search  | Yes | Yes | Yes | Yes |  |  |

## Sheet: Accounts

**Dimensions:** 7 rows × 7 columns

| Accounts | Admin | Delivery | Medical | Hospitality | Difference | Status |
| --- | --- | --- | --- | --- | --- | --- |
| login using password | Yes | Yes | Yes | Yes |  |  |
| login using Otp | Yes | Yes | Yes | Yes |  |  |
| Edit Profile | basic details, assigned location, joining date, contact details, email, password | basic details, contact details, email, password, organisation | basic details, contact details, email, password, organisation | basic details, contact details, email, password, organisation |  |  |
| Delete Account | Yes | Yes | Yes | Yes |  |  |
| Transfer ownership | No | transfer select box, transfer all boxes | transfer select box, transfer all boxes, transfer complete account | transfer select box, transfer all boxes, transfer complete account | In complete account transfer all resources(grubpacs, departments, employees, previous logs, settings) are transfer to another account |  |
| Logout | Yes | Yes | Yes | Yes |  |  |

## Sheet: Groups

**Dimensions:** 13 rows × 7 columns

| Groups | Admin | Delivery | Medical | Hospitality | Difference | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Home page | Absent | Restaurant with/without boxes | Medical with/without boxes | Groups with/without boxes | Delivery has add manager option, medical and hospitality dont have,  |  |
| Add new | Absent | Restaurant    | Department | Floors(groups) | Restaurant has name, address, maps,status,medical,hospitality has name status |  |
| Edit details | Absent | Restaurant name, address,status | Department name, status | Group name, status | in medical and hospitality we have popups  |  |
| Delete  | Absent | delete single restaurant, delete multiple restaurant | delete department | delete groups(floors) |  |  |
| Reassign | Absent | Reassign to new restaurant | Reassign to new department | Reassign to new group |  |  |
| View list - box | Absent | yes | yes | yes |  |  |
| View list - Employees | Absent | yes | yes | No |  |  |
| Edit list | Absent | yes | yes | yes |  |  |
| suspend  | Absent | suspend restaurant | suspend department | Group(floors) |  |  |
| View Suspended | Absent | yes | yes | yes |  |  |
| Activate/Activate all | Absent | yes | yes | yes | in Delivery we reassign them to restaurant, in medical we reassign them to department, in hospitality we reassign them to groups(floors) |  |
|  Delete from suspended | Absent | yes | yes | yes | in delete from suspended we delete their respective groups |  |

## Sheet: Clients

**Dimensions:** 9 rows × 3 columns

| Clients | Admin | Status |
| --- | --- | --- |
| Add a new client | Yes |  |
| Group as vertical | Yes |  |
| Export | Yes |  |
| Access complete account | Yes |  |
| view logs | Yes |  |
| check FAQs | Yes |  |
| check Grubpacs | Yes |  |
| search box | Yes |  |

## Sheet: Grublock

**Dimensions:** 16 rows × 8 columns

| Grublock | Admin | Delivery | Medical | Hospitality | Status |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| View all boxes | Absent | Yes | Yes | Absent |  |  |  |
| Box locked  | Absent | Yes | Yes | Absent |  |  |  |
| Box unlocked | Absent | Yes | Yes | Absent |  |  |  |
| view details | Absent | Yes | Yes | Absent |  |  |  |
| view in grubpacs list | Absent | Yes | Yes | Absent |  |  |  |
| Group | Absent | Yes | Yes | Absent |  |  |  |
| show unlocked boxes | Absent | Yes | Yes | Absent |  |  |   |
| Restaurant detail | Absent | Yes | Yes | Absent |  |  |  |
| Remove employees | Absent | Yes | Yes | Absent |  |  |  |
| Remove grubpacs | Absent | Yes | Yes | Absent |  |  |  |
| Delete restaurant | Absent | Yes | Yes | Absent |  |  |  |
| Search box | Absent | Yes | Yes | Absent |  |  |  |
| unlock box | Absent | Yes | Yes | Absent |  |  |  |
| Lock box | Absent | Yes | Yes | Absent |  |  |  |
| Emergency unlock | Absent | Yes | Yes | Absent |  |  |  |

---
