import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

export const resetPasswordRequestBodyValidator = zValidator(
    "json",
    z.object({
        email: z.string().email("Please provide a valid email address").optional(),
        phone: z.string().optional(),
        for: z.enum(["client", "employee"], {
            errorMap: () => ({ message: "Please provide a valid 'for' value (client or employee)" }),
        } as any),
    }),
    (response) => {
        if (!response.success) {
            validatorErrorHandler(response.error);
        }
    },
);

export const setPasswordRequestBodyValidator = zValidator(
    "json",
    z.object({
        email: z.string().email("Please provide a valid email address"),
        for: z.enum(["client", "employee"], {
            errorMap: () => ({ message: "Please provide a valid 'for' value (client or employee)" }),
        } as any),
        password: z
            .string({
                required_error: "Please provide a password",
            } as any)
            .trim()
            .min(8, {
                message: "Password must be at least 8 characters long",
            })
            .max(20, {
                message: "Password can be at max 20 characters long",
            }),
    }),
    (response) => {
        if (!response.success) {
            validatorErrorHandler(response.error);
        }
    },
);
