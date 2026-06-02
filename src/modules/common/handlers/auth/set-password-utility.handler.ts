import { createHandlers } from "@/utils/hono-factory.ts";
import { setPasswordRequestBodyValidator } from "@/modules/common/validators/auth.validators.ts";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";
import { authGuard } from "@/middlewares/auth";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { NODE_ENV } from "@/configs/env.ts";

export const setPasswordUtilityHandler = createHandlers(
    authGuard(),
    setPasswordRequestBodyValidator,
    async (context) => {
        if (NODE_ENV === "production") {
            throw new APIError("Endpoint not found", undefined, undefined, 404);
        }

        const payload = context.req.valid("json");
        const { email, password } = payload;
        const _for = payload.for;

        const hashedPassword = await Bcrypt.generateHash({ data: password });

        if (_for === "client") {
            const client = await prisma.client.findFirst({
                where: {
                    email,
                },
            });

            if (!client) {
                throw new APIError(
                    "No client found with the provided credentials!",
                    undefined,
                    undefined,
                    404,
                );
            }

            await prisma.client.update({
                where: {
                    id: client.id,
                },
                data: {
                    password: hashedPassword,
                    status: "active",
                },
            });
        } else {
            const employee = await prisma.vertical_delivery_employee.findFirst({
                where: {
                    email,
                },
            });

            if (!employee) {
                throw new APIError(
                    "No employee found with the provided credentials!",
                    undefined,
                    undefined,
                    404,
                );
            }

            await prisma.vertical_delivery_employee.update({
                where: {
                    id: employee.id,
                },
                data: {
                    password: hashedPassword,
                    status: "active",
                },
            });
        }

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


