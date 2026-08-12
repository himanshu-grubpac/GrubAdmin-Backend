import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { changeMedicalDriverPassword } from "@/db/actions/medical-mobile/account.actions.ts";
import { updatePasswordRequestBodyValidator } from "@/modules/medical-mobile/driver/validators/account.validators.ts";
import type { APIResponse } from "@/types/api";

export const updatePasswordHandler = createHandlers(
	medicalMobileAuthGuard(["handler"], "driver"),
	updatePasswordRequestBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const { current_password, new_password } = context.req.valid("json");

		await changeMedicalDriverPassword({
			employee_id: user_id,
			current_password,
			new_password,
		});

		return context.json<APIResponse>({
			success: true,
			code: 200,
			message: "Password updated successfully",
		});
	},
);
