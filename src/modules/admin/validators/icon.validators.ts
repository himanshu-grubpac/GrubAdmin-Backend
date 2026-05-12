import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

export const createIconRequestBodyValidators = zValidator(
	"form",
	z.object({
		// Preprocess: safely normalize single File vs. multiple Files arrays into a standard array.
		icons: z.preprocess((val) => {
			if (!val) return [];
			return Array.isArray(val) ? val : [val];
		}, z.array(z.any())),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
