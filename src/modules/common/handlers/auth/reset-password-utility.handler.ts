import { createHandlers } from "@/utils/hono-factory.ts";
import { resetPasswordRequestBodyValidator } from "@/modules/common/validators/auth.validators.ts";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";
import { NODE_ENV } from "@/configs/env.ts";

export const resetPasswordUtilityHandler = createHandlers(
    resetPasswordRequestBodyValidator,
    async (context) => {
        if (NODE_ENV === "production") {
            throw new APIError("Endpoint not found", undefined, undefined, 404);
        }

        const payload = context.req.valid("json");
        const { email, phone } = payload;
        const _for = payload.for;

        if (!email && !phone) {
            throw new APIError(
                "At least an email or phone number is required!",
                undefined,
                undefined,
                400,
            );
        }

        if (_for === "client") {
            const orConditions = [
                email ? { email: email } : {},
                phone ? { mobile_number: phone } : {},
            ].filter((condition) => Object.keys(condition).length > 0);

            const client = await prisma.client.findFirst({
                where: {
                    OR: orConditions.length > 0 ? orConditions : undefined,
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
                    password: null,
                    status: "inactive",
                },
            });
        } else {
            const orConditions = [
                email ? { email: email } : {},
                phone ? { mobile_number: phone } : {},
            ].filter((condition) => Object.keys(condition).length > 0);

            const employee = await prisma.vertical_delivery_employee.findFirst({
                where: {
                    OR: orConditions.length > 0 ? orConditions : undefined,
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
                    password: null,
                    status: "unassigned",
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


