import { createHandlers } from "@/utils/hono-factory.ts";
import { verifyForgetPasswordMagicLinkRequestBodyValidator } from "food/validators/auth.validators.ts";
import { getOtpByToken } from "@/db/actions/otp.actions.ts";
import { APIError } from "@/types/error";
import { getUniqueVerticalFoodEmployee } from "@/db/actions/vertical-food-employee.actions";
import type { APIResponse } from "@/types/api";
import { getCookie, setCookie } from "hono/cookie";

export const verifyForgetPasswordMagicLinkHandler = createHandlers(
    verifyForgetPasswordMagicLinkRequestBodyValidator,
    async (context) => {
        const { email, token } = context.req.valid("json");

        const savedToken = await getOtpByToken(email, token);

        if (!savedToken || savedToken.for_what !== "forget_password") {
            throw new APIError(undefined, "food.auth.login.MAGIC_LINK_EXPIRED");
        }

        const employee = await getUniqueVerticalFoodEmployee({
            email,
        });

        if (!employee?.employee) {
            throw new APIError(undefined, "food.auth.login.ACCOUNT_NOT_FOUND");
        }

        if (employee.employee.status === "suspended") {
            throw new APIError(undefined, "food.auth.login.SUSPENDED");
        }

        const otp_id = savedToken.otp_id;

        return context.json<APIResponse<{ link_id: string }>>(
            {
                success: true,
                code: 200,
                data: {
                    link_id: otp_id,
                },
            },
            {
                status: 200,
            },
        );
    },
);


