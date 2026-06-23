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
} from "hospitality/handlers/auth";
import {
	confirmUpdateAccountHandler,
	getMyAccountHandler,
	updateAccountHandler,
	updateAccountResendOtpHandler,
	deleteAccountHandler,
} from "hospitality/handlers/account";
import {
	getGrubpacHandler,
	deleteGrubpacHandler,
	actionGrubpacHandler,
	suspendGrubpacHandler,
	reactivateGrubpacHandler,
	searchGrubpacHandler,
} from "hospitality/handlers/box";

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

/* Account Router */
hospitalityRouter.get("/account/me", ...getMyAccountHandler);
hospitalityRouter.put("/account", ...updateAccountHandler);
hospitalityRouter.patch("/account/update/resend-otp", ...updateAccountResendOtpHandler);
hospitalityRouter.patch("/account/confirm", ...confirmUpdateAccountHandler);
hospitalityRouter.delete("/account", ...deleteAccountHandler);

/* Box (Grubpac) Router */
hospitalityRouter.get("/grubpac", ...getGrubpacHandler);
hospitalityRouter.get("/grubpac/search", ...searchGrubpacHandler);
hospitalityRouter.delete("/grubpac", ...deleteGrubpacHandler);
hospitalityRouter.patch("/grubpac/suspend", ...suspendGrubpacHandler);
hospitalityRouter.patch("/grubpac/reactivate", ...reactivateGrubpacHandler);
hospitalityRouter.patch("/grubpac/action", ...actionGrubpacHandler);
