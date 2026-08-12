import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod";

const unlockOnlyActionSchema = z.literal("unlock");

export const mobileLockOtpBodyValidator = zValidator(
	"json",
	z.object({
		action: unlockOnlyActionSchema,
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const mobileVerifyLockOtpBodyValidator = zValidator(
	"json",
	z.object({
		code: z.string().length(4, "OTP must be 4 digits"),
		action: unlockOnlyActionSchema,
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);
