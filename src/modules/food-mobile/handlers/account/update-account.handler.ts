import { createHandlers } from "@/utils/hono-factory.ts";
import { updateAccountRequestBodyValidator } from "food-mobile/validators/account.validators.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { updateVerticalFoodEmployee } from "@/db/actions/vertical-food-employee.actions";
import type { APIResponse } from "@/types/api";
import {
    getFoodEmployeeUpdateOtp,
    upsertVerticalFoodUpdateOtp,
} from "@/db/actions/food-employe-update-otp.actions.ts";
import { Otp } from "@/utils/otp.ts";
import { services } from "@/services";

export const updateAccountHandler = createHandlers(
    foodAuthGuard(),
    updateAccountRequestBodyValidator,
    async (context) => {
        const { user, type } = context.var;

        const {
            email,
            last_name,
            first_name,
            country_code,
            mobile_number,
            old_password,
            new_password,
            organization,
        } = context.req.valid("json");

        let finalFirstName = first_name;
        let finalLastName = last_name;

        if (first_name !== undefined || last_name !== undefined) {
            if (type === "admin") {
                const existingName = (user as any).name || "";
                const existingFirstName = existingName.split(" ")[0] || "";
                const existingLastName = existingName.split(" ").slice(1).join(" ") || "";
                finalFirstName = first_name !== undefined ? first_name : existingFirstName;
                finalLastName = last_name !== undefined ? last_name : existingLastName;
            } else {
                finalFirstName = first_name !== undefined ? first_name : (user as any).first_name;
                finalLastName = last_name !== undefined ? last_name : (user as any).last_name;
            }
        }

        if (organization && type !== "admin") {
            throw new APIError(
                "Only super admins can update the organixation name",
                undefined,
                undefined,
                400,
            );
        }

        if (
            email &&
            (finalLastName ||
                finalFirstName ||
                country_code ||
                mobile_number ||
                old_password ||
                new_password)
        ) {
            throw new APIError(
                "You can only pass the new email while updating the email",
                undefined,
                undefined,
                400,
            );
        }

        if (
            new_password &&
            (email || finalLastName || finalFirstName || mobile_number || country_code)
        ) {
            throw new APIError(
                "You can only pass the new password while updating the password",
                undefined,
                undefined,
                400,
            );
        }

        let responseData: any = undefined;

        if (email) {
            if (user.email === email) {
                throw new APIError("The old email is same", undefined, undefined, 400);
            }

            const employeeProfileUpdateOtp = await getFoodEmployeeUpdateOtp(
                user.id,
            );

            if (employeeProfileUpdateOtp && employeeProfileUpdateOtp.email) {
                throw new APIError(
                    "Please try resending the otp as one otp has has already been sent",
                    undefined,
                    undefined,
                    400,
                );
            }

            const otp = Otp.generateOtp(4);

            const updatedOtpRecord = await upsertVerticalFoodUpdateOtp({
                email,
                otp,
                user_id: user.id,
                role: type,
            });

            if (!updatedOtpRecord) {
                throw new APIError("Failed to save OTP", undefined, undefined, 500);
            }

            await services.mailer.sendEmail({
                from: "ankan@sqaby.com",
                subject: "OTP for Account Update",
                to: email,
                text: `Your OTP to update Food Employee account is ${otp}`,
            });

            responseData = {
                otp_id: updatedOtpRecord.otp_id,
                is_otp: true,
                otp_details: {
                    type: "email",
                    values: [email]
                }
            };
        } else if (new_password) {
            let hashedPassword: string | undefined = undefined;

            if (!user.password) {
                hashedPassword = await Bcrypt.generateHash({
                    data: new_password,
                });
            } else {
                if (!old_password) {
                    throw new APIError(
                        "Please provide your old password for identity verification",
                        undefined,
                        undefined,
                        400,
                    );
                }

                const correctOldPassword = await Bcrypt.compareHash({
                    data: old_password,
                    hashedValue: user.password,
                });

                if (!correctOldPassword) {
                    throw new APIError(
                        "Invalid old password... please check and retry!",
                        undefined,
                        undefined,
                        400,
                    );
                }

                hashedPassword = await Bcrypt.generateHash({
                    data: new_password,
                });
            }

            await updateVerticalFoodEmployee({
                type,
                password: hashedPassword,
                id: user.id,
            });
        } else {
            await updateVerticalFoodEmployee({
                type,
                id: user.id,
                first_name: finalFirstName,
                last_name: finalLastName,
                country_code,
                mobile_number,
            });
        }

        return context.json<APIResponse<any>>(
            {
                success: true,
                code: 200,
                data: responseData,
            },
            {
                status: 200,
            },
        );
    },
);

