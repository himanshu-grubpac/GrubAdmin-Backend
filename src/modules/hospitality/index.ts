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
	hospitalityImpersonateHandler,
} from "hospitality/handlers/auth";
import {
	confirmUpdateAccountHandler,
	getMyAccountHandler,
	updateAccountHandler,
	updateAccountResendOtpHandler,
	deleteAccountHandler,
} from "hospitality/handlers/account";
import {
	createFloorHandler,
	getFloorsHandler,
	getFloorByIdHandler,
	editFloorHandler,
	deleteFloorsHandler,
	suspendFloorsHandler,
	reactivateFloorsHandler,
	searchFloorsHandler,
} from "hospitality/handlers/floor";
import {
	getGrubpacHandler,
	deleteGrubpacHandler,
	actionGrubpacHandler,
	suspendGrubpacHandler,
	reactivateGrubpacHandler,
	searchGrubpacHandler,
	getGrubpacDetailsHandler,
	updateGrubpacHandler,
	reassignGrubpacHandler,
} from "hospitality/handlers/box";
import {
	getNotificationsHandler,
	getNotificationDropdownsHandler,
	getUnreadNotificationsCountHandler,
	markNotificationsHandler,
} from "hospitality/handlers/notification";

export const hospitalityRouter = new Hono();

hospitalityRouter.onError(globalErrorHandler);
hospitalityRouter.use(reqInputsMiddleware);

/* Auth Router */
hospitalityRouter.post("/auth/login", ...loginHandler);
hospitalityRouter.post("/auth/send-otp", ...sendOtpHandler);
hospitalityRouter.post("/auth/verify-otp", ...verifyOtpHandler);
hospitalityRouter.post("/auth/resend-otp", ...resendOtpHandler);
hospitalityRouter.post("/auth/forget-password/send", ...sendForgetPasswordMagicLinkHandler);
hospitalityRouter.post("/auth/forget-password/verify", ...verifyForgetPasswordMagicLinkHandler);
hospitalityRouter.post("/auth/reset-password", ...resetPasswordMagicLinkHandler);
hospitalityRouter.post("/auth/set-password", ...setNewPasswordHandler);
hospitalityRouter.post("/auth/logout", ...logoutHandler);
hospitalityRouter.post("/auth/impersonate", ...hospitalityImpersonateHandler);

/* Account Router */
hospitalityRouter.get("/account/me", ...getMyAccountHandler);
hospitalityRouter.put("/account", ...updateAccountHandler);
hospitalityRouter.patch("/account/update/resend-otp", ...updateAccountResendOtpHandler);
hospitalityRouter.patch("/account/confirm", ...confirmUpdateAccountHandler);
hospitalityRouter.delete("/account", ...deleteAccountHandler);

/* Floor Router */
hospitalityRouter.post("/floor", ...createFloorHandler);
hospitalityRouter.get("/floor", ...getFloorsHandler);
hospitalityRouter.get("/floor/details", ...getFloorByIdHandler);
hospitalityRouter.put("/floor", ...editFloorHandler);
hospitalityRouter.delete("/floor", ...deleteFloorsHandler);
hospitalityRouter.patch("/floor/suspend", ...suspendFloorsHandler);
hospitalityRouter.patch("/floor/reactivate", ...reactivateFloorsHandler);
hospitalityRouter.get("/floor/search", ...searchFloorsHandler);

/* Box (Grubpac) Router */
hospitalityRouter.get("/grubpac", ...getGrubpacHandler);
hospitalityRouter.get("/grubpac/search", ...searchGrubpacHandler);
hospitalityRouter.get("/grubpac/details", ...getGrubpacDetailsHandler);
hospitalityRouter.put("/grubpac", ...updateGrubpacHandler);
hospitalityRouter.patch("/grubpac/reassign", ...reassignGrubpacHandler);
hospitalityRouter.delete("/grubpac", ...deleteGrubpacHandler);
hospitalityRouter.patch("/grubpac/suspend", ...suspendGrubpacHandler);
hospitalityRouter.patch("/grubpac/reactivate", ...reactivateGrubpacHandler);
hospitalityRouter.patch("/grubpac/action", ...actionGrubpacHandler);

/* Notification Router */
hospitalityRouter.get("/notification", ...getNotificationsHandler);
hospitalityRouter.get("/notification/dropdowns", ...getNotificationDropdownsHandler);
hospitalityRouter.get("/notification/count", ...getUnreadNotificationsCountHandler);
hospitalityRouter.patch("/notification", ...markNotificationsHandler);
