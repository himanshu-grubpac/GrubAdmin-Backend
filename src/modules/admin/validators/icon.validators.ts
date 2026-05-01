import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

export const createIconRequestBodyValidators = zValidator(
	"form",
	z.object({
		icons: z
			.file({
				error: "Please provide a valid upload file",
			})
			.array(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
