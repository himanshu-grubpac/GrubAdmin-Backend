import { createHandlers } from "@/utils/hono-factory.ts";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";
import { authGuard } from "@/middlewares/auth";
import { Bcrypt } from "@/utils/bcrypt.ts";

const superAdminSetPasswordValidator = zValidator(
    "json",
    z.object({
        email: z.string().email("Please provide a valid email address"),
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

export const setSuperAdminPasswordHandler = createHandlers(
    authGuard(),
    superAdminSetPasswordValidator,
    async (context) => {
        const { email, password } = context.req.valid("json");

        const hashedPassword = await Bcrypt.generateHash({ data: password });

        const admin = await prisma.admin.findFirst({
            where: {
                email,
            },
        });

        if (!admin) {
            throw new APIError(
                "No administrator found with the provided credentials!",
                undefined,
                undefined,
                404,
            );
        }

        await prisma.admin.update({
            where: {
                id: admin.id,
            },
            data: {
                password: hashedPassword,
                status: "active",
            },
        });

        return context.json<APIResponse>(
            {
                success: true,
                code: 200,
            },
            {
                status: 200,
            },
        );
    },
);
