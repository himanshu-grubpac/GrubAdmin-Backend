import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { removeBoxesAssignmentRequestBodyValidator } from "@/modules/admin/validators/box.validators.ts";
import { getBoxes, toggleAssignBoxes } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";
import { logger } from "@/utils/logger.ts";
import { Permission } from "@/utils/permission.ts";
import { GRUBPACS_PERMISSIONS } from "@/configs/constants.ts";

export const removeAssignedBoxesHandler = createHandlers(
	authGuard(["admin", "employee"]),
	removeBoxesAssignmentRequestBodyValidator,
	ipMiddleware,
	async (context) => {
		const { admin, ip, role } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				grubpac: [GRUBPACS_PERMISSIONS.assign_grubpacs],
			},
		});

		const { box_ids } = context.req.valid("json");

		const boxes = await getBoxes({
			ids: box_ids,
			fetchAll: true,
		});

		await toggleAssignBoxes({
			box_ids,
			client_id: null,
		});

		Promise.allSettled(
			boxes.boxes.map((box) =>
				services.adminLogger.log({
					module: "grubpac",
					action: "assignment",
					admin_id: admin?.id,
					admin_name: `${admin?.first_name} ${admin?.last_name}`,
					role_id: admin?.role_id,
					role_name: role?.name,
					ip,
					effected_id: box.id,
					effected_name: box.name ?? undefined,
				}),
			),
		).then((r) => logger.info(r));

		return context.json<APIResponse>(
			{
				success: true,
				code: 200,
			},
			{
				status: 200,
			},
		);
	},
);
