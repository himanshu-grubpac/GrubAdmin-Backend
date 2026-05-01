import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { deleteBoxesRequestBodyValidator } from "@/modules/admin/validators/box.validators.ts";
import { deleteBoxes, getBoxes } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";
import { logger } from "@/utils/logger.ts";

export const deleteBoxesHandler = createHandlers(
	authGuard(["admin", "employee"]),
	deleteBoxesRequestBodyValidator,
	ipMiddleware,
	async (context) => {
		const { admin, ip, role } = context.var;

		const { box_ids } = context.req.valid("json");

		const boxes = await getBoxes({
			ids: box_ids,
			fetchAll: true,
		});

		await deleteBoxes({
			box_ids,
		});

		Promise.allSettled(
			boxes.boxes.map((box) =>
				services.adminNotifications.notifyDeletion({
					itemType: "Box",
					itemName: box.name ?? "",
					itemId: box.id,
					employeeName: admin?.first_name ?? "",
					employeeId: admin?.id ?? "",
				}),
			),
		).then((r) => logger.info(r));

		Promise.allSettled(
			boxes.boxes.map((box) =>
				services.adminLogger.log({
					module: "grubpac",
					action: "delete",
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
