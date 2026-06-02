import { createHandlers } from "@/utils/hono-factory.ts";
import { checkAccountRequestBodyValidator } from "delivery-mobile/validators/auth.validators.ts";
import { getUniqueVerticalDeliveryEmployee } from "@/db/actions/vertical-delivery-employee.actions";
import type { APIResponse } from "@/types/api";
import { APIError } from "@/types/error";
import { sendOtpToEmployee } from "./auth.utils.ts";

export const checkAccountHandler = createHandlers(
    checkAccountRequestBodyValidator,
    async (context) => {
        const { email, phone } = context.req.valid("json");


        const employee = await getUniqueVerticalDeliveryEmployee({
            email,
            phone,
        });

        const is_password_set = !!employee?.employee?.password;
        let message: string | undefined;

        if (employee && !is_password_set) {
            await sendOtpToEmployee(employee);
            message = "OTP sent successfully.";
        }

        return context.json<
            APIResponse & {
                is_account_found: boolean;
                is_password_set: boolean;
                message?: string;
            }
        >(
            {
                success: true,
                code: 200,
                is_account_found: !!employee,
                is_password_set,
                message,
            },
            {
                status: 200,
            },
        );

    },
);



