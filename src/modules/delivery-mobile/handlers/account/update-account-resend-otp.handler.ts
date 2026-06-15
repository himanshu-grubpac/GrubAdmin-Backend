import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import {
    getDeliveryEmployeeUpdateOtp,
    upsertVerticalDeliveryUpdateOtp,
} from "@/db/actions/delivery-employee-update-otp.actions.ts";
import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp.ts";
import { services } from "@/services";
import type { APIResponse } from "@/types/api";

export const updateAccountResendOtpHandler = createHandlers(
    deliveryAuthGuard(),
    async (context) => {
        const { user } = context.var;

        const oldEmployeeUpdateOtp = await getDeliveryEmployeeUpdateOtp(user.id);

        if (!oldEmployeeUpdateOtp) {
            throw new APIError(
                "No old otp has been sent! Please first initiate the update request",
                undefined,
                undefined,
                400,
            );
        }

        const otp = Otp.generateOtp(4);

        await upsertVerticalDeliveryUpdateOtp({
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
                text: `Your OTP to update Delivery Employee account is ${otp}`,
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

