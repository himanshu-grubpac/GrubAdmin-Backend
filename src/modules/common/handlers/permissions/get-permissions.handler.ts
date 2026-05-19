import { createHandlers } from "@/utils/hono-factory.ts";
import {
	BOX_VERTICALS,
	CLIENTS_PERMISSIONS,
	DASHBOARD_PERMISSIONS,
	EMPLOYEES_PERMISSIONS,
	GRUBPACS_PERMISSIONS,
	PERMISSION_TOPICS,
	ROLES_PERMISSIONS,
	SUPPORT_PERMISSIONS,
	SYSTEM_SETTINGS_PERMISSIONS,
	VERTICALS_PERMISSIONS,
} from "@/configs/constants.ts";
import type { APIResponse } from "@/types/api";

interface ResponseData {
	permissions: Record<string, string[]>;
}

export const getPermissionsHandler = createHandlers(async (context) => {
	const permissions: Record<string, string[]> = {
		[PERMISSION_TOPICS.DASHBOARD]: Object.values(DASHBOARD_PERMISSIONS),
		[PERMISSION_TOPICS.EMPLOYEES]: Object.values(EMPLOYEES_PERMISSIONS),
		[PERMISSION_TOPICS.ROLES]: Object.values(ROLES_PERMISSIONS),
		[PERMISSION_TOPICS.CLIENTS]: Object.values(CLIENTS_PERMISSIONS),
		[PERMISSION_TOPICS.SUPPORT]: Object.values(SUPPORT_PERMISSIONS),
		[PERMISSION_TOPICS.GRUBPACS]: Object.values(GRUBPACS_PERMISSIONS),
		[PERMISSION_TOPICS.SYSTEM_SETTINGS]: Object.values(SYSTEM_SETTINGS_PERMISSIONS),
		verticals: [...BOX_VERTICALS, ...Object.values(VERTICALS_PERMISSIONS)],
	};

	return context.json<APIResponse<ResponseData>>({
		success: true,
		code: 200,
		data: {
			permissions,
		},
	});
});
