import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { assignBoxesRequestBodyValidator } from "@/modules/admin/validators/box.validators.ts";
import { getBoxes, toggleAssignBoxes } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";
import { logger } from "@/utils/logger.ts";

export const assignBoxesHandler = createHandlers(
	authGuard(["admin", "employee"]),
	assignBoxesRequestBodyValidator,
	ipMiddleware,
	async (context) => {
		const { admin, ip, role } = context.var;

		const { box_ids, customer } = context.req.valid("json");

		const boxes = await getBoxes({
			ids: box_ids,
			fetchAll: true,
		});

		await toggleAssignBoxes({
			box_ids,
			client_id: customer,
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
