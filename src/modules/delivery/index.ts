import { Hono } from "hono";
import { globalErrorHandler } from "@/middlewares/error";
import { reqInputsMiddleware } from "@/middlewares/req-inputs";
import { createDeliveryRateLimits } from "delivery/middlewares/delivery-rate-limit";
import {
	loginHandler,
	deliveryImpersonateHandler,
	resendOtpHandler,
	sendOtpHandler,
	verifyOtpHandler,
	sendForgetPasswordMagicLinkHandler,
	resetPasswordMagicLinkHandler,
	verifyForgetPasswordMagicLinkHandler,
	setNewPasswordHandler,
	logoutHandler,
} from "delivery/handlers/auth";
import {
	confirmUpdateAccountHandler,
	getMyAccountHandler,
	updateAccountHandler,
	updateAccountResendOtpHandler,
	transferOwnershipHandler,
	verifyTransferOwnershipHandler,
	getMyGrubpacsHandler,
	deleteAccountHandler,
	requestDeleteAccountOtpHandler,
	resendDeleteAccountOtpHandler,
} from "delivery/handlers/account";
import {
	getSupportCategoriesHandler,
	getSupportQuestionsHandler,
	searchSupportQuestionsHandler,
	getSupportAnswerHandler,
	downloadSupportAttachmentHandler,
} from "delivery/handlers/support";
import {
	createEmployeeHandler,
	deleteEmployeesHandler,
	getEmployeesHandler,
	getEmployeeByIdHandler,
	updateEmployeeHandler,
	reactivateEmployeesHandler,
	suspendEmployeesHandler,
	getEmployeeDropdownsHandler,
	reassignEmployeeHandler,
	searchEmployeesHandler,
	getEmployeeSuspendedSummaryHandler,
} from "delivery/handlers/employee";
import {
	createRestaurantHandler,
	editRestaurantHandler,
	getRestaurantByIdHandler,
	getRestaurantsHandler,
	suspendRestaurantResourcesHandler,
	deleteRestaurantsHandler,
	reactivateRestaurantsHandler,
	assignRestaurantManagerHandler,
	getRestaurantEmployeesHandler,
	deleteRestaurantEmployeesHandler,
	reassignRestaurantHandler,
	assignEmployeesHandler,
	searchRestaurantsHandler,
	getDeleteSummaryHandler,
	getReassignmentCandidatesHandler,
	validateReassignmentHandler,
	getRestaurantSuspendedSummaryHandler,
} from "delivery/handlers/restaurant";
import { getDashboardHandler } from "delivery/handlers/dashboard";
import {
	getGrubpacHandler,
	deleteGrubpacHandler,
	reassignGrubpacHandler,
	createGrubpacHandler,
	updateGrubpacHandler,
	actionGrubpacHandler,
	getGrubpacDetailsHandler,
	getGrubpacEditDetailsHandler,
	getGrublockHandler,
	getGrubpacDropdownsHandler,
	suspendGrubpacHandler,
	reactivateGrubpacHandler,
	searchGrubpacHandler,
	searchGrublockHandler,
	getGrublockDetailsHandler,
	lockGrublockHandler,
	unlockGrublockHandler,
	emergencyUnlockGrublockHandler,
	verifyUnlockGrublockHandler,
	reassignBoxEmployeeHandler,
	blockBoxEmployeeHandler,
	removeBoxEmployeeHandler,
	getGrubpacSuspendedSummaryHandler,
} from "delivery/handlers/box";
import { 
	postRestaurantLogsHandler,
	getRestaurantLogsDropdownsHandler,
	postEmployeeLogsHandler, 
	getEmployeeLogsDropdownsHandler,
	postGrubpacLogsHandler,
	getGrubpacLogsDropdownsHandler,
	postGrublockLogsHandler,
	getGrublockLogsDropdownsHandler,
	searchSystemLogsHandler,
	getLogDropdownsHandler
} from "delivery/handlers/log";
import {
	getNotificationsHandler,
	markNotificationsHandler,
	getUnreadNotificationsCountHandler,
	getNotificationDropdownsHandler,
} from "delivery/handlers/notification";

export const deliveryRouter = new Hono();

const limits = createDeliveryRateLimits();

deliveryRouter.onError(globalErrorHandler);
deliveryRouter.use(reqInputsMiddleware);
deliveryRouter.use("*", limits.general);

/* Base route: /api/v1/delivery/auth */
deliveryRouter.post("/auth/login", limits.auth, ...loginHandler);
deliveryRouter.post("/auth/send-otp", limits.auth, ...sendOtpHandler);
deliveryRouter.post("/auth/verify-otp", limits.auth, ...verifyOtpHandler);
deliveryRouter.post("/auth/resend-otp", limits.auth, ...resendOtpHandler);
deliveryRouter.post(
	"/auth/forget-password/send",
	limits.auth,
	...sendForgetPasswordMagicLinkHandler,
);
deliveryRouter.post(
	"/auth/forget-password/verify",
	limits.auth,
	...verifyForgetPasswordMagicLinkHandler,
);
deliveryRouter.post("/auth/reset-password", limits.auth, ...resetPasswordMagicLinkHandler);
deliveryRouter.post("/auth/set-password", limits.auth, ...setNewPasswordHandler);
deliveryRouter.post("/auth/logout", ...logoutHandler);
deliveryRouter.post("/auth/impersonate", limits.auth, ...deliveryImpersonateHandler);

/* Base route: /api/v1/delivery/account */
deliveryRouter.get("/account/me", ...getMyAccountHandler);
deliveryRouter.put("/account", ...updateAccountHandler);
deliveryRouter.patch(
	"/account/update/resend-otp",
	...updateAccountResendOtpHandler,
);
deliveryRouter.patch("/account/confirm", ...confirmUpdateAccountHandler);
deliveryRouter.post(
	"/account/transfer-ownership",
	...transferOwnershipHandler,
);
deliveryRouter.post(
	"/account/transfer-ownership/verify",
	...verifyTransferOwnershipHandler,
);
deliveryRouter.get(
	"/account/mygrubpacs",
	...getMyGrubpacsHandler,
);
deliveryRouter.post("/account/delete/otp", ...requestDeleteAccountOtpHandler);
deliveryRouter.patch("/account/delete/resend-otp", ...resendDeleteAccountOtpHandler);
deliveryRouter.delete("/account", ...deleteAccountHandler);

/* Base route: /api/v1/delivery/dashboard */
deliveryRouter.get("/dashboard", ...getDashboardHandler);

/**
 * Name: Delivery Support Router
 * Description: This router is responsible for handling all the support
 * Base route: /api/v1/delivery/support
 */
deliveryRouter.get("/support/category", ...getSupportCategoriesHandler);
deliveryRouter.get("/support/faq", ...getSupportQuestionsHandler);
deliveryRouter.get("/support/search", ...searchSupportQuestionsHandler);
deliveryRouter.get("/support/answer", ...getSupportAnswerHandler);
deliveryRouter.get("/support/faq/attachment/download", ...downloadSupportAttachmentHandler);

/**
 * Name: Delivery Employee Router
 * Description: This router is responsible for handling all the actions on their employees
 * Base route: /api/v1/delivery/employee
 */
deliveryRouter.post("/employee", ...createEmployeeHandler);
deliveryRouter.get("/employee", ...getEmployeesHandler);             // ?query&status&role etc.
deliveryRouter.get("/employee/details", ...getEmployeeByIdHandler); // ?id=...
deliveryRouter.get("/employee/dropdowns", ...getEmployeeDropdownsHandler);
deliveryRouter.get("/employee/search", ...searchEmployeesHandler);
deliveryRouter.get("/employee/suspended/summary", ...getEmployeeSuspendedSummaryHandler);
deliveryRouter.patch("/employee/suspend", ...suspendEmployeesHandler);
deliveryRouter.patch("/employee/reactivate", ...reactivateEmployeesHandler);
deliveryRouter.put("/employee", ...updateEmployeeHandler);           // body: { id, ... }
deliveryRouter.patch("/employee/reassign", ...reassignEmployeeHandler); // body: { id, ... }
deliveryRouter.delete("/employee", ...deleteEmployeesHandler);

/**
 * Name: Delivery Restaurant Router
 * Description: This router is responsible for handling all the actions on their restaurants
 * Base route: /api/v1/delivery/restaurant
 */
deliveryRouter.post("/restaurant", ...createRestaurantHandler);
deliveryRouter.get("/restaurant", ...getRestaurantsHandler);                    // ?query&status etc.
deliveryRouter.get("/restaurant/details", ...getRestaurantByIdHandler);         // ?id=...
deliveryRouter.get("/restaurant/employees", ...getRestaurantEmployeesHandler);  // ?id=...&status=...
deliveryRouter.get("/restaurant/delete-summary", ...getDeleteSummaryHandler);
deliveryRouter.get("/restaurant/suspended/summary", ...getRestaurantSuspendedSummaryHandler);
deliveryRouter.get("/restaurant/reassignment-candidates", ...getReassignmentCandidatesHandler);
deliveryRouter.post("/restaurant/reassign/validate", ...validateReassignmentHandler);
deliveryRouter.patch("/restaurant/resource/suspend", ...suspendRestaurantResourcesHandler);
deliveryRouter.patch("/restaurant/suspend", ...suspendRestaurantResourcesHandler);
deliveryRouter.patch("/restaurant/reactivate", ...reactivateRestaurantsHandler);
deliveryRouter.put("/restaurant", ...editRestaurantHandler);                    // body: { id, ... }
deliveryRouter.patch("/restaurant/manager", ...assignRestaurantManagerHandler); // body: { id, manager_id }
deliveryRouter.patch("/restaurant/resource/reassign", ...reassignRestaurantHandler);     // body: { id, ... }
deliveryRouter.delete("/restaurant", ...deleteRestaurantsHandler);              // body: { ids, suspended_only? }
deliveryRouter.delete("/restaurant/employees", ...deleteRestaurantEmployeesHandler); // body: { id, employee_ids }
deliveryRouter.patch("/restaurant/assign", ...assignEmployeesHandler);
deliveryRouter.get("/restaurant/search", ...searchRestaurantsHandler);

/**
 * Name: Delivery Grubpac (Box) Router
 * Description: This router is responsible for handling all the actions on their boxes
 * Base route: /api/v1/delivery/grubpac
 */
deliveryRouter.get("/grubpac", ...getGrubpacHandler);
deliveryRouter.get("/grubpac/search", ...searchGrubpacHandler);
deliveryRouter.get("/grubpac/suspended/summary", ...getGrubpacSuspendedSummaryHandler);
deliveryRouter.delete("/grubpac", ...deleteGrubpacHandler);
deliveryRouter.patch("/grubpac/reassign", ...reassignGrubpacHandler);
deliveryRouter.patch("/grubpac/reassign/employee", ...reassignBoxEmployeeHandler);
deliveryRouter.patch("/grubpac/block/employee", ...blockBoxEmployeeHandler);
deliveryRouter.patch("/grubpac/remove/employee", ...removeBoxEmployeeHandler);
// deliveryRouter.post("/grubpac", ...createGrubpacHandler);
deliveryRouter.put("/grubpac", ...updateGrubpacHandler);
deliveryRouter.patch("/grubpac/action", ...actionGrubpacHandler);
deliveryRouter.get("/grubpac/details", ...getGrubpacDetailsHandler);
deliveryRouter.get("/grubpac/edit-details", ...getGrubpacEditDetailsHandler);
deliveryRouter.get("/grubpac/dropdowns", ...getGrubpacDropdownsHandler);
deliveryRouter.patch("/grubpac/suspend", ...suspendGrubpacHandler);
deliveryRouter.patch("/grubpac/reactivate", ...reactivateGrubpacHandler);
deliveryRouter.get("/grublock", ...getGrublockHandler);
deliveryRouter.get("/grublock/search", ...searchGrublockHandler);
deliveryRouter.get("/grublock/details", ...getGrublockDetailsHandler);
deliveryRouter.patch("/grublock/lock", ...lockGrublockHandler);
deliveryRouter.patch("/grublock/unlock", ...unlockGrublockHandler);
deliveryRouter.patch("/grublock/unlock/verify", ...verifyUnlockGrublockHandler);
deliveryRouter.patch("/grublock/emergency_unlock", ...emergencyUnlockGrublockHandler);

deliveryRouter.get("/logs/dropdowns", ...getLogDropdownsHandler);
deliveryRouter.post("/logs", ...searchSystemLogsHandler);

deliveryRouter.post("/restaurant/logs", ...postRestaurantLogsHandler);
deliveryRouter.get("/restaurant/logs/dropdowns", ...getRestaurantLogsDropdownsHandler);

deliveryRouter.post("/employee/logs", ...postEmployeeLogsHandler);
deliveryRouter.get("/employee/logs/dropdowns", ...getEmployeeLogsDropdownsHandler);

deliveryRouter.post("/grubpac/logs", ...postGrubpacLogsHandler);
deliveryRouter.get("/grubpac/logs/dropdowns", ...getGrubpacLogsDropdownsHandler);

deliveryRouter.post("/grublock/logs", ...postGrublockLogsHandler);
deliveryRouter.get("/grublock/logs/dropdowns", ...getGrublockLogsDropdownsHandler);

/**
 * Name: Notification Router
 * Description: GrubPac (box) notifications for the authenticated client
 * Base route: /api/v1/delivery/notification
 */
deliveryRouter.get("/notification", ...getNotificationsHandler);
deliveryRouter.get("/notification/dropdowns", ...getNotificationDropdownsHandler);
deliveryRouter.get("/notification/count", ...getUnreadNotificationsCountHandler);
deliveryRouter.patch("/notification", ...markNotificationsHandler);
