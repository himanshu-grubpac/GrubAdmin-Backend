import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { changeMedicalOwnerPassword } from "@/db/actions/medical-mobile/account.actions.ts";
import { updatePasswordRequestBodyValidator } from "@/modules/medical-mobile/owner/validators/account.validators.ts";
import type { APIResponse } from "@/types/api";

export const updatePasswordHandler = createHandlers(
	medicalMobileAuthGuard(["admin"], "owner"),
	updatePasswordRequestBodyValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const { current_password, new_password } = context.req.valid("json");

		await changeMedicalOwnerPassword({
			client_id,
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
