import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { confirmUpdateAccountRequestBodyValidator } from "delivery-mobile/validators/account.validators.ts";
import {
    deleteDeliveryEmployeeUpdateOtp,
    getDeliveryEmployeeUpdateOtp,
} from "@/db/actions/delivery-employee-update-otp.actions.ts";
import { APIError } from "@/types/error";
import { updateVerticalDeliveryEmployee } from "@/db/actions/vertical-delivery-employee.actions";
import type { APIResponse } from "@/types/api";

export const confirmUpdateAccountHandler = createHandlers(
    deliveryAuthGuard(),
    confirmUpdateAccountRequestBodyValidator,
    async (context) => {
        const { user, type } = context.var;

        const { otp } = context.req.valid("json");

        const updatedDetails = await getDeliveryEmployeeUpdateOtp(user.id);

        if (!updatedDetails) {
            throw new APIError(
                "Either the OTP was never created or maybe has expired!",
                undefined,
                undefined,
                400,
            );
        }

        if (otp !== updatedDetails.otp) {
            throw new APIError("Invalid OTP", undefined, undefined, 400);
        }

        if (updatedDetails.email) {
            await updateVerticalDeliveryEmployee({
                id: user.id,
                email: updatedDetails.email,
                type,
            });
        }

        await deleteDeliveryEmployeeUpdateOtp(user.id);

        return context.json<APIResponse>({
            success: true,
            code: 200,
        });
    },
);

