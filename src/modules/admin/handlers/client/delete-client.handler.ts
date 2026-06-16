import { authGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { clientIdParamValidator } from "../../validators/client.validators";
import { deleteClient } from "@/db/actions/client.actions";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { CLIENTS_PERMISSIONS } from "@/configs/constants.ts";
import { services } from "@/services";
import { ipMiddleware } from "@/middlewares/common/ip.ts";

export const deleteClientHandler = createHandlers(
	authGuard(["admin", "employee"]),
	clientIdParamValidator,
	ipMiddleware,
	async (context) => {
		const { id } = context.req.valid("param");
		const { admin, role, ip } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				clients: [CLIENTS_PERMISSIONS.delete_entries],
			},
		});

		const deletedClient = await deleteClient(id);

		services.adminNotifications.notifyDeletion({
			itemType: "Client",
			itemName: deletedClient.name ?? "",
			itemId: deletedClient.id,
			employeeName: admin?.first_name ?? "",
			employeeId: admin?.id ?? "",
		});

		services.adminLogger.log({
			module: "client",
			action: "delete",
			admin_id: admin?.id,
			admin_name: `${admin?.first_name} ${admin?.last_name}`,
			role_id: admin?.role_id,
			role_name: role?.name,
			ip,
			effected_id: deletedClient.id,
			effected_name: deletedClient.name,
		});

		return context.json<APIResponse<null>>({
			success: true,
			code: 200,
			message: "Client deleted successfully",
		});
	},
);
