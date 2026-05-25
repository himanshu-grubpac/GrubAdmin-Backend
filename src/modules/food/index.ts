import { Hono } from "hono";
import { globalErrorHandler } from "@/middlewares/error";
import { reqInputsMiddleware } from "@/middlewares/req-inputs";
import {
	loginHandler,
	resendOtpHandler,
	sendOtpHandler,
	verifyOtpHandler,
	sendForgetPasswordMagicLinkHandler,
	resetPasswordMagicLinkHandler,
	verifyForgetPasswordMagicLinkHandler,
	setNewPasswordHandler,
	logoutHandler,
} from "food/handlers/auth";
import {
	confirmUpdateAccountHandler,
	getMyAccountHandler,
	updateAccountHandler,
	updateAccountResendOtpHandler,
	transferOwnershipHandler,
	verifyTransferOwnershipHandler,
	getMyGrubpacsHandler,
	deleteAccountHandler,
} from "food/handlers/account";
import {
	getSupportCategoriesHandler,
	getSupportQuestionsHandler,
	searchSupportQuestionsHandler,
	getSupportAnswerHandler,
} from "food/handlers/support";
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
} from "food/handlers/employee";
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
} from "food/handlers/restaurant";
import { getDashboardHandler } from "food/handlers/dashboard";
import {
	getGrubpacHandler,
	deleteGrubpacHandler,
	reassignGrubpacHandler,
	createGrubpacHandler,
	updateGrubpacHandler,
	actionGrubpacHandler,
	getGrubpacDetailsHandler,
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
} from "food/handlers/box";
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
} from "food/handlers/log";
import {
	getNotificationsHandler,
	markNotificationsHandler,
	getUnreadNotificationsCountHandler,
	getNotificationDropdownsHandler,
} from "food/handlers/notification";

export const foodRouter = new Hono();

foodRouter.onError(globalErrorHandler);
foodRouter.use(reqInputsMiddleware);

/* Base route: /api/v1/food/auth */
foodRouter.post("/auth/login", ...loginHandler);
foodRouter.post("/auth/send-otp", ...sendOtpHandler);
foodRouter.post("/auth/verify-otp", ...verifyOtpHandler);
foodRouter.post("/auth/resend-otp", ...resendOtpHandler);
foodRouter.post("/auth/forget-password/send", ...sendForgetPasswordMagicLinkHandler);
foodRouter.post(
	"/auth/forget-password/verify",
	...verifyForgetPasswordMagicLinkHandler,
);
foodRouter.post("/auth/reset-password", ...resetPasswordMagicLinkHandler);
foodRouter.post("/auth/set-password", ...setNewPasswordHandler);
foodRouter.post("/auth/logout", ...logoutHandler);

/* Base route: /api/v1/food/account */
foodRouter.get("/account/me", ...getMyAccountHandler);
foodRouter.put("/account", ...updateAccountHandler);
foodRouter.patch(
	"/account/update/resend-otp",
	...updateAccountResendOtpHandler,
);
foodRouter.patch("/account/confirm", ...confirmUpdateAccountHandler);
foodRouter.post(
	"/account/transfer-ownership",
	...transferOwnershipHandler,
);
foodRouter.post(
	"/account/transfer-ownership/verify",
	...verifyTransferOwnershipHandler,
);
foodRouter.get(
	"/account/mygrubpacs",
	...getMyGrubpacsHandler,
);
foodRouter.delete("/account", ...deleteAccountHandler);

/* Base route: /api/v1/food/dashboard */
foodRouter.get("/dashboard", ...getDashboardHandler);

/**
 * Name: Food Support Router
 * Description: This router is responsible for handling all the support
 * Base route: /api/v1/food/support
 */
foodRouter.get("/support/category", ...getSupportCategoriesHandler);
foodRouter.get("/support/faq", ...getSupportQuestionsHandler);
foodRouter.get("/support/search", ...searchSupportQuestionsHandler);
foodRouter.get("/support/answer", ...getSupportAnswerHandler);

/**
 * Name: Food Employee Router
 * Description: This router is responsible for handling all the actions on their employees
 * Base route: /api/v1/food/employee
 */
foodRouter.post("/employee", ...createEmployeeHandler);
foodRouter.get("/employee", ...getEmployeesHandler);             // ?query&status&role etc.
foodRouter.get("/employee/details", ...getEmployeeByIdHandler); // ?id=...
foodRouter.get("/employee/dropdowns", ...getEmployeeDropdownsHandler);
foodRouter.get("/employee/search", ...searchEmployeesHandler);
foodRouter.patch("/employee/suspend", ...suspendEmployeesHandler);
foodRouter.patch("/employee/reactivate", ...reactivateEmployeesHandler);
foodRouter.put("/employee", ...updateEmployeeHandler);           // body: { id, ... }
foodRouter.patch("/employee/reassign", ...reassignEmployeeHandler); // body: { id, ... }
foodRouter.delete("/employee", ...deleteEmployeesHandler);

/**
 * Name: Food Restaurant Router
 * Description: This router is responsible for handling all the actions on their restaurants
 * Base route: /api/v1/food/restaurant
 */
foodRouter.post("/restaurant", ...createRestaurantHandler);
foodRouter.get("/restaurant", ...getRestaurantsHandler);                    // ?query&status etc.
foodRouter.get("/restaurant/details", ...getRestaurantByIdHandler);         // ?id=...
foodRouter.get("/restaurant/employees", ...getRestaurantEmployeesHandler);  // ?id=...&status=...
foodRouter.get("/restaurant/delete-summary", ...getDeleteSummaryHandler);
foodRouter.get("/restaurant/reassignment-candidates", ...getReassignmentCandidatesHandler);
foodRouter.post("/restaurant/reassign/validate", ...validateReassignmentHandler);
foodRouter.patch("/restaurant/resource/suspend", ...suspendRestaurantResourcesHandler);
foodRouter.patch("/restaurant/suspend", ...suspendRestaurantResourcesHandler);
foodRouter.patch("/restaurant/reactivate", ...reactivateRestaurantsHandler);
foodRouter.put("/restaurant", ...editRestaurantHandler);                    // body: { id, ... }
foodRouter.patch("/restaurant/manager", ...assignRestaurantManagerHandler); // body: { id, manager_id }
foodRouter.patch("/restaurant/resource/reassign", ...reassignRestaurantHandler);     // body: { id, ... }
foodRouter.delete("/restaurant", ...deleteRestaurantsHandler);              // body: { ids, suspended_only? }
foodRouter.delete("/restaurant/employees", ...deleteRestaurantEmployeesHandler); // body: { id, employee_ids }
foodRouter.patch("/restaurant/assign", ...assignEmployeesHandler);
foodRouter.get("/restaurant/search", ...searchRestaurantsHandler);

/**
 * Name: Food Grubpac (Box) Router
 * Description: This router is responsible for handling all the actions on their boxes
 * Base route: /api/v1/food/grubpac
 */
foodRouter.get("/grubpac", ...getGrubpacHandler);
foodRouter.get("/grubpac/search", ...searchGrubpacHandler);
foodRouter.delete("/grubpac", ...deleteGrubpacHandler);
foodRouter.patch("/grubpac/reassign", ...reassignGrubpacHandler);
foodRouter.patch("/grubpac/reassign/employee", ...reassignBoxEmployeeHandler);
foodRouter.patch("/grubpac/block/employee", ...blockBoxEmployeeHandler);
foodRouter.patch("/grubpac/remove/employee", ...removeBoxEmployeeHandler);
// foodRouter.post("/grubpac", ...createGrubpacHandler);
foodRouter.put("/grubpac", ...updateGrubpacHandler);
foodRouter.patch("/grubpac/action", ...actionGrubpacHandler);
foodRouter.get("/grubpac/details", ...getGrubpacDetailsHandler);
foodRouter.get("/grubpac/dropdowns", ...getGrubpacDropdownsHandler);
foodRouter.patch("/grubpac/suspend", ...suspendGrubpacHandler);
foodRouter.patch("/grubpac/reactivate", ...reactivateGrubpacHandler);
foodRouter.get("/grublock", ...getGrublockHandler);
foodRouter.get("/grublock/search", ...searchGrublockHandler);
foodRouter.get("/grublock/details", ...getGrublockDetailsHandler);
foodRouter.patch("/grublock/lock", ...lockGrublockHandler);
foodRouter.patch("/grublock/unlock", ...unlockGrublockHandler);
foodRouter.patch("/grublock/unlock/verify", ...verifyUnlockGrublockHandler);
foodRouter.patch("/grublock/emergency_unlock", ...emergencyUnlockGrublockHandler);

foodRouter.get("/logs/dropdowns", ...getLogDropdownsHandler);
foodRouter.post("/logs", ...searchSystemLogsHandler);

foodRouter.post("/restaurant/logs", ...postRestaurantLogsHandler);
foodRouter.get("/restaurant/logs/dropdowns", ...getRestaurantLogsDropdownsHandler);

foodRouter.post("/employee/logs", ...postEmployeeLogsHandler);
foodRouter.get("/employee/logs/dropdowns", ...getEmployeeLogsDropdownsHandler);

foodRouter.post("/grubpac/logs", ...postGrubpacLogsHandler);
foodRouter.get("/grubpac/logs/dropdowns", ...getGrubpacLogsDropdownsHandler);

foodRouter.post("/grublock/logs", ...postGrublockLogsHandler);
foodRouter.get("/grublock/logs/dropdowns", ...getGrublockLogsDropdownsHandler);

/**
 * Name: Notification Router
 * Description: GrubPac (box) notifications for the authenticated client
 * Base route: /api/v1/food/notification
 */
foodRouter.get("/notification", ...getNotificationsHandler);
foodRouter.get("/notification/dropdowns", ...getNotificationDropdownsHandler);
foodRouter.get("/notification/count", ...getUnreadNotificationsCountHandler);
foodRouter.patch("/notification", ...markNotificationsHandler);
