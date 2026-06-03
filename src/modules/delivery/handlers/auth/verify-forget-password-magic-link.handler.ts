import { createHandlers } from "@/utils/hono-factory.ts";
import { verifyForgetPasswordMagicLinkRequestBodyValidator } from "delivery/validators/auth.validators.ts";
import { getOtpByToken } from "@/db/actions/otp.actions.ts";
import { APIError } from "@/types/error";
import { getUniqueVerticalDeliveryEmployee } from "@/db/actions/vertical-delivery-employee.actions";
import type { APIResponse } from "@/types/api";
import { getCookie, setCookie } from "hono/cookie";

export const verifyForgetPasswordMagicLinkHandler = createHandlers(
    verifyForgetPasswordMagicLinkRequestBodyValidator,
    async (context) => {
        const { email, token } = context.req.valid("json");

        // Fetch all active forgot_password tokens for the email
        const { Otp: OtpModel } = await import("@/db/mongo-schema/otp.model.ts");
        const activeTokens = await OtpModel.find({ email: email.trim().toLowerCase(), for_what: "forget_password" });

        let savedToken = null;
        const { compareOtp } = await import("@/db/actions/otp.actions.ts");
        for (const activeToken of activeTokens) {
            if (await compareOtp(token, activeToken.otp)) {
                savedToken = activeToken;
                break;
            }
        }

        if (!savedToken) {
            throw new APIError(undefined, "delivery.auth.login.MAGIC_LINK_EXPIRED");
        }

        const employee = await getUniqueVerticalDeliveryEmployee({
            email,
        });

        if (!employee?.employee) {
            throw new APIError(undefined, "delivery.auth.login.ACCOUNT_NOT_FOUND");
        }

        if (employee.employee.status === "suspended") {
            throw new APIError(undefined, "delivery.auth.login.SUSPENDED");
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


