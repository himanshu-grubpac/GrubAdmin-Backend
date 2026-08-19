import { createHandlers } from "@/utils/hono-factory.ts";
import { verifyOtpRequestBodyValidator } from "delivery/validators/auth.validators.ts";
import {
	deleteSavedDeliveryEmployeeOtp,
	getSavedDeliveryEmployeeOtp,
	compareOtp,
} from "@/db/actions/delivery-employee-otp.actions.ts";
import { DeliveryEmployeeOtp } from "@/db/mongo-schema/delivery-employee-otp.model.ts";
import { APIError } from "@/types/error";
import {
	activateVerticalDeliveryEmployee,
	resolveVerticalDeliveryEmployeeForEmailAuth,
} from "@/db/actions/vertical-delivery-employee.actions";
import type { APIResponse } from "@/types/api";
import type { client, vertical_delivery_employee } from "@/db/types";
import { loggerService } from "@/services/system-log.ts";
import { getCookie } from "hono/cookie";
import { signDeliverySessionToken } from "delivery/handlers/auth/delivery-auth-token";

interface ResponseData {
	auth_token: string;
	otp_for_what: string;
	is_password_set: boolean;
	client_id: string;
}

export const verifyOtpHandler = createHandlers(
	verifyOtpRequestBodyValidator,
	async (context) => {
		const { email, otp, otp_id: otp_id_body, remember_me } = context.req.valid("json");
		const otp_id_cookie = getCookie(context, "otp_id");
		const target_otp_id = otp_id_body || otp_id_cookie;

		const savedOtp = await getSavedDeliveryEmployeeOtp(email, target_otp_id);

		if (!savedOtp) {
			throw new APIError(undefined, "delivery.auth.login.OTP_EXPIRED");
		}

		const isMatch = await compareOtp(otp, savedOtp.otp);

		if (!isMatch || savedOtp.for_what !== "login") {
			const attempts = (savedOtp.failed_attempts ?? 0) + 1;
			if (attempts >= 3) {
				await deleteSavedDeliveryEmployeeOtp(email);
				throw new APIError(undefined, "delivery.auth.login.OTP_EXPIRED");
			} else {
				await DeliveryEmployeeOtp.updateOne({ _id: savedOtp._id }, { failed_attempts: attempts });
				throw new APIError(undefined, "delivery.auth.login.OTP_INVALID");
			}
		}

		const for_what = savedOtp.for_what;

		await deleteSavedDeliveryEmployeeOtp(email);

		const resolved = await resolveVerticalDeliveryEmployeeForEmailAuth(email);

		if (!resolved.ok) {
			if (resolved.reason === "ambiguous_account") {
				throw new APIError(
					"Multiple accounts match this email. Contact support.",
					"delivery.auth.login.INVALID_CREDENTIALS",
				);
			}
			throw new APIError(undefined, "delivery.auth.login.ACCOUNT_NOT_FOUND");
		}

		const employee = resolved.employee;

		if (
			employee.employee.status === "suspended"
		) {
			throw new APIError(undefined, "delivery.auth.login.SUSPENDED");
		}

		if (employee.type === "delivery" || employee.type === ("driver" as any)) {
			throw new APIError(undefined, "delivery.auth.login.UNAUTHORIZED");
		}

		if (employee.employee.status === "unassigned") {
			await activateVerticalDeliveryEmployee({
				id: employee.employee.id,
				email: email,
				type: employee.type,
			});
		}

		const client_id =
			employee.type === "admin"
				? (employee.employee as client).id
				: ((employee.employee as vertical_delivery_employee).client_id ?? "");

		const token = await signDeliverySessionToken(
			client_id,
			{
				id: employee.employee.id,
				role: employee.type,
			},
			remember_me ? ("7d" as const) : ("24h" as const),
		);

		// Log access
		const emp = employee.employee as any;
		const actorName = employee.type === "admin" 
			? emp.name 
			: `${emp.first_name} ${emp.last_name || ""}`.trim();

		await loggerService.log({
			category: "Profile",
			type: "Access",
			actor: {
				id: emp.id,
				name: actorName,
				role: employee.type as any,
				table: employee.type === "admin" ? "client" : "vertical_delivery_employee",
			},
			client_id,
			subject: {
				id: emp.id,
				name: actorName,
				type: "employee",
			},
			metadata: {
				action: "login",
				via: "otp",
			},
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				client_id,
				data: {
					auth_token: token,
					otp_for_what: for_what,
					is_password_set: !!employee.employee.password,
					client_id,
				},
			},
			{
				status: 200,
			},
		);
	},
);


