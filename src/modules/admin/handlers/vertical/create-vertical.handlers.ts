import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { createVerticalRequestBodyValidator } from "@/modules/admin/validators/vertical.validators.ts";
import { createVertical } from "@/db/actions/vertical.actions.ts";
import type { vertical } from "@/db/types";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";

interface ResponseData {
	vertical: vertical;
}

export const createVerticalHandler = createHandlers(
	authGuard(["admin", "employee"]),
	createVerticalRequestBodyValidator,
	async (context) => {
		const { admin } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				verticals: ["add verticals"],
			},
		});

		const { name } = context.req.valid("json");

		const vertical = await createVertical({
			name,
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					vertical,
				},
			},
			{
				status: 200,
			},
		);
	},
);
