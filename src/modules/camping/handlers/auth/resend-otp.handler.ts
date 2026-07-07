import { createHandlers } from "@/utils/hono-factory.ts";
import { resendOtpRequestBodyValidator } from "camping/validators/auth.validators.ts";
import { sendOtpHandler } from "./send-otp.handler";

export const resendOtpHandler = createHandlers(
	resendOtpRequestBodyValidator,
	async (context, next) => {
		return sendOtpHandler[1](context, next);
	},
);
