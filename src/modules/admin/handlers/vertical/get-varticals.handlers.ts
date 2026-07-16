import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";
import type { vertical } from "@/db/types";
import { getVerticals } from "@/db/actions/vertical.actions.ts";
import { BOX_VERTICALS, VERTICALS_PERMISSIONS } from "@/configs/constants";
import { Permission } from "@/utils/permission.ts";

interface ResponseData {
	verticals: vertical[];
}

export const getVerticalsHandler = createHandlers(
	authGuard(["admin", "employee"]),
	async (context) => {
		const { admin } = context.var;

		const perms = Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				verticals: [VERTICALS_PERMISSIONS.view_verticals],
			},
		});

		const allVerticals = await getVerticals();
		const allowlist = BOX_VERTICALS.map((v) => v.toLowerCase());
		let verticals = allVerticals.filter((v) =>
			allowlist.includes(v.name.toLowerCase()),
		);

		if (!perms.is_super_admin) {
			const verticalsAllowed = new Set(
				(perms.perm["verticals"] || []).map((v) => v.toLowerCase()),
			);
			verticals = verticals.filter((v) =>
				verticalsAllowed.has(v.name.toLowerCase()),
			);
		}

		return context.json<APIResponse<ResponseData>>({
			success: true,
			code: 200,
			data: {
				verticals,
			},
		});
	},
);
