import { authGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { clientIdParamValidator } from "../../validators/client.validators";
import { getUniqueClient } from "@/db/actions/client.actions";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { CLIENTS_PERMISSIONS } from "@/configs/constants.ts";
import { APIError } from "@/types/error";

interface ResponseData {
	customer: any;
}

export const getClientHandler = createHandlers(
	authGuard(["admin", "employee"]),
	clientIdParamValidator,
	async (context) => {
		const { id } = context.req.valid("param");
		const { admin } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				clients: [CLIENTS_PERMISSIONS.view_client_account],
			},
		});

		const client = await getUniqueClient({ id });
		if (!client) {
			throw new APIError("Client not found", undefined, undefined, 404);
		}

		const { password, ...safeClient } = client;

		return context.json<APIResponse<ResponseData>>({
			success: true,
			code: 200,
			data: {
				customer: safeClient,
			},
		});
	},
);
