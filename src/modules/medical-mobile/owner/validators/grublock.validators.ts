import { validatorErrorHandler } from "@/utils/zod";
import { zValidator } from "@hono/zod-validator";
import z from "zod";

export const emergencyUnlockBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.array(z.string().trim().min(1)).min(1, "Please provide at least one box id"),
		reason: z.string().trim().optional(),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);
