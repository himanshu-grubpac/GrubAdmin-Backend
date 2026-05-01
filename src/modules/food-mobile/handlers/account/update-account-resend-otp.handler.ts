import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import {
    getFoodEmployeeUpdateOtp,
    upsertVerticalFoodUpdateOtp,
} from "@/db/actions/food-employe-update-otp.actions.ts";
import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp.ts";
import { services } from "@/services";
import type { APIResponse } from "@/types/api";

export const updateAccountResendOtpHandler = createHandlers(
    foodAuthGuard(),
    async (context) => {
        const { user } = context.var;

        const oldEmployeeUpdateOtp = await getFoodEmployeeUpdateOtp(user.id);

        if (!oldEmployeeUpdateOtp) {
            throw new APIError(
                "No old otp has been sent! Please first initiate the update request",
                undefined,
                undefined,
                400,
            );
        }

        const otp = Otp.generateOtp(4);

        await upsertVerticalFoodUpdateOtp({
            user_id: user.id,
            otp,
            email: oldEmployeeUpdateOtp.email,
            role: oldEmployeeUpdateOtp.role,
        });

        if (oldEmployeeUpdateOtp.email) {
            await services.mailer.sendEmail({
                from: "ankan@sqaby.com",
                subject: "OTP for Account Update",
                to: oldEmployeeUpdateOtp.email,
                text: `Your OTP to update Food Employee account is ${otp}`,
            });
        }

        return context.json<APIResponse<any>>({
            success: true,
            code: 200,
            data: {
                otp_details: {
                    type: "email",
                    values: [oldEmployeeUpdateOtp.email],
                },
            },
        });
    },
);

