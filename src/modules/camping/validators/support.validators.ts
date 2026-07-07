import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

export const writeToUsRequestBodyValidator = zValidator(
	"json",
	z.object({
		subject: z.string().trim().min(1, {
			error: "Please provide a subject",
		}).max(200, {
			error: "Subject is too long",
		}),
		message: z.string().trim().min(1, {
			error: "Please provide a message",
		}).max(2000, {
			error: "Message is too long",
		}),
		attachment_urls: z.array(z.string()).optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
