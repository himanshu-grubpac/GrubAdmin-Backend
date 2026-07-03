import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { APIError } from "@/types/error";
import { deleteHospitalityEmployees } from "@/db/actions/hospitality/employee.actions";
import type { APIResponse } from "@/types/api";
import type { vertical_hospitality_employee } from "@/db/types";
import { prisma } from "@/db";
import { deleteCookie } from "hono/cookie";

export const deleteAccountHandler = createHandlers(
	hospitalityAuthGuard(),
	async (context) => {
		const { user, client_id } = context.var;

		const isClientUser = !("employee_display_id" in user);
		if (isClientUser) {
			throw new APIError("Administrators cannot delete their accounts through this API.", "hospitality.account.ADMIN_DELETE_BLOCKED", undefined, 400);
		}

		const employee = user as vertical_hospitality_employee;

		const connectionBoxCount = await prisma.box.count({
			where: {
				hospitality_connection_employee_id: employee.id,
				status: "active",
			},
		});

		const sharedBoxCount = await prisma.vertical_hospitality_employee_box.count({
			where: {
				employee_id: employee.id,
				box: { status: "active" },
			},
		});

		if (connectionBoxCount > 0 || sharedBoxCount > 0) {
			throw new APIError(
				"Cannot delete account: you are still assigned as an active manager/employee of active Grubpacs.",
				undefined,
				undefined,
				400,
			);
		}

		await deleteHospitalityEmployees({ ids: [employee.id], client_id });

		deleteCookie(context, "auth_token", { path: "/" });
		deleteCookie(context, "otp_id", { path: "/" });

		return context.json<APIResponse>({ success: true, code: 200 }, { status: 200 });
	},
);
