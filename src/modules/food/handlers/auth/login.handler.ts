import { createHandlers } from "@/utils/hono-factory";
import { loginRequestBodyValidator } from "food/validators/auth.validators";
import { activateVerticalFoodEmployee, getUniqueVerticalFoodEmployee } from "@/db/actions/vertical-food-employee.actions";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { JWT } from "@/utils/jwt.ts";
import { loggerService } from "@/services/system-log.ts";
import { resolveMessageTemplate } from "@/utils/message";
import type { APIResponse } from "@/types/api";

import type { client, vertical_food_employee } from "@/db/types";

interface ResponseData {
	auth_token: string;
	is_account_found: boolean;
	is_password_set: boolean;
}

export const loginHandler = createHandlers(
	loginRequestBodyValidator,
	async (context) => {
		const { email, password, remember_me } = context.req.valid("json");

		const employee = await getUniqueVerticalFoodEmployee({
			email,
		});

		console.log(employee);

		const is_account_found = !!employee;

		if (!employee) {
			throw new APIError("No employee can be found!", "food.auth.login.ACCOUNT_NOT_FOUND", { is_account_found });
		}

		if (employee.type === "delivery" || employee.type === ("driver" as any)) {
			throw new APIError("You are not authorized to login.", "food.auth.login.UNAUTHORIZED", { is_account_found });
		}

		if (employee.employee.status === "suspended") {
			throw new APIError("Your account has been suspended!", "food.auth.login.SUSPENDED", { is_account_found });
		}

		// Also handle unassigned case for password login if they already have a password
		if (employee.employee.status === "unassigned") {
			await activateVerticalFoodEmployee({
				email: employee.employee.email,
				type: employee.type as any,
			});
		}

		const is_password_set = !!employee.employee.password;

		if (!employee.employee.password) {
			throw new APIError(
				"Please login using OTP and set a password first to login using password",
				"food.auth.login.PASSWORD_NOT_SET",
				{
					is_account_found,
					is_password_set,
				}
			);
		}

		const isCorrectPassword = await Bcrypt.compareHash({
			data: password,
			hashedValue: employee.employee.password,
		});

		if (!isCorrectPassword) {
			throw new APIError(
				"Invalid login credentials, the I'd and the password does not match",
				"food.auth.login.INVALID_CREDENTIALS",
				{
					is_account_found,
					is_password_set,
				}
			);
		}

		const client_id =
			employee.type === "admin"
				? (employee.employee as client).id
				: ((employee.employee as vertical_food_employee).client_id ?? "");

		const token = JWT.signFoodAuthToken({
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
			},
		});

		return context.json<APIResponse<ResponseData>>({
			success: true,
			client_id,
			...resolveMessageTemplate("food.auth.login.SUCCESS"),
			data: {
				auth_token: token,
				is_account_found,
				is_password_set,
			},
		});
	},
);


