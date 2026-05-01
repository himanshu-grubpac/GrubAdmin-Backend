import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

export const createVerticalRequestBodyValidator = zValidator(
	"json",
	z.object({
		name: z.string({
			error: "Please provide a vertical name",
		}),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
