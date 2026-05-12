import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

const ALLOWED_CONFIG_KEYS = ["icon_base_url", "faq_base_url"] as const;

export const createConfigRequestBodyValidator = zValidator(
	"json",
	z.object({
		key: z
			.string({
				error: "Please provide a key",
			})
			.trim()
			.refine((val) => (ALLOWED_CONFIG_KEYS as readonly string[]).includes(val), {
				message: "Invalid or unknown configuration key",
			}),
		value: z
			.string({
				error: "Please provide a value",
			})
			.trim()
			.min(1, { message: "Configuration value cannot be empty" }),
	}).superRefine((data, ctx) => {
		if (data.key === "icon_base_url" || data.key === "faq_base_url") {
			try {
				new URL(data.value);
			} catch {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Value for ${data.key} must be a valid URL`,
					path: ["value"],
				});
			}
		}
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
