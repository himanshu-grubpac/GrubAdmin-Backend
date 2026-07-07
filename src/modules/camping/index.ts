import { Hono } from "hono";
import { globalErrorHandler } from "@/middlewares/error";
import { reqInputsMiddleware } from "@/middlewares/req-inputs";
import {
	loginHandler,
	logoutHandler,
	sendOtpHandler,
	verifyOtpHandler,
	resendOtpHandler,
	setPasswordHandler,
	forgetPasswordSendHandler,
	forgetPasswordVerifyHandler,
	forgetPasswordSetHandler,
} from "camping/handlers/auth";
import {
	getMyAccountHandler,
	updateAccountHandler,
	updateAccountResendOtpHandler,
	confirmUpdateAccountHandler,
	deleteAccountEligibilityHandler,
	deleteAccountHandler,
} from "camping/handlers/account";
import {
	getDashboardHandler,
} from "camping/handlers/dashboard";
import {
	getLiveStreamHandler,
	getRecordedFeedsHandler,
	getFeedDetailHandler,
	downloadFeedHandler,
	playbackFeedHandler,
} from "camping/handlers/camera";
import {
	getNotificationsHandler,
	getUnreadNotificationsCountHandler,
	markNotificationsHandler,
	getNotificationDropdownsHandler,
	testTriggerNotificationHandler,
} from "camping/handlers/notification";
import {
	getSupportCategoriesHandler,
	getSupportQuestionsHandler,
	searchSupportQuestionsHandler,
	getSupportAnswerHandler,
	downloadSupportAttachmentHandler,
	writeToUsHandler,
} from "camping/handlers/support";
import {
	getBoxLogsHandler,
} from "camping/handlers/log";
import {
	listBoxesHandler,
	registerBoxHandler,
	getBoxDetailsHandler,
	removeBoxHandler,
	updateBoxSettingsHandler,
	connectBoxHandler,
	disconnectBoxHandler,
	requestLockOtpHandler,
	verifyLockOtpHandler,
	lockBoxHandler,
} from "camping/handlers/box";
export const campingRouter = new Hono();

campingRouter.onError(globalErrorHandler);
campingRouter.use(reqInputsMiddleware);

/* Auth Router */
campingRouter.post("/auth/login", ...loginHandler);
campingRouter.post("/auth/send-otp", ...sendOtpHandler);
campingRouter.post("/auth/verify-otp", ...verifyOtpHandler);
campingRouter.post("/auth/resend-otp", ...resendOtpHandler);
campingRouter.post("/auth/set-password", ...setPasswordHandler);
campingRouter.post("/auth/forget-password/otp/send", ...forgetPasswordSendHandler);
campingRouter.post("/auth/forget-password/otp/verify", ...forgetPasswordVerifyHandler);
campingRouter.post("/auth/forget-password/set-password", ...forgetPasswordSetHandler);
campingRouter.post("/auth/logout", ...logoutHandler);

/* Account Router */
campingRouter.get("/account/me", ...getMyAccountHandler);
campingRouter.put("/account", ...updateAccountHandler);
campingRouter.patch("/account/update/resend-otp", ...updateAccountResendOtpHandler);
campingRouter.patch("/account/confirm", ...confirmUpdateAccountHandler);
campingRouter.get("/account/delete-eligibility", ...deleteAccountEligibilityHandler);
campingRouter.delete("/account", ...deleteAccountHandler);

/* Dashboard Router */
campingRouter.get("/dashboard", ...getDashboardHandler);

/* Camera Router */
campingRouter.get("/boxes/:box_id/camera/live", ...getLiveStreamHandler);
campingRouter.get("/boxes/:box_id/camera/feed", ...getRecordedFeedsHandler);
campingRouter.get("/boxes/:box_id/camera/feed/:feed_id", ...getFeedDetailHandler);
campingRouter.post("/boxes/:box_id/camera/download/:feed_id", ...downloadFeedHandler);
campingRouter.post("/boxes/:box_id/camera/playback/:feed_id", ...playbackFeedHandler);

/* Notification Router */
campingRouter.get("/notification", ...getNotificationsHandler);
campingRouter.get("/notification/count", ...getUnreadNotificationsCountHandler);
campingRouter.get("/notification/dropdowns", ...getNotificationDropdownsHandler);
campingRouter.patch("/notification", ...markNotificationsHandler);
campingRouter.post("/notification/test-trigger", ...testTriggerNotificationHandler);

/* Support Router */
campingRouter.get("/support/category", ...getSupportCategoriesHandler);
campingRouter.get("/support/faq", ...getSupportQuestionsHandler);
campingRouter.get("/support/search", ...searchSupportQuestionsHandler);
campingRouter.get("/support/answer", ...getSupportAnswerHandler);
campingRouter.get("/support/faq/attachment/download", ...downloadSupportAttachmentHandler);
campingRouter.post("/support/write-to-us", ...writeToUsHandler);

/* Logs Router */
campingRouter.get("/boxes/:box_id/logs", ...getBoxLogsHandler);

/* Box Router */
campingRouter.get("/boxes", ...listBoxesHandler);
campingRouter.post("/boxes", ...registerBoxHandler);
campingRouter.get("/boxes/:box_id", ...getBoxDetailsHandler);
campingRouter.delete("/boxes/:box_id", ...removeBoxHandler);
campingRouter.patch("/boxes/:box_id/settings", ...updateBoxSettingsHandler);
campingRouter.post("/boxes/:box_id/connection", ...connectBoxHandler);
campingRouter.delete("/boxes/:box_id/connection", ...disconnectBoxHandler);
campingRouter.post("/boxes/:box_id/lock/otp", ...requestLockOtpHandler);
campingRouter.post("/boxes/:box_id/lock/verify", ...verifyLockOtpHandler);
campingRouter.patch("/boxes/:box_id/lock", ...lockBoxHandler);
