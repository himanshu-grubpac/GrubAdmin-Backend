import { createHandlers } from "@/utils/hono-factory.ts";
import { verifyOtpRequestBodyValidator } from "food/validators/auth.validators.ts";
import {
	deleteSavedFoodEmployeeOtp,
	getSavedFoodEmployeeOtp,
} from "@/db/actions/food-employee-otp.actions.ts";
import { APIError } from "@/types/error";
import {
	activateVerticalFoodEmployee,
	getUniqueVerticalFoodEmployee,
} from "@/db/actions/vertical-food-employee.actions";
import { JWT } from "@/utils/jwt.ts";
import type { APIResponse } from "@/types/api";
import type { client, vertical_food_employee } from "@/db/types";
import { loggerService } from "@/services/system-log.ts";
import { getCookie } from "hono/cookie";

interface ResponseData {
	auth_token: string;
	otp_for_what: string;
	is_password_set: boolean;
}

export const verifyOtpHandler = createHandlers(
	verifyOtpRequestBodyValidator,
	async (context) => {
		const { email, otp, otp_id: otp_id_body } = context.req.valid("json");
		const otp_id_cookie = getCookie(context, "otp_id");
		const target_otp_id = otp_id_body || otp_id_cookie;

		const savedOtp = await getSavedFoodEmployeeOtp(email, target_otp_id);

		if (!savedOtp) {
			throw new APIError(undefined, "food.auth.login.OTP_EXPIRED");
		}

		if (savedOtp.otp !== otp || savedOtp.for_what !== "login") {
			throw new APIError(undefined, "food.auth.login.OTP_INVALID");
		}

		const for_what = savedOtp.for_what;

		await deleteSavedFoodEmployeeOtp(email);

		const employee = await getUniqueVerticalFoodEmployee({
			email,
		});

		if (!employee?.employee) {
			throw new APIError(undefined, "food.auth.login.ACCOUNT_NOT_FOUND");
		}

		if (
			employee.employee.status === "suspended"
		) {
			throw new APIError(undefined, "food.auth.login.SUSPENDED");
		}

		if (employee.type === "delivery" || employee.type === ("driver" as any)) {
			throw new APIError(undefined, "food.auth.login.UNAUTHORIZED");
		}

		if (employee.employee.status === "unassigned") {
			await activateVerticalFoodEmployee({
				email: email,
				type: employee.type,
			});
		}

		const client_id =
			employee.type === "admin"
				? (employee.employee as client).id
				: ((employee.employee as vertical_food_employee).client_id ?? "");

		const token = JWT.signFoodAuthToken({
			id: employee.employee.id,
			role: employee.type,
		});

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
				table: employee.type === "admin" ? "client" : "vertical_food_employee",
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
				},
			},
			{
				status: 200,
			},
		);
	},
);


