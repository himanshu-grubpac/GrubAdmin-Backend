import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

export const createClientBoxRequestBodyValidator = zValidator(
	"json",
	z.object({
		client_id: z.ulid({
			error: "Please provide a valid client id",
		}),
		amount: z.number("Please provide the number of APIs to be made"),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
