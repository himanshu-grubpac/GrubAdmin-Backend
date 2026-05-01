import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { confirmUpdateAccountRequestBodyValidator } from "food/validators/account.validators.ts";
import {
	deleteFoodEmployeeUpdateOtp,
	getFoodEmployeeUpdateOtp,
} from "@/db/actions/food-employe-update-otp.actions.ts";
import { APIError } from "@/types/error";
import { updateVerticalFoodEmployee } from "@/db/actions/vertical-food-employee.actions";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";

import { getCookie, setCookie } from "hono/cookie";

export const confirmUpdateAccountHandler = createHandlers(
	foodAuthGuard(),
	confirmUpdateAccountRequestBodyValidator,
	async (context) => {
		const { user, type } = context.var;

		const { otp, otp_id: otp_id_body } = context.req.valid("json");
		const otp_id_cookie = getCookie(context, "otp_id");
		const target_otp_id = otp_id_body || otp_id_cookie;

		const updatedDetails = await getFoodEmployeeUpdateOtp(user.id, target_otp_id);

		if (!updatedDetails) {
			throw new APIError(undefined, "food.account.NO_CHANGE_REQUESTS");
		}

		if (otp !== updatedDetails.otp) {
			throw new APIError(undefined, "food.auth.login.OTP_INVALID");
		}

		// Build the update payload — applied to correct table via type
		const updateData: any = {
			id: user.id,
			type,
		};

		if (updatedDetails.email) updateData.email = updatedDetails.email;
		if (updatedDetails.mobile_number)
			updateData.mobile_number = updatedDetails.mobile_number;
		if (updatedDetails.country_code)
			updateData.country_code = updatedDetails.country_code;
		if (updatedDetails.first_name)
			updateData.first_name = updatedDetails.first_name;
		if (updatedDetails.last_name !== null && updatedDetails.last_name !== undefined)
			updateData.last_name = updatedDetails.last_name;

		// organization_name → mapped to "organization" arg → updates client.organization_name
		if (updatedDetails.organization_name)
			updateData.organization = updatedDetails.organization_name;

		// updateVerticalFoodEmployee routes to client or vertical_food_employee based on type
		await updateVerticalFoodEmployee(updateData);

		await deleteFoodEmployeeUpdateOtp(user.id);

		const otp_id = updatedDetails.otp_id;
		setCookie(context, "otp_id", otp_id, {
			path: "/",
			httpOnly: true,
			maxAge: 60 * 5,
			sameSite: "Lax",
		});

		const response = {
			success: true as const,
			...resolveMessageTemplate("food.employee.profile.UPDATE_SUCCESS", { id: user.id }),
			is_otp: false,
			has_changed: true,
			message_debug: "The OTP has been successfully verified, and the requested changes have been applied.",
			data: {
				otp_id,
			},
		};

		return context.json(response as any, response.code as any);
	},
);

