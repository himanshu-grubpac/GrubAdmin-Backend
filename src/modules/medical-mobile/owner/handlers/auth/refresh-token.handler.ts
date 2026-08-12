import { createHandlers } from "@/utils/hono-factory";
import { refreshTokenRequestBodyValidator } from "@/modules/medical-mobile/owner/validators/auth.validators";
import { JWT } from "@/utils/jwt.ts";
import { APIError } from "@/types/error";
import { getUniqueMedicalEmployee } from "@/db/actions/medical/employee.actions";
import type { APIResponse } from "@/types/api";

interface ResponseData {
	auth_token: string;
	refresh_token: string;
}

export const refreshTokenHandler = createHandlers(
	refreshTokenRequestBodyValidator,
	async (context) => {
		const { refresh_token } = context.req.valid("json");

		const decoded = JWT.verifyMedicalMobileRefreshToken(refresh_token);

		if (!decoded?.id) {
			throw new APIError("Invalid refresh token", undefined, undefined, 401);
		}

		const employee = await getUniqueMedicalEmployee({ id: decoded.id });

		if (!employee || employee.type !== "admin") {
			throw new APIError("Employee not found", undefined, undefined, 404);
		}

		if (employee.employee.status !== "active") {
			throw new APIError("Employee is no longer active", undefined, undefined, 403);
		}

		const payload = { id: employee.employee.id, role: "admin" as const, persona: "owner" as const };
		const newAuthToken = JWT.signMedicalMobileAuthToken(payload);
		const newRefreshToken = JWT.signMedicalMobileRefreshToken(payload);

		return context.json<APIResponse<ResponseData>>({
			success: true,
			code: 200,
			data: {
				auth_token: newAuthToken,
				refresh_token: newRefreshToken,
			},
		});
	},
);
