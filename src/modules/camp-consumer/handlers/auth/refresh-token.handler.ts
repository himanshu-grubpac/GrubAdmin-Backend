import { createHandlers } from "@/utils/hono-factory";
import { refreshTokenRequestBodyValidator } from "@/modules/camp-consumer/validators/auth.validators";
import { JWT } from "@/utils/jwt.ts";
import { APIError } from "@/types/error";
import { getUniqueCampingConsumer } from "@/db/actions/camp-consumer/consumer.actions";
import type { APIResponse } from "@/types/api";
import { buildCampingAuthPayload } from "./auth.utils.ts";

interface ResponseData {
	auth_token: string;
	refresh_token: string;
}

export const refreshTokenHandler = createHandlers(
	refreshTokenRequestBodyValidator,
	async (context) => {
		const { refresh_token } = context.req.valid("json");

		const decoded = JWT.verifyCampingRefreshToken(refresh_token);

		if (!decoded?.id) {
			throw new APIError("Invalid refresh token", undefined, undefined, 401);
		}

		const consumer = await getUniqueCampingConsumer({ id: decoded.id });

		if (!consumer) {
			throw new APIError("Consumer not found", undefined, undefined, 404);
		}

		if (consumer.status !== "active") {
			throw new APIError("Consumer is no longer active", undefined, undefined, 403);
		}

		const tokenVersion = decoded.token_version ?? 0;
		if (tokenVersion !== (consumer.auth_token_version ?? 0)) {
			throw new APIError("Invalid refresh token", undefined, undefined, 401);
		}

		const payload = buildCampingAuthPayload(consumer);
		const newAuthToken = JWT.signCampingAuthToken(payload);
		const newRefreshToken = JWT.signCampingRefreshToken(payload);

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
