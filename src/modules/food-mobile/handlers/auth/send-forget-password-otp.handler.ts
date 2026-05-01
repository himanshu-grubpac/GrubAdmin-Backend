import { createHandlers } from "@/utils/hono-factory.ts";
import { sendForgetPasswordOtpRequestBodyValidator } from "food-mobile/validators/auth.validators.ts";
import { getUniqueVerticalFoodEmployee } from "@/db/actions/vertical-food-employee.actions";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { sendOtpToEmployee } from "./auth.utils.ts";

export const sendForgetPasswordOtpHandler = createHandlers(
	sendForgetPasswordOtpRequestBodyValidator,
	async (context) => {
		const { email, phone } = context.req.valid("json");


		const employee = await getUniqueVerticalFoodEmployee({
			email,
			phone,
		});


		const is_account_found = !!employee;

		if (!employee) {
			throw new APIError("No Employee found!", undefined, {
				is_account_found,
			}, 404);
		}

		const { email: sentToEmail } = await sendOtpToEmployee(employee, "forget_password");

		return context.json<APIResponse<{ otp_details: { type: string; values: string[] } }> & { is_account_found: boolean }>({
			success: true,
			code: 200,
			is_account_found,
			data: {
				otp_details: {
					type: "email",
					values: [sentToEmail],
				},
			},
		});
	},
);


