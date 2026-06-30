import { createHandlers } from "@/utils/hono-factory";
import { refreshTokenRequestBodyValidator } from "delivery-mobile/validators/auth.validators";
import { JWT } from "@/utils/jwt.ts";
import { APIError } from "@/types/error";
import { getUniqueVerticalDeliveryEmployee } from "@/db/actions/vertical-delivery-employee.actions";
import type { APIResponse } from "@/types/api";

interface ResponseData {
	auth_token: string;
	refresh_token: string;
}

export const refreshTokenHandler = createHandlers(
	refreshTokenRequestBodyValidator,
	async (context) => {
		const { refresh_token } = context.req.valid("json");

		const decoded = JWT.verifyDeliveryRefreshToken(refresh_token);

		if (!decoded || !decoded.id) {
			throw new APIError("Invalid refresh token", undefined, undefined, 401);
		}

		const employee = await getUniqueVerticalDeliveryEmployee({
			id: decoded.id,
		});

		if (!employee) {
			throw new APIError("Employee not found", undefined, undefined, 404);
		}

		if (employee.employee.status !== "active") {
			throw new APIError("Employee is no longer active", undefined, undefined, 403);
		}

		const payload = {
			role: employee.type === "admin" ? "admin" : employee.type,
			id: employee.employee.id,
		};

		const newAuthToken = JWT.signDeliveryAuthToken(payload as any);
		const newRefreshToken = JWT.signDeliveryRefreshToken(payload as any);

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
