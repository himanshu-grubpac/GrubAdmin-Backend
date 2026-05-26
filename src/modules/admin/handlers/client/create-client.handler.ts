import { authGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { createClientRequestBodyValidator } from "../../validators/client.validators";
import { createClient, getUniqueClient } from "@/db/actions/client.actions";
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

		const body = context.req.valid("json");
		console.log("[POST /admin/customer] Validated body:", JSON.stringify({ vertical_id: body.vertical_id }));

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				clients: [CLIENTS_PERMISSIONS.add_new_entries],
			},
		});

		const { client_id, ...rest } = context.req.valid("json");
		const data = { ...rest, client_display_id: client_id };

		const existingClient = await getUniqueClient({ client_display_id: client_id });
		if (existingClient) {
			throw new APIError("Client ID already exists", undefined, undefined, 400);
		}

		const vertical = await getVertical(data.vertical_id);
		if (!vertical) {
			throw new APIError("Invalid vertical selected", undefined, undefined, 400);
		}

		if (vertical.name === "camping" && data.organization_name) {
			throw new APIError(
				"You cannot add organization name while you have an organization name",
				undefined,
				undefined,
				400,
			);
		}

		let client;
		try {
			client = await createClient({
				data,
				omit: {
					password: true,
				},
			});
		} catch (error: any) {
			if (error.code === 409) {
				services.adminLogger.log({
					module: "client",
					action: "create",
					admin_id: admin?.id,
					admin_name: `${admin?.first_name} ${admin?.last_name}`,
					role_id: admin?.role_id,
					role_name: role?.name,
					ip,
					effected_name: `[COLLISION] ${rest.email}`,
				});
			}
			throw error;
		}

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

		const { password, ...safeClient } = client as any;

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
