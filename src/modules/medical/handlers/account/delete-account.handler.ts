import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { APIError } from "@/types/error";
import { deleteMedicalEmployees } from "@/db/actions/medical/employee.actions";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { deleteCookie } from "hono/cookie";

export const deleteAccountHandler = createHandlers(
	medicalAuthGuard(),
	async (context) => {
		const { type, user, client_id } = context.var;

		if (type === "admin") {
			throw new APIError(
				"Administrators cannot delete their accounts through this API.",
				"medical.common.ACCESS_DENIED",
				undefined,
				400,
			);
		}

		const connectionBoxCount = await prisma.box.count({
			where: {
				medical_connection_employee_id: user.id,
				status: "active",
			},
		});

		const sharedBoxCount = await prisma.vertical_medical_employee_box.count({
			where: {
				employee_id: user.id,
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

		await deleteMedicalEmployees({ ids: [user.id], client_id });

		deleteCookie(context, "auth_token", { path: "/" });
		deleteCookie(context, "otp_id", { path: "/" });

		return context.json<APIResponse>({ success: true, code: 200 }, { status: 200 });
	},
);
