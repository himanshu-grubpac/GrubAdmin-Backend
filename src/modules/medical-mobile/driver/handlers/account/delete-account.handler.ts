import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { deleteAccountRequestBodyValidator } from "@/modules/medical-mobile/driver/validators/account.validators.ts";
import type { APIResponse } from "@/types/api";
import { deleteMedicalEmployees } from "@/db/actions/medical/employee.actions";
import type { vertical_medical_employee } from "@/db/types";

export const deleteAccountHandler = createHandlers(
	medicalMobileAuthGuard(["handler"], "driver"),
	deleteAccountRequestBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const user = context.get("user") as vertical_medical_employee;

		await deleteMedicalEmployees({
			ids: [user_id],
			client_id: user.client_id!,
		});

		return context.json<APIResponse>(
			{
				success: true,
				code: 200,
				message: "Account deleted successfully.",
			},
			{ status: 200 },
		);
	},
);
