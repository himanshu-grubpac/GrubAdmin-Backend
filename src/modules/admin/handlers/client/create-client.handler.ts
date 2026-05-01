import { authGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { createClientRequestBodyValidator } from "../../validators/client.validators";
import { createClient } from "@/db/actions/client.actions";
import type { client } from "@/db/types";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { CLIENTS_PERMISSIONS } from "@/configs/constants.ts";
import { getVertical } from "@/db/actions/vertical.actions.ts";
import { APIError } from "@/types/error";
import { services } from "@/services";
import { ipMiddleware } from "@/middlewares/common/ip.ts";

interface ResponseData {
	customer: client;
}

export const createClientHandler = createHandlers(
	authGuard(["admin", "employee"]),
	createClientRequestBodyValidator,
	ipMiddleware,
	async (context) => {
		const { admin, role, ip } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				clients: [CLIENTS_PERMISSIONS.add_new_entries],
			},
		});

		const { client_id, ...rest } = context.req.valid("json");
		const data = { ...rest, client_display_id: client_id };

		const vertical = await getVertical(data.vertical_id);

		if (vertical?.name === "camping" && data.organization_name) {
			throw new APIError(
				"You cannot add organization name while you have an organization name",
				undefined,
				undefined,
				400,
			);
		}

		const client = await createClient({
			data,
		});

		services.adminLogger.log({
			module: "client",
			action: "create",
			admin_id: admin?.id,
			admin_name: `${admin?.first_name} ${admin?.last_name}`,
			role_id: admin?.role_id,
			role_name: role?.name,
			ip,
			effected_id: client.id,
			effected_name: client.name,
		});

		return context.json<APIResponse<ResponseData>>({
			success: true,
			code: 200,
			data: {
				customer: {
					...client,
					client_id: (client as any).client_display_id,
				} as any,
			},
		});
	},
);
