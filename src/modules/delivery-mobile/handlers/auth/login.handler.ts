import { createHandlers } from "@/utils/hono-factory";
import { loginRequestBodyValidator } from "delivery-mobile/validators/auth.validators";
import { getUniqueVerticalDeliveryEmployee } from "@/db/actions/vertical-delivery-employee.actions";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { JWT } from "@/utils/jwt.ts";
import type { APIResponse } from "@/types/api";
import type { client, vertical_delivery_employee } from "@/db/types";

interface ResponseData {
	auth_token: string;
	is_password_set: boolean;
}

export const loginHandler = createHandlers(
	loginRequestBodyValidator,
	async (context) => {
		const { email, phone, password } = context.req.valid("json");


		const employee = await getUniqueVerticalDeliveryEmployee({
			email,
			phone,
		});

		console.log(employee);

		if (!employee) {
			throw new APIError("No employee can be found!", undefined, undefined, 400);
		}

		if (!employee.employee.password) {
			return context.json(
				{
					success: false,
					code: 400,
					message: "Please login using OTP and set a password first to login using password",
				},
				{
					status: 400,
				},
			);
		}

		const isCorrectPassword = await Bcrypt.compareHash({
			data: password,
			hashedValue: employee.employee.password,
		});

		if (!isCorrectPassword) {
			throw new APIError(
				"Invalid login credentials, the I'd and the password does not match",
				undefined,
				undefined,
				401,
			);
		}

		const client_id =
			employee.type === "admin"
				? (employee.employee as client).id
				: ((employee.employee as vertical_delivery_employee).client_id ?? "");

		const token = JWT.signDeliveryAuthToken({
			role:
				employee.type === "admin" ? "admin" : employee.type,
			id: employee.employee.id,
		});

		return context.json<APIResponse<ResponseData>>({
			success: true,
			code: 200,
			client_id,
			data: {
				auth_token: token,
				is_password_set: true,
			},
		});
	},
);


