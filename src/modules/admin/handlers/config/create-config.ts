import { createHandlers } from "@/utils/hono-factory.ts";
import { createConfigRequestBodyValidator } from "@/modules/admin/validators/config.validators.ts";
import { authGuard } from "@/middlewares/auth";
import { createConfig } from "@/db/actions/config.actions.ts";
import type { system_config } from "@/db/types";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";

interface ResponseData {
	config: system_config;
}

export const createConfigHandler = createHandlers(
	createConfigRequestBodyValidator,
	authGuard(["admin"]),
	async (context) => {
		const { admin } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {},
		});

		const { key, value } = context.req.valid("json");

		const config = await createConfig({
			key,
			value,
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					config,
				},
			},
			{
				status: 200,
			},
		);
	},
);
