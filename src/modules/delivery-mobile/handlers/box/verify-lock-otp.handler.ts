import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { verifyDriverLockOtp } from "@/db/actions/delivery-mobile/box.actions.ts";
import {
	boxIdParamValidator,
	verifyLockOtpBodyValidator,
} from "@/modules/delivery-mobile/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";

export const verifyLockOtpHandler = createHandlers(
	deliveryAuthGuard(["delivery"]),
	boxIdParamValidator,
	verifyLockOtpBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const user = context.get("user") as {
			email?: string;
			first_name?: string;
			last_name?: string | null;
		};
		const { box_id } = context.req.valid("param");
		const { code, action } = context.req.valid("json");

		const employeeName =
			`${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "Driver";

		await verifyDriverLockOtp({
			box_id,
			client_id,
			employee_id: user_id,
			employee_email: user.email ?? "",
			employee_name: employeeName,
			code,
			action,
		});

		try {
			await loggerService.log({
				category: "GrubLock",
				type: "OTP",
				actor: {
					id: user_id,
					name: employeeName,
					role: "delivery",
					table: "vertical_delivery_employee",
				},
				client_id,
				subject: { id: box_id, name: box_id, type: "box" },
				metadata: { action },
			});
		} catch {
			// logging must not block verify response
		}

		const message =
			action === "unlock"
				? "Grublock unlocked successfully"
				: "Grublock locked successfully";

		return context.json<APIResponse<null>>(
			{
				success: true,
				code: 200,
				message,
				data: null,
			},
			{ status: 200 },
		);
	},
);
