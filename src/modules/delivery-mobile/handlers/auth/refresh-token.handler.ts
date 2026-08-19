import { createHandlers } from "@/utils/hono-factory";
import { refreshTokenRequestBodyValidator } from "delivery-mobile/validators/auth.validators";
import { JWT } from "@/utils/jwt.ts";
import { APIError } from "@/types/error";
import { getUniqueVerticalDeliveryEmployee } from "@/db/actions/vertical-delivery-employee.actions";
import type { VerticalDeliveryEmployeeRoleType } from "@/types/common";
import type { APIResponse } from "@/types/api";
import type { client, vertical_delivery_employee } from "@/db/types";
import { prisma } from "@/db";
import {
	signDeliverySessionRefreshToken,
	signDeliverySessionToken,
} from "delivery/handlers/auth/delivery-auth-token";

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

		const client_id =
			employee.type === "admin"
				? (employee.employee as client).id
				: ((employee.employee as vertical_delivery_employee).client_id ?? "");

		if (!client_id) {
			throw new APIError("Employee not found", undefined, undefined, 404);
		}

		const clientRecord = await prisma.client.findUnique({
			where: { id: client_id },
			select: { auth_token_version: true },
		});

		const tokenVersion = decoded.token_version ?? 0;
		if (tokenVersion !== (clientRecord?.auth_token_version ?? 0)) {
			throw new APIError(
				"The refresh token is either invalid or has expired!",
				undefined,
				undefined,
				401,
			);
		}

		const payload = {
			role: (employee.type === "admin" ? "admin" : employee.type) as VerticalDeliveryEmployeeRoleType,
			id: employee.employee.id,
		};

		const newAuthToken = await signDeliverySessionToken(client_id, payload);
		const newRefreshToken = await signDeliverySessionRefreshToken(client_id, payload);

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
