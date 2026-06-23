import { Hono } from "hono";
import { globalErrorHandler } from "@/middlewares/error";
import { reqInputsMiddleware } from "@/middlewares/req-inputs";
import {
	createFloorHandler,
	getFloorsHandler,
	getFloorByIdHandler,
	editFloorHandler,
	deleteFloorsHandler,
	suspendFloorsHandler,
	reactivateFloorsHandler,
	searchFloorsHandler,
	getGrubpacDetailsHandler,
	updateGrubpacHandler,
	reassignGrubpacHandler,
} from "hospitality/handlers/floor";

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
hospitalityRouter.get("/grubpac/details", ...getGrubpacDetailsHandler);
hospitalityRouter.put("/grubpac", ...updateGrubpacHandler);
hospitalityRouter.patch("/grubpac/reassign", ...reassignGrubpacHandler);
hospitalityRouter.delete("/grubpac", ...deleteGrubpacHandler);
hospitalityRouter.patch("/grubpac/suspend", ...suspendGrubpacHandler);
hospitalityRouter.patch("/grubpac/reactivate", ...reactivateGrubpacHandler);
hospitalityRouter.patch("/grubpac/action", ...actionGrubpacHandler);
