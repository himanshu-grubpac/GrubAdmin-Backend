import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

export const createVerticalRequestBodyValidator = zValidator(
	"json",
	z.object({
		name: z
			.string({
				error: "Please provide a vertical name",
			})
			.trim()
			.min(1, {
				error: "Vertical name must not be empty",
			}),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const deleteVerticalParamValidator = zValidator(
	"param",
	z.object({
		id: z.string({
			error: "Please provide a valid vertical ID",
		}).ulid({
			message: "Invalid vertical ID",
		}),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);