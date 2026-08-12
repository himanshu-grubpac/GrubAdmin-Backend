import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod";

export const postEmergencyAlertBodyValidator = zValidator(
	"json",
	z.object({
		box_id: z.string().trim().optional(),
		lat: z.number(),
		lng: z.number(),
		note: z.string().trim().optional(),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);
