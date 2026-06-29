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
	transferOwnershipHandler,
	verifyTransferOwnershipHandler,
	transferEntireAccountHandler,
	verifyTransferEntireAccountHandler,
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
import {
	getSupportCategoriesHandler,
	getSupportQuestionsHandler,
	searchSupportQuestionsHandler,
	getSupportAnswerHandler,
	downloadSupportAttachmentHandler,
} from "hospitality/handlers/support";
import {
	postGrubpacLogsHandler,
	getGrubpacLogsDropdownsHandler,
} from "hospitality/handlers/log";
import {
	getDashboardHandler,
} from "hospitality/handlers/dashboard";

export const hospitalityRouter = new Hono();

hospitalityRouter.onError(globalErrorHandler);
hospitalityRouter.use(reqInputsMiddleware);

/* Dashboard Router */
hospitalityRouter.get("/dashboard", ...getDashboardHandler);

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
hospitalityRouter.post("/account/transfer-ownership", ...transferOwnershipHandler);
hospitalityRouter.post("/account/transfer-ownership/verify", ...verifyTransferOwnershipHandler);
hospitalityRouter.post("/account/transfer-entire-account", ...transferEntireAccountHandler);
hospitalityRouter.post("/account/transfer-entire-account/verify", ...verifyTransferEntireAccountHandler);

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
hospitalityRouter.post("/grubpac/logs", ...postGrubpacLogsHandler);
hospitalityRouter.get("/grubpac/logs/dropdowns", ...getGrubpacLogsDropdownsHandler);

/* Support Router */
hospitalityRouter.get("/support/category", ...getSupportCategoriesHandler);
hospitalityRouter.get("/support/faq", ...getSupportQuestionsHandler);
hospitalityRouter.get("/support/search", ...searchSupportQuestionsHandler);
hospitalityRouter.get("/support/answer", ...getSupportAnswerHandler);
hospitalityRouter.get("/support/faq/attachment/download", ...downloadSupportAttachmentHandler);

