import { Hono } from "hono";
import { reqInputsMiddleware } from "@/middlewares/req-inputs";
import { hospitalityAuthRateLimits } from "hospitality/configs/hospitality-auth-rate-limits";
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
	deleteAccountEligibilityHandler,
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
	getGrubpacDropdownsHandler,
	getGrubpacDetailsHandler,
	updateGrubpacHandler,
	reassignGrubpacHandler,
} from "hospitality/handlers/box";
import {
	getNotificationsHandler,
	searchNotificationsHandler,
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
	postSettingsChangedAuditHandler,
} from "hospitality/handlers/log";
import {
	getDashboardHandler,
} from "hospitality/handlers/dashboard";
import { hospitalityReadCacheMiddleware } from "hospitality/middlewares/hospitality-read-cache";
import { hospitalityAuthNoStoreMiddleware } from "hospitality/middlewares/hospitality-auth-no-store";
import { hospitalityErrorHandler } from "hospitality/middlewares/hospitality-error-handler";
import { hospitalityRequestIdMiddleware } from "hospitality/middlewares/hospitality-request-id";
import { hospitalityStructuredLoggingMiddleware } from "hospitality/middlewares/hospitality-structured-logging";
import { hospitalityIdempotencyMiddleware } from "hospitality/middlewares/hospitality-idempotency";
import { getHospitalityMetricsHandler } from "hospitality/handlers/health/get-metrics.handler";

export const hospitalityRouter = new Hono();


hospitalityRouter.onError(hospitalityErrorHandler);
hospitalityRouter.use(hospitalityRequestIdMiddleware);
hospitalityRouter.use(hospitalityStructuredLoggingMiddleware);
hospitalityRouter.use(reqInputsMiddleware);
hospitalityRouter.use(hospitalityReadCacheMiddleware);
hospitalityRouter.use(hospitalityAuthNoStoreMiddleware);
hospitalityRouter.use(hospitalityIdempotencyMiddleware);

/* Observability — admin auth or HOSPITALITY_METRICS_KEY internal scrape */
hospitalityRouter.get("/metrics", ...getHospitalityMetricsHandler);

/* Dashboard Router */
hospitalityRouter.get("/dashboard", ...getDashboardHandler);

/* Auth Router */
hospitalityRouter.post("/auth/login", hospitalityAuthRateLimits.login, ...loginHandler);
hospitalityRouter.post("/auth/send-otp", hospitalityAuthRateLimits.sendOtp, ...sendOtpHandler);
hospitalityRouter.post("/auth/verify-otp", hospitalityAuthRateLimits.verifyOtp, ...verifyOtpHandler);
hospitalityRouter.post("/auth/resend-otp", hospitalityAuthRateLimits.resendOtp, ...resendOtpHandler);
hospitalityRouter.post(
	"/auth/forget-password/send",
	hospitalityAuthRateLimits.forgetPasswordSend,
	...sendForgetPasswordMagicLinkHandler,
);
hospitalityRouter.post(
	"/auth/forget-password/verify",
	hospitalityAuthRateLimits.forgetPasswordVerify,
	...verifyForgetPasswordMagicLinkHandler,
);
hospitalityRouter.post("/auth/reset-password", hospitalityAuthRateLimits.resetPassword, ...resetPasswordMagicLinkHandler);
hospitalityRouter.post("/auth/set-password", hospitalityAuthRateLimits.setPassword, ...setNewPasswordHandler);
hospitalityRouter.post("/auth/logout", ...logoutHandler);
hospitalityRouter.post("/auth/impersonate", hospitalityAuthRateLimits.impersonate, ...hospitalityImpersonateHandler);

/* Account Router */
hospitalityRouter.get("/account/me", ...getMyAccountHandler);
hospitalityRouter.put("/account", ...updateAccountHandler);
hospitalityRouter.patch(
	"/account/update/resend-otp",
	hospitalityAuthRateLimits.accountResendOtp,
	...updateAccountResendOtpHandler,
);
hospitalityRouter.patch("/account/confirm", ...confirmUpdateAccountHandler);
hospitalityRouter.get("/account/delete-eligibility", ...deleteAccountEligibilityHandler);
hospitalityRouter.delete("/account", ...deleteAccountHandler);
hospitalityRouter.post("/account/transfer-ownership", ...transferOwnershipHandler);
hospitalityRouter.post(
	"/account/transfer-ownership/verify",
	hospitalityAuthRateLimits.transferVerify,
	...verifyTransferOwnershipHandler,
);
hospitalityRouter.post("/account/transfer-entire-account", ...transferEntireAccountHandler);
hospitalityRouter.post(
	"/account/transfer-entire-account/verify",
	hospitalityAuthRateLimits.transferVerify,
	...verifyTransferEntireAccountHandler,
);

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
hospitalityRouter.get("/grubpac/dropdowns", ...getGrubpacDropdownsHandler);
hospitalityRouter.get("/grubpac/details", ...getGrubpacDetailsHandler);
hospitalityRouter.put("/grubpac", ...updateGrubpacHandler);
hospitalityRouter.patch("/grubpac/reassign", ...reassignGrubpacHandler);
hospitalityRouter.delete("/grubpac", ...deleteGrubpacHandler);
hospitalityRouter.patch("/grubpac/suspend", ...suspendGrubpacHandler);
hospitalityRouter.patch("/grubpac/reactivate", ...reactivateGrubpacHandler);
hospitalityRouter.patch("/grubpac/action", ...actionGrubpacHandler);

/* Notification Router */
hospitalityRouter.get("/notification", ...getNotificationsHandler);
hospitalityRouter.post("/notification/search", ...searchNotificationsHandler);
hospitalityRouter.get("/notification/dropdowns", ...getNotificationDropdownsHandler);
hospitalityRouter.get("/notification/count", ...getUnreadNotificationsCountHandler);
hospitalityRouter.patch("/notification", ...markNotificationsHandler);
hospitalityRouter.post("/grubpac/logs", ...postGrubpacLogsHandler);
hospitalityRouter.get("/grubpac/logs/dropdowns", ...getGrubpacLogsDropdownsHandler);
hospitalityRouter.post("/grubpac/settings-changed", ...postSettingsChangedAuditHandler);

/* Support Router */
hospitalityRouter.get("/support/category", ...getSupportCategoriesHandler);
hospitalityRouter.get("/support/faq", ...getSupportQuestionsHandler);
hospitalityRouter.get("/support/search", ...searchSupportQuestionsHandler);
hospitalityRouter.get("/support/answer", ...getSupportAnswerHandler);
hospitalityRouter.get("/support/faq/attachment/download", ...downloadSupportAttachmentHandler);

