import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { deleteAccountRequestBodyValidator } from "hospitality/validators/account.validators.ts";
import { APIError } from "@/types/error";
import { deleteHospitalityEmployees } from "@/db/actions/hospitality/employee.actions";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { deleteCookie } from "hono/cookie";
import { consumeHospitalityEmployeeOtp } from "@/db/actions/hospitality-otp.actions.ts";
import { normalizeAuthEmail } from "hospitality/handlers/auth/auth.utils";
import { clearHospitalityAuthCookie } from "hospitality/utils/hospitality-auth-cookie";

const getDeleteBlockReason = async (user: { id: string }) => {
	const connectionBoxCount = await prisma.box.count({
		where: {
			hospitality_connection_employee_id: user.id,
			status: "active",
		},
	});

	const sharedBoxCount = await prisma.vertical_hospitality_employee_box.count({
		where: {
			employee_id: user.id,
			box: { status: "active" },
		},
	});

	if (connectionBoxCount > 0 || sharedBoxCount > 0) {
		return "Cannot delete account: you are still assigned as an active manager/employee of active Grubpacs.";
	}

	return null;
};

export const deleteAccountHandler = createHandlers(
	hospitalityAuthGuard(),
	deleteAccountRequestBodyValidator,
	async (context) => {
		const { user, client_id } = context.var;
		const { email, otp, otp_id } = context.req.valid("json");
		const normalizedEmail = normalizeAuthEmail(email);

		const userEmail = user.email;
		if (!userEmail || normalizeAuthEmail(userEmail) !== normalizedEmail) {
			throw new APIError("Email does not match the authenticated account.", undefined, undefined, 403);
		}

		const consumeResult = await consumeHospitalityEmployeeOtp(normalizedEmail, otp, otp_id);
		if (!consumeResult.consumed) {
			throw new APIError(undefined, "hospitality.auth.login.OTP_INVALID", undefined, 400);
		}

		const blockReason = await getDeleteBlockReason(user);
		if (blockReason) {
			throw new APIError(blockReason, undefined, undefined, 400);
		}

		const isClientUser = !("employee_display_id" in user);

		if (isClientUser) {
			await prisma.client.update({
				where: { id: user.id },
				data: { status: "inactive", auth_token_version: { increment: 1 } },
			});
		} else {
			await deleteHospitalityEmployees({ ids: [user.id], client_id });
		}

		clearHospitalityAuthCookie(context);
		deleteCookie(context, "otp_id", { path: "/" });

		return context.json<APIResponse>({ success: true, code: 200 }, { status: 200 });
	},
);

export { getDeleteBlockReason };
