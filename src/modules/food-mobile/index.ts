import { Hono } from "hono";
import { globalErrorHandler } from "@/middlewares/error";
import { getConfigHandler } from "@/modules/food-mobile/handlers/config";
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
} from "@/modules/food-mobile/handlers/auth";
import {
	getProfileHandler,
	updateAccountHandler,
	confirmUpdateAccountHandler,
	updateAccountResendOtpHandler,
	transferOwnershipHandler,
	deleteAccountHandler,
	getMyGrubpacsHandler,
	verifyTransferOwnershipHandler,
} from "@/modules/food-mobile/handlers/account";
import { getDashboardHandler } from "@/modules/food-mobile/handlers/dashboard";
import {
	getSupportCategoriesHandler,
	getSupportQuestionsHandler,
} from "@/modules/food-mobile/handlers/support";
import {
	createRestaurantHandler,
	editRestaurantHandler,
	getRestaurantByIdHandler,
	getRestaurantsHandler,
	suspendRestaurantResourcesHandler,
	unassignRestaurantResourcesHandler,
} from "@/modules/food-mobile/handlers/restaurant";
import {
	createEmployeeHandler,
	deleteEmployeesHandler,
	getEmployeesHandler,
	reactivateEmployeesHandler,
	suspendEmployeesHandler,
	getEmployeeDropdownsHandler,
} from "@/modules/food-mobile/handlers/employee";

export const foodMobileRouter = new Hono();


foodMobileRouter.onError(globalErrorHandler);

/**
 * Name: Food Mobile Auth Router
 * Description: This router is responsible for handling all the food mobile auth things including the clients.
 * Base route: /api/v1/food-mobile/auth
 */
foodMobileRouter.post("/auth/login", ...loginHandler);
foodMobileRouter.post("/auth/send-otp", ...sendOtpHandler);
foodMobileRouter.post("/auth/verify-otp", ...verifyOtpHandler);
foodMobileRouter.post("/auth/resend-otp", ...sendOtpHandler);
foodMobileRouter.post("/auth/forget-password/otp/send", ...sendForgetPasswordOtpHandler);
foodMobileRouter.post("/auth/forget-password/otp/verify", ...verifyForgetPasswordOtpHandler);
foodMobileRouter.post("/auth/forget-password/set-password", ...setNewPasswordHandler);
foodMobileRouter.post("/auth/set-password", ...setNewPasswordHandler);
foodMobileRouter.post("/auth/forget-password/otp/resend", ...sendForgetPasswordOtpHandler);
foodMobileRouter.post("/auth/reset-password", ...resetPasswordHandler);
foodMobileRouter.post("/auth/check-account", ...checkAccountHandler);
foodMobileRouter.post("/auth/logout", ...logoutHandler);


/**
 * Base route: /api/v1/food-mobile/account
 */
foodMobileRouter.get("/account/me", ...getProfileHandler);
foodMobileRouter.get("/profile", ...getProfileHandler);
foodMobileRouter.put("/account", ...updateAccountHandler);
foodMobileRouter.patch(
	"/account/update/resend-otp",
	...updateAccountResendOtpHandler,
);
foodMobileRouter.patch("/account/confirm", ...confirmUpdateAccountHandler);
foodMobileRouter.post(
	"/account/transfer-ownership",
	...transferOwnershipHandler,
);
foodMobileRouter.post(
	"/account/transfer-ownership/verify",
	...verifyTransferOwnershipHandler,
);
foodMobileRouter.get(
	"/account/mygrubpacs",
	...getMyGrubpacsHandler,
);
foodMobileRouter.delete("/account", ...deleteAccountHandler);


/**
 * Base route: /api/v1/food-mobile/dashboard
 */
foodMobileRouter.get("/dashboard", ...getDashboardHandler);


/**
 * Name: Food Support Router
 * Description: This router is responsible for handling all the support
 * Base route: /api/v1/food-mobile/support
 */
foodMobileRouter.get("/support/category", ...getSupportCategoriesHandler);
foodMobileRouter.get("/support/faq", ...getSupportQuestionsHandler);

/**
 * Base route: /api/v1/food-mobile/employee
 */
foodMobileRouter.post("/employee", ...createEmployeeHandler);
foodMobileRouter.get("/employee", ...getEmployeesHandler);
foodMobileRouter.get("/employee/dropdowns", ...getEmployeeDropdownsHandler);
foodMobileRouter.patch("/employee/suspend", ...suspendEmployeesHandler);
foodMobileRouter.patch("/employee/reactivate", ...reactivateEmployeesHandler);
foodMobileRouter.delete("/employee", ...deleteEmployeesHandler);

/**
 * Base route: /api/v1/food-mobile/restaurant
 */
foodMobileRouter.post("/restaurant", ...createRestaurantHandler);
foodMobileRouter.get("/restaurant", ...getRestaurantsHandler);
foodMobileRouter.patch(
	"/restaurant/resource/unassign",
	...unassignRestaurantResourcesHandler,
);
foodMobileRouter.patch(
	"/restaurant/resource/suspend",
	...suspendRestaurantResourcesHandler,
);
foodMobileRouter.get("/restaurant/:id", ...getRestaurantByIdHandler);
foodMobileRouter.put("/restaurant/:id", ...editRestaurantHandler);

/**
 * Base route: /api/v1/food-mobile/config
 */
foodMobileRouter.get("/config", ...getConfigHandler);
