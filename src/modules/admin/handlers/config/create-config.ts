import { createHandlers } from "@/utils/hono-factory.ts";
import { createConfigRequestBodyValidator } from "@/modules/admin/validators/config.validators.ts";
import { authGuard } from "@/middlewares/auth";
import { upsertConfig } from "@/db/actions/config.actions.ts";
import { prisma } from "@/db";
import type { system_config } from "@/db/types";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { PERMISSION_TOPICS, SYSTEM_SETTINGS_PERMISSIONS } from "@/configs/constants.ts";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";

interface ResponseData {
	config: system_config;
}

export const createConfigHandler = createHandlers(
	authGuard(["admin"]),
	createConfigRequestBodyValidator,
	ipMiddleware,
	async (context) => {
		const { admin, role, ip } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				[PERMISSION_TOPICS.SYSTEM_SETTINGS]: [SYSTEM_SETTINGS_PERMISSIONS.edit_configs],
			},
		});

		const { key, value } = context.req.valid("json");
		const normalizedKey = key.trim().toLowerCase();

		const oldConfig = await prisma.system_config.findUnique({
			where: { key: normalizedKey },
		});

		const config = await upsertConfig({
			key,
			value,
		});

		services.adminLogger.log({
			module: "platform",
			action: "update",
			admin_id: admin?.id,
			admin_name: `${admin?.first_name} ${admin?.last_name}`,
			role_id: admin?.role_id ?? null,
			role_name: role?.name ?? null,
			ip,
			effected_id: config.id,
			effected_name: `${normalizedKey}: ${oldConfig?.value ?? "N/A"} -> ${value}`,
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
