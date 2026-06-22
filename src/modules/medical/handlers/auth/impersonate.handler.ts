import { createHandlers } from "@/utils/hono-factory";
import { medicalAuthGuard } from "@/middlewares/auth";
import { APIError } from "@/types/error";
import { JWT } from "@/utils/jwt.ts";
import type { APIResponse } from "@/types/api";
import { getUniqueMedicalEmployee } from "@/db/actions/medical/employee.actions";

interface ResponseData {
	auth_token: string;
}

export const medicalImpersonateHandler = createHandlers(
	medicalAuthGuard(["admin"]),
	async (context) => {
		const { user_id, client_id } = context.var;
		const { client_id: targetClientId } = context.req.valid("json") as any;

		if (!targetClientId) {
			throw new APIError("Please provide a client ID to impersonate", undefined, undefined, 400);
		}

		const token = JWT.signImpersonationToken({
			admin_id: user_id,
			client_id: targetClientId,
			role: "impersonation",
		});

		return context.json<APIResponse<ResponseData>>({
			success: true,
			message: "Impersonation token generated successfully.",
			code: 200,
			client_id,
			data: {
				auth_token: token,
			},
		});
	},
);
