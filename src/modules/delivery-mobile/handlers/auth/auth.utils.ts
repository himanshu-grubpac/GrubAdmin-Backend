import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp.ts";
import { saveDeliveryEmployeeOtp } from "@/db/actions/delivery-employee-otp.actions.ts";
import { services } from "@/services";
import type { GetUniqueVerticalDeliveryEmployeeResponse } from "@/db/actions/vertical-delivery-employee.actions";

export const sendOtpToEmployee = async (
    employee: NonNullable<GetUniqueVerticalDeliveryEmployeeResponse>,
    for_what: "login" | "forget_password" | "set_new_password" = "login"
) => {
    const is_account_found = !!employee;

    if (employee.employee.status === "suspended") {
        throw new APIError(
            "Your account has been suspended!",
            undefined,
            {
                is_account_found,
            },
            400,
        );
    }

    const employeeEmail = employee.employee.email;

    if (!employeeEmail) {
        throw new APIError("No email found for this account!", undefined, undefined, 400);
    }

    const otp = Otp.generateOtp(4);

    await saveDeliveryEmployeeOtp({
        email: employeeEmail,
        otp,
        role: employee.type,
        for_what: for_what,
    });

    const subject = for_what === "login" ? "Delivery Portal - Login OTP" : "Delivery Portal - Reset Password OTP";
    const text = for_what === "login"
        ? `Your OTP to log into your delivery platform is ${otp}`
        : `Your OTP for resetting your password is ${otp}`;

    await services.mailer.sendEmail({
        from: "ankan@sqaby.com",
        subject: subject,
        to: employeeEmail,
        text: text,
    });

    return { otp, email: employeeEmail };
};



