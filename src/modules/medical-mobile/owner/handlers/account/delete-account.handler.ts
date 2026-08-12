import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { deleteAccountRequestBodyValidator } from "@/modules/medical-mobile/owner/validators/account.validators.ts";
import type { APIResponse } from "@/types/api";
import { revokeOwnerMobileAccess } from "@/db/actions/medical-mobile/owner-box.actions.ts";

export const deleteAccountHandler = createHandlers(
	medicalMobileAuthGuard(["admin"], "owner"),
	deleteAccountRequestBodyValidator,
	async (context) => {
		const client_id = context.get("client_id");

		await revokeOwnerMobileAccess(client_id);

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
