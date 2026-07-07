import { createHandlers } from "@/utils/hono-factory";
import { loginRequestBodyValidator } from "delivery/validators/auth.validators";
import { activateVerticalDeliveryEmployee, resolveVerticalDeliveryEmployeeForPasswordLogin } from "@/db/actions/vertical-delivery-employee.actions";
import { APIError } from "@/types/error";
import { JWT } from "@/utils/jwt.ts";
import { loggerService } from "@/services/system-log.ts";
import { resolveMessageTemplate } from "@/utils/message";
import type { APIResponse } from "@/types/api";

import type { client, vertical_delivery_employee } from "@/db/types";

interface ResponseData {
	auth_token: string;
	is_account_found: boolean;
	is_password_set: boolean;
}

export const loginHandler = createHandlers(
	loginRequestBodyValidator,
	async (context) => {
		const { email, password, remember_me } = context.req.valid("json");

		const loginResult = await resolveVerticalDeliveryEmployeeForPasswordLogin(email, password);

		if (!loginResult.ok) {
			const is_account_found = loginResult.reason !== "not_found";

			if (loginResult.reason === "not_found") {
				throw new APIError("No employee can be found!", "delivery.auth.login.ACCOUNT_NOT_FOUND", { is_account_found: false });
			}
			if (loginResult.reason === "password_not_set") {
				throw new APIError(
					"Please login using OTP and set a password first to login using password",
					"delivery.auth.login.PASSWORD_NOT_SET",
					{ is_account_found, is_password_set: false },
				);
			}
			if (loginResult.reason === "ambiguous_account") {
				throw new APIError(
					"Multiple accounts match these credentials. Contact support.",
					"delivery.auth.login.INVALID_CREDENTIALS",
					{ is_account_found, is_password_set: true },
				);
			}
			throw new APIError(
				"Invalid login credentials, the I'd and the password does not match",
				"delivery.auth.login.INVALID_CREDENTIALS",
				{ is_account_found, is_password_set: true },
			);
		}

		const employee = loginResult.employee;
		const is_account_found = true;

		if (employee.type === "delivery" || employee.type === ("driver" as any)) {
			throw new APIError("You are not authorized to login.", "delivery.auth.login.UNAUTHORIZED", { is_account_found });
		}

		if (employee.employee.status === "suspended") {
			throw new APIError("Your account has been suspended!", "delivery.auth.login.SUSPENDED", { is_account_found });
		}

		// Also handle unassigned case for password login if they already have a password
		if (employee.employee.status === "unassigned") {
			await activateVerticalDeliveryEmployee({
				id: employee.employee.id,
				email: employee.employee.email,
				type: employee.type as any,
			});
		}

		const is_password_set = true;

		const client_id =
			employee.type === "admin"
				? (employee.employee as client).id
				: ((employee.employee as vertical_delivery_employee).client_id ?? "");

		const token = JWT.signDeliveryAuthToken({
			role:
				employee.type === "admin" ? "admin" : employee.type,
			id: employee.employee.id,
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
			},
		});

		return context.json<APIResponse<ResponseData>>({
			success: true,
			client_id,
			...resolveMessageTemplate("delivery.auth.login.SUCCESS"),
			data: {
				auth_token: token,
				is_account_found,
				is_password_set,
			},
		});
	},
);


