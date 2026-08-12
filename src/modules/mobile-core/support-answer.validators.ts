import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

/** Accept Figma `id` query param and portal-style `faq_id`. */
export const getSupportAnswerRequestQueryValidator = zValidator(
	"query",
	z
		.object({
			id: z.ulid("Please provide a valid id").optional(),
			faq_id: z.ulid("Please provide a valid faq_id").optional(),
		})
		.refine((data) => Boolean(data.id || data.faq_id), {
			message: "Please provide id or faq_id",
		})
		.transform((data) => ({
			faq_id: (data.faq_id ?? data.id)!,
		})),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
