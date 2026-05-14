import { authGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { clientIdParamValidator, updateClientRequestBodyValidator } from "../../validators/client.validators";
import { updateClient } from "@/db/actions/client.actions";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { CLIENTS_PERMISSIONS } from "@/configs/constants.ts";
import { services } from "@/services";
import { ipMiddleware } from "@/middlewares/common/ip.ts";

interface ResponseData {
	customer: any;
}

export const updateClientHandler = createHandlers(
	authGuard(["admin", "employee"]),
	clientIdParamValidator,
	updateClientRequestBodyValidator,
	ipMiddleware,
	async (context) => {
		const { id } = context.req.valid("param");
		const data = context.req.valid("json");
		const { admin, role, ip } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				clients: [CLIENTS_PERMISSIONS.edit_entries],
			},
		});

		let updatedClient;
		try {
			updatedClient = await updateClient({
				id,
				data,
				omit: { password: true },
			});
		} catch (error: any) {
			if (error.code === 409) {
				services.adminLogger.log({
					module: "client",
					action: "update",
					admin_id: admin?.id,
					admin_name: `${admin?.first_name} ${admin?.last_name}`,
					role_id: admin?.role_id,
					role_name: role?.name,
					ip,
					effected_name: `[UPDATE COLLISION] ${data.email}`,
				});
			}
			throw error;
		}

		services.adminLogger.log({
			module: "client",
			action: "update",
			admin_id: admin?.id,
			admin_name: `${admin?.first_name} ${admin?.last_name}`,
			role_id: admin?.role_id,
			role_name: role?.name,
			ip,
			effected_id: updatedClient.id,
			effected_name: updatedClient.name,
		});

		const { password, ...safeClient } = updatedClient as any;

		return context.json<APIResponse<ResponseData>>({
			success: true,
			code: 200,
			data: {
				customer: {
					...safeClient,
					client_id: safeClient.client_display_id,
				},
			},
		});
	},
);
