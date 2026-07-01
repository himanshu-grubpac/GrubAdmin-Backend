import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { resolveDriverBoxById } from "@/db/actions/delivery-mobile/box.actions.ts";
import { updateBoxLockStatus } from "@/db/actions/box.actions.ts";
import { boxIdParamValidator } from "@/modules/delivery-mobile/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";

export const lockBoxHandler = createHandlers(
	deliveryAuthGuard(["delivery"]),
	boxIdParamValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const user = context.get("user") as { email?: string; first_name?: string; last_name?: string };
		const employeeEmail = user.email?.trim() ?? "";
		const employeeName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
		const { box_id } = context.req.valid("param");

		const { box } = await resolveDriverBoxById({
			box_id,
			client_id,
			employee_id: user_id,
		});

		await updateBoxLockStatus({
			ids: [box.id],
			lock_status: "locked",
			user: {
				id: user_id,
				email: employeeEmail,
				name: employeeName,
			},
			client_id,
		});

		try {
			await loggerService.log({
				category: "GrubLock",
				type: "Status",
				actor: {
					id: user_id,
					name: employeeEmail || "Driver",
					role: "delivery",
					table: "vertical_delivery_employee",
				},
				client_id,
				subject: { id: box.id, name: box.box_display_id, type: "box" },
				metadata: { action: "lock" },
			});
		} catch {
			// Do not block response for logging failure
		}

		return context.json<APIResponse<null>>(
			{
				success: true,
				code: 200,
				message: "Box locked successfully",
				data: null,
			},
			{ status: 200 },
		);
	},
);
