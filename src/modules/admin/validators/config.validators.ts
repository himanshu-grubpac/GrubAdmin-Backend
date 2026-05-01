import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

export const createConfigRequestBodyValidator = zValidator(
	"json",
	z.object({
		key: z
			.string({
				error: "Please provide a key",
			})
			.trim(),
		value: z
			.string({
				error: "Please provide a value",
			})
			.trim(),
	}),
);
