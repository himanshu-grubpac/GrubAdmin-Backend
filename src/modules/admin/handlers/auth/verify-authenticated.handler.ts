import { getUniqueAdmin } from "@/db/actions/admin.actions";
import { authGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";
import type { UserType } from "@/types/common";
import { APIError } from "@/types/error";
import { createHandlers } from "@/utils/hono-factory";
import { logger } from "@/utils/logger.ts";
import { prisma } from "@/db";

interface ResponseData {
	type: UserType;
	roles: string[];
}

export const verifyAuthenticatedHandler = createHandlers(
	authGuard(["admin", "employee"]),
	async (context) => {
		const { user_id } = context.var;

		const admin = await getUniqueAdmin({
			id: user_id,
		});

		if (!admin) {
			throw new APIError("No admin found!", undefined, undefined, 400);
		}



		if (admin.user.status === "suspended") {
			throw new APIError(
				"Your account has been suspended!",
				undefined,
				undefined,
				401,
			);
		}

		let roles: string[] = [];
		if (admin.user.role_id) {
			const role = await prisma.role.findUnique({
				where: { id: admin.user.role_id },
				select: { name: true, permissions_json: true },
			});
			if (role) {
				roles = typeof role.permissions_json === "object" && role.permissions_json !== null
					? Object.values(role.permissions_json as Record<string, string>)
					: [role.name];
			}
		}

		return context.json<APIResponse<ResponseData>>({
			success: true,
			code: 200,
			data: {
				type: admin.type,
				roles,
			},
		});
	},
);

