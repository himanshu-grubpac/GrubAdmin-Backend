import type { UserType } from "@/types/common";
import { APIError } from "@/types/error";
import { createMiddleware } from "hono/factory";
import { JWT } from "@/utils/jwt";
import type { admin, role } from "@/db/types";
import { getUniqueAdmin } from "@/db/actions/admin.actions.ts";

export const authGuard = (type?: UserType[]) =>
	createMiddleware<{
		Variables: {
			user_id: string;
			type: UserType;
			admin?: admin;
			role?: role | null;
		};
	}>(async (context, next) => {
		const authToken = context.req.header("authorization")?.split(" ")[1];

		if (!authToken) {
			throw new APIError("Unauthenticated access", undefined, undefined, 401);
		}

		const user = JWT.verifyAuthToken(authToken);

		if (type?.includes("admin") || type?.includes("employee")) {
			const admin = await getUniqueAdmin({
				id: user.id,
			});

			if (!admin) {
				throw new APIError("You are not an admin", undefined, undefined, 403);
			}

			context.set("admin", admin.user);
			context.set("role", admin.user.role);
		}

		context.set("user_id", user.id);
		context.set("type", user.role);

		return next();
	});
