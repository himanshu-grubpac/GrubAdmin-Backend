import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { confirmUpdateAccountRequestBodyValidator } from "food-mobile/validators/account.validators.ts";
import {
    deleteFoodEmployeeUpdateOtp,
    getFoodEmployeeUpdateOtp,
} from "@/db/actions/food-employe-update-otp.actions.ts";
import { APIError } from "@/types/error";
import { updateVerticalFoodEmployee } from "@/db/actions/vertical-food-employee.actions";
import type { APIResponse } from "@/types/api";

export const confirmUpdateAccountHandler = createHandlers(
    foodAuthGuard(),
    confirmUpdateAccountRequestBodyValidator,
    async (context) => {
        const { user, type } = context.var;

        const { otp } = context.req.valid("json");

        const updatedDetails = await getFoodEmployeeUpdateOtp(user.id);

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
            await updateVerticalFoodEmployee({
                id: user.id,
                email: updatedDetails.email,
                type,
            });
        }

        await deleteFoodEmployeeUpdateOtp(user.id);

        return context.json<APIResponse>({
            success: true,
            code: 200,
        });
    },
);

