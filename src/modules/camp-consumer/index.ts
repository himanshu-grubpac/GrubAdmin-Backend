import { Hono } from "hono";
import { globalErrorHandler } from "@/middlewares/error";
import { createMobileRateLimits } from "@/middlewares/mobile-rate-limits";
import { getConfigHandler } from "@/modules/camp-consumer/handlers/config/get-config.handler";
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
} from "@/modules/camp-consumer/handlers/auth";
import { getProfileHandler } from "@/modules/camp-consumer/handlers/account/get-profile.handler";
import { updateAccountHandler } from "@/modules/camp-consumer/handlers/account/update-account.handler";
import { updatePasswordHandler } from "@/modules/camp-consumer/handlers/account/update-password.handler";
import { deleteAccountHandler } from "@/modules/camp-consumer/handlers/account/delete-account.handler";
import { getDashboardHandler } from "@/modules/camp-consumer/handlers/dashboard/get-dashboard.handler";
import { getSupportCategoriesHandler } from "@/modules/camp-consumer/handlers/support/get-support-categories.handler";
import { getSupportQuestionsHandler } from "@/modules/camp-consumer/handlers/support/get-support-questions.handler";
import { getSupportAnswerHandler } from "@/modules/camp-consumer/handlers/support/get-support-answer.handler";
import { listBoxesHandler } from "@/modules/camp-consumer/handlers/box/list-boxes.handler";
import { registerBoxHandler } from "@/modules/camp-consumer/handlers/box/register-box.handler";
import { getBoxDetailsHandler } from "@/modules/camp-consumer/handlers/box/get-box-details.handler";
import { removeBoxHandler } from "@/modules/camp-consumer/handlers/box/remove-box.handler";
import { updateBoxSettingsHandler } from "@/modules/camp-consumer/handlers/box/update-box-settings.handler";
import { connectBoxHandler } from "@/modules/camp-consumer/handlers/box/connect-box.handler";
import { disconnectBoxHandler } from "@/modules/camp-consumer/handlers/box/disconnect-box.handler";
import { requestLockOtpHandler } from "@/modules/camp-consumer/handlers/box/request-lock-otp.handler";
import { verifyLockOtpHandler } from "@/modules/camp-consumer/handlers/box/verify-lock-otp.handler";
import { lockBoxHandler } from "@/modules/camp-consumer/handlers/box/lock-box.handler";
import {
	getBoxAlertsHandler,
	patchBoxAlertsHandler,
} from "@/modules/camp-consumer/handlers/box/box-alerts.handler";
import { getLiveCameraHandler } from "@/modules/camp-consumer/handlers/camera/get-live.handler";
import { listFeedsHandler } from "@/modules/camp-consumer/handlers/camera/list-feeds.handler";
import { getStreamHandler } from "@/modules/camp-consumer/handlers/camera/get-stream.handler";
import { patchSurveillanceModeHandler } from "@/modules/camp-consumer/handlers/camera/patch-surveillance-mode.handler";
import { createUploadUrlHandler } from "@/modules/camp-consumer/handlers/camera/create-upload-url.handler";
import { registerFeedHandler } from "@/modules/camp-consumer/handlers/camera/register-feed.handler";
import { getNotificationsHandler } from "@/modules/camp-consumer/handlers/notification/get-notifications.handler";
import { markNotificationsHandler } from "@/modules/camp-consumer/handlers/notification/mark-notifications.handler";

export const campConsumerRouter = new Hono();

const limits = createMobileRateLimits("camp-consumer");

campConsumerRouter.onError(globalErrorHandler);
campConsumerRouter.use("*", limits.general);

campConsumerRouter.get("/health", (context) =>
	context.json({
		success: true,
		code: 200,
		message: "Camp consumer API is up",
		data: { status: "up" },
	}),
);

/** Auth — self-serve consumer registration */
campConsumerRouter.post("/auth/login", limits.auth, ...loginHandler);
campConsumerRouter.post("/auth/send-otp", limits.auth, ...sendOtpHandler);
campConsumerRouter.post("/auth/verify-otp", limits.auth, ...verifyOtpHandler);
campConsumerRouter.post("/auth/resend-otp", limits.auth, ...sendOtpHandler);
campConsumerRouter.post("/auth/forget-password/otp/send", limits.auth, ...sendForgetPasswordOtpHandler);
campConsumerRouter.post("/auth/forget-password/otp/verify", limits.auth, ...verifyForgetPasswordOtpHandler);
campConsumerRouter.post("/auth/forget-password/set-password", limits.auth, ...setNewPasswordHandler);
campConsumerRouter.post("/auth/set-password", limits.auth, ...setNewPasswordHandler);
campConsumerRouter.post("/auth/forget-password/otp/resend", limits.auth, ...sendForgetPasswordOtpHandler);
campConsumerRouter.post("/auth/reset-password", limits.auth, ...resetPasswordHandler);
campConsumerRouter.post("/auth/check-account", limits.auth, ...checkAccountHandler);
campConsumerRouter.post("/auth/logout", ...logoutHandler);
campConsumerRouter.post("/auth/refresh", ...refreshTokenHandler);

/** Account */
campConsumerRouter.get("/account/me", ...getProfileHandler);
campConsumerRouter.get("/profile", ...getProfileHandler);
campConsumerRouter.put("/account", ...updateAccountHandler);
campConsumerRouter.put("/account/password", ...updatePasswordHandler);
campConsumerRouter.delete("/account", ...deleteAccountHandler);

/** Dashboard */
campConsumerRouter.get("/dashboard", ...getDashboardHandler);

/** Support */
campConsumerRouter.get("/support/category", ...getSupportCategoriesHandler);
campConsumerRouter.get("/support/faq", ...getSupportQuestionsHandler);
campConsumerRouter.get("/support/answer", ...getSupportAnswerHandler);

/** Config */
campConsumerRouter.get("/config", ...getConfigHandler);

/** Boxes */
campConsumerRouter.get("/boxes", ...listBoxesHandler);
campConsumerRouter.post("/boxes", ...registerBoxHandler);
campConsumerRouter.get("/boxes/:box_id", ...getBoxDetailsHandler);
campConsumerRouter.delete("/boxes/:box_id", ...removeBoxHandler);
campConsumerRouter.patch("/boxes/:box_id/settings", ...updateBoxSettingsHandler);
campConsumerRouter.post("/boxes/:box_id/connection", ...connectBoxHandler);
campConsumerRouter.delete("/boxes/:box_id/connection", ...disconnectBoxHandler);
campConsumerRouter.post("/boxes/:box_id/lock/otp", limits.sensitiveOtp, ...requestLockOtpHandler);
campConsumerRouter.post("/boxes/:box_id/lock/verify", limits.sensitiveOtp, ...verifyLockOtpHandler);
campConsumerRouter.patch("/boxes/:box_id/lock", ...lockBoxHandler);
campConsumerRouter.get("/boxes/:box_id/alerts", ...getBoxAlertsHandler);
campConsumerRouter.patch("/boxes/:box_id/alerts", ...patchBoxAlertsHandler);

/** Camera / surveillance (Camp-only) */
campConsumerRouter.get("/boxes/:box_id/camera/live", ...getLiveCameraHandler);
campConsumerRouter.get("/boxes/:box_id/camera/feeds", ...listFeedsHandler);
campConsumerRouter.get("/boxes/:box_id/camera/feeds/:feed_id/stream", ...getStreamHandler);
campConsumerRouter.post("/boxes/:box_id/camera/upload-url", ...createUploadUrlHandler);
campConsumerRouter.post("/boxes/:box_id/camera/feeds/register", ...registerFeedHandler);
campConsumerRouter.patch("/boxes/:box_id/camera/surveillance-mode", ...patchSurveillanceModeHandler);

/** Notifications */
campConsumerRouter.get("/notification", ...getNotificationsHandler);
campConsumerRouter.patch("/notification", ...markNotificationsHandler);
