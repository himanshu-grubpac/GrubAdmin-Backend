import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { confirmUpdateAccountRequestBodyValidator } from "@/modules/admin/validators/account.validators.ts";
import {
	deleteAdminUpdateOtp,
	getAdminUpdateOtp,
} from "@/db/actions/admin-update-otp.actions.ts";
import { APIError } from "@/types/error";
import { updateAdmin } from "@/db/actions/admin.actions.ts";
import type { APIResponse } from "@/types/api";

export const confirmUpdateAccountHandler = createHandlers(
	authGuard(["admin", "employee"]),
	confirmUpdateAccountRequestBodyValidator,
	async (context) => {
		const { user_id } = context.var;

		const { otp } = context.req.valid("json");

		const updateDetails = await getAdminUpdateOtp(user_id);

		if (!updateDetails) {
			throw new APIError(
				"Either the OTP was never created or maybe has expired!",
				undefined,
				undefined, 400,
			);
		}

		if (otp !== updateDetails.otp) {
			throw new APIError("Invalid OTP", undefined, undefined, 400);
		}

		if (updateDetails.email) {
			await updateAdmin({
				id: user_id,
				data: {
					email: updateDetails.email,
				},
			});
		} else if (updateDetails.mobile_number && updateDetails.country_code) {
			await updateAdmin({
				id: user_id,
				data: {
					mobile_number: updateDetails.mobile_number,
					country_code: updateDetails.country_code,
				},
			});
		}

		await deleteAdminUpdateOtp(user_id);

		return context.json<APIResponse>(
			{
				success: true,
				code: 200,
			},
			{
				status: 200,
			},
		);
	},
);
