import { createMiddleware } from "hono/factory";
import type { vertical_camping_consumer } from "@/db/types";
import { APIError } from "@/types/error";
import { JWT } from "@/utils/jwt.ts";
import { getUniqueCampingConsumer } from "@/db/actions/camp-consumer/consumer.actions";
import { logger } from "@/utils/logger";

export const campingAuthGuard = () =>
	createMiddleware<{
		Variables: {
			user_id: string;
			client_id: string | null;
			user: vertical_camping_consumer;
		};
	}>(async (context, next) => {
		const authToken = context.req.header("authorization")?.split(" ")[1];

		if (!authToken) {
			throw new APIError("Unauthenticated access", undefined, undefined, 401);
		}

		const tokenUser = JWT.verifyCampingAuthToken(authToken);
		const consumer = await getUniqueCampingConsumer({ id: tokenUser.id });

		if (!consumer) {
			logger.error(`[Auth] Camping consumer lookup failed: userId=${tokenUser.id}`);
			throw new APIError("No consumer found... unauthorized access", undefined, undefined, 403);
		}

		if (consumer.status !== "active") {
			throw new APIError("Your account is not active.", undefined, undefined, 403);
		}

		const tokenVersion = tokenUser.token_version ?? 0;
		if (tokenVersion !== (consumer.auth_token_version ?? 0)) {
			throw new APIError(
				"The auth token is either invalid or has expired!",
				undefined,
				undefined,
				401,
			);
		}

		context.set("user", consumer);
		context.set("user_id", consumer.id);
		context.set("client_id", consumer.client_id);

		await next();
	});
