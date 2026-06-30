import { Hono } from "hono";
import { globalErrorHandler } from "@/middlewares/error";
import { getConfigHandler } from "@/modules/delivery-mobile/handlers/config";
import {
	loginHandler,
	sendOtpHandler,
	verifyOtpHandler,
	sendForgetPasswordOtpHandler,
	verifyForgetPasswordOtpHandler,
	setNewPasswordHandler,
	resetPasswordHandler,
	checkAccountHandler,
	logoutHandler,
	refreshTokenHandler,
} from "@/modules/delivery-mobile/handlers/auth";
import {
	getProfileHandler,
	updateAccountHandler,
	confirmUpdateAccountHandler,
	updateAccountResendOtpHandler,
	transferOwnershipHandler,
	deleteAccountHandler,
	getMyGrubpacsHandler,
	verifyTransferOwnershipHandler,
} from "@/modules/delivery-mobile/handlers/account";
import { getDashboardHandler } from "@/modules/delivery-mobile/handlers/dashboard";
import {
	getSupportCategoriesHandler,
	getSupportQuestionsHandler,
} from "@/modules/delivery-mobile/handlers/support";
import {
	createRestaurantHandler,
	editRestaurantHandler,
	getRestaurantByIdHandler,
	getRestaurantsHandler,
	suspendRestaurantResourcesHandler,
	unassignRestaurantResourcesHandler,
} from "@/modules/delivery-mobile/handlers/restaurant";
import {
	createEmployeeHandler,
	deleteEmployeesHandler,
	getEmployeesHandler,
	reactivateEmployeesHandler,
	suspendEmployeesHandler,
	getEmployeeDropdownsHandler,
} from "@/modules/delivery-mobile/handlers/employee";
import {
	connectBoxHandler,
	disconnectBoxHandler,
	getBoxDetailsHandler,
	listBoxesHandler,
	registerBoxHandler,
	removeBoxHandler,
	requestLockOtpHandler,
	updateBoxSettingsHandler,
	verifyLockOtpHandler,
} from "@/modules/delivery-mobile/handlers/box";

export const deliveryMobileRouter = new Hono();


deliveryMobileRouter.onError(globalErrorHandler);

/**
 * Name: Delivery Mobile Auth Router
 * Description: This router is responsible for handling all the delivery mobile auth things including the clients.
 * Base route: /api/v1/delivery-mobile/auth
 */
deliveryMobileRouter.post("/auth/login", ...loginHandler);
deliveryMobileRouter.post("/auth/send-otp", ...sendOtpHandler);
deliveryMobileRouter.post("/auth/verify-otp", ...verifyOtpHandler);
deliveryMobileRouter.post("/auth/resend-otp", ...sendOtpHandler);
deliveryMobileRouter.post("/auth/forget-password/otp/send", ...sendForgetPasswordOtpHandler);
deliveryMobileRouter.post("/auth/forget-password/otp/verify", ...verifyForgetPasswordOtpHandler);
deliveryMobileRouter.post("/auth/forget-password/set-password", ...setNewPasswordHandler);
deliveryMobileRouter.post("/auth/set-password", ...setNewPasswordHandler);
deliveryMobileRouter.post("/auth/forget-password/otp/resend", ...sendForgetPasswordOtpHandler);
deliveryMobileRouter.post("/auth/reset-password", ...resetPasswordHandler);
deliveryMobileRouter.post("/auth/check-account", ...checkAccountHandler);
deliveryMobileRouter.post("/auth/logout", ...logoutHandler);
deliveryMobileRouter.post("/auth/refresh", ...refreshTokenHandler);


/**
 * Base route: /api/v1/delivery-mobile/account
 */
deliveryMobileRouter.get("/account/me", ...getProfileHandler);
deliveryMobileRouter.get("/profile", ...getProfileHandler);
deliveryMobileRouter.put("/account", ...updateAccountHandler);
deliveryMobileRouter.patch(
	"/account/update/resend-otp",
	...updateAccountResendOtpHandler,
);
deliveryMobileRouter.patch("/account/confirm", ...confirmUpdateAccountHandler);
deliveryMobileRouter.post(
	"/account/transfer-ownership",
	...transferOwnershipHandler,
);
deliveryMobileRouter.post(
	"/account/transfer-ownership/verify",
	...verifyTransferOwnershipHandler,
);
deliveryMobileRouter.get(
	"/account/mygrubpacs",
	...getMyGrubpacsHandler,
);
deliveryMobileRouter.delete("/account", ...deleteAccountHandler);


/**
 * Base route: /api/v1/delivery-mobile/dashboard
 */
deliveryMobileRouter.get("/dashboard", ...getDashboardHandler);


/**
 * Name: Delivery Support Router
 * Description: This router is responsible for handling all the support
 * Base route: /api/v1/delivery-mobile/support
 */
deliveryMobileRouter.get("/support/category", ...getSupportCategoriesHandler);
deliveryMobileRouter.get("/support/faq", ...getSupportQuestionsHandler);

/**
 * Base route: /api/v1/delivery-mobile/employee
 */
deliveryMobileRouter.post("/employee", ...createEmployeeHandler);
deliveryMobileRouter.get("/employee", ...getEmployeesHandler);
deliveryMobileRouter.get("/employee/dropdowns", ...getEmployeeDropdownsHandler);
deliveryMobileRouter.patch("/employee/suspend", ...suspendEmployeesHandler);
deliveryMobileRouter.patch("/employee/reactivate", ...reactivateEmployeesHandler);
deliveryMobileRouter.delete("/employee", ...deleteEmployeesHandler);

/**
 * Base route: /api/v1/delivery-mobile/restaurant
 */
deliveryMobileRouter.post("/restaurant", ...createRestaurantHandler);
deliveryMobileRouter.get("/restaurant", ...getRestaurantsHandler);
deliveryMobileRouter.patch(
	"/restaurant/resource/unassign",
	...unassignRestaurantResourcesHandler,
);
deliveryMobileRouter.patch(
	"/restaurant/resource/suspend",
	...suspendRestaurantResourcesHandler,
);
deliveryMobileRouter.get("/restaurant/:id", ...getRestaurantByIdHandler);
deliveryMobileRouter.put("/restaurant/:id", ...editRestaurantHandler);

/**
 * Base route: /api/v1/delivery-mobile/config
 */
deliveryMobileRouter.get("/config", ...getConfigHandler);

/**
 * Base route: /api/v1/delivery-mobile/boxes
 */
deliveryMobileRouter.get("/boxes", ...listBoxesHandler);
deliveryMobileRouter.post("/boxes", ...registerBoxHandler);
deliveryMobileRouter.get("/boxes/:box_id", ...getBoxDetailsHandler);
deliveryMobileRouter.delete("/boxes/:box_id", ...removeBoxHandler);
deliveryMobileRouter.patch("/boxes/:box_id/settings", ...updateBoxSettingsHandler);
deliveryMobileRouter.post("/boxes/:box_id/connection", ...connectBoxHandler);
deliveryMobileRouter.delete("/boxes/:box_id/connection", ...disconnectBoxHandler);
deliveryMobileRouter.post("/boxes/:box_id/lock/otp", ...requestLockOtpHandler);
deliveryMobileRouter.post("/boxes/:box_id/lock/verify", ...verifyLockOtpHandler);
