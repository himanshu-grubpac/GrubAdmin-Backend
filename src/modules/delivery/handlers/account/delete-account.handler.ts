import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { APIError } from "@/types/error";
import { deleteVerticalDeliveryEmployees } from "@/db/actions/vertical-delivery-employee.actions";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { deleteCookie } from "hono/cookie";

export const deleteAccountHandler = createHandlers(
	deliveryAuthGuard(),
	async (context) => {
		const { type, user, client_id } = context.var;

		if (type === "admin") {
			throw new APIError("Administrators cannot delete their accounts through this API.", "delivery.account.ADMIN_DELETE_BLOCKED", undefined, 400);
		}

		// 1. Check if assigned as connection_employee on any active box
		const connectionBoxCount = await prisma.box.count({
			where: {
				connection_employee_id: user.id,
				status: "active",
			},
		});

		// 2. Check if assigned to any shared employee boxes
		const sharedBoxCount = await prisma.vertical_delivery_employee_box.count({
			where: {
				employee_id: user.id,
				box: { status: "active" },
			},
		});

		if (connectionBoxCount > 0 || sharedBoxCount > 0) {
			throw new APIError(
				"Cannot delete account: you are still assigned as an active manager/employee of active Grubpacs.",
				"delivery.account.DELETE_BLOCKED",
				undefined,
				400
			);
		}

		await deleteVerticalDeliveryEmployees({
			ids: [user.id],
			client_id,
		});

		// Invalidate session cookies cleanly
		deleteCookie(context, "auth_token", { path: "/" });
		deleteCookie(context, "otp_id", { path: "/" });

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

