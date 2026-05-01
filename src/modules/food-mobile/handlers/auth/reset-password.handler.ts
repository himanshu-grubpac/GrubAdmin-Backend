import { createHandlers } from "@/utils/hono-factory.ts";
import { resetPasswordRequestBodyValidator } from "food-mobile/validators/auth.validators.ts";
import {
	deleteSavedFoodEmployeeOtp,
	getSavedFoodEmployeeOtp,
} from "@/db/actions/food-employee-otp.actions.ts";
import { APIError } from "@/types/error";
import { getUniqueVerticalFoodEmployee } from "@/db/actions/vertical-food-employee.actions";
import { Bcrypt } from "@/utils/bcrypt.ts";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";

export const resetPasswordHandler = createHandlers(
	resetPasswordRequestBodyValidator,
	async (context) => {
		const { email, phone, otp, password } = context.req.valid("json");


		const employee = await getUniqueVerticalFoodEmployee({
			email,
			phone,
		});

		if (!employee || !employee.employee.email) {
			throw new APIError("No employee found with the provided credentials!", undefined, undefined, 400);
		}

		const employeeEmail = employee.employee.email;

		const savedOtp = await getSavedFoodEmployeeOtp(employeeEmail);

		if (!savedOtp) {
			throw new APIError(
				"The otp has either expired or the credentials are wrong! Please try sending a new otp!",
				undefined,
				undefined,
				400,
			);
		}

		if (savedOtp.otp !== otp) {
			throw new APIError("Invalid otp", undefined, undefined, 400);
		}

		await deleteSavedFoodEmployeeOtp(employeeEmail);

		if (employee.employee.status === "suspended") {
			throw new APIError(
				"Your account has been suspended!",
				undefined,
				undefined,
				400,
			);
		}

		const hashedPassword = await Bcrypt.generateHash({
			data: password,
			saltLength: 10,
		});

		if (employee.type === "admin") {
			await prisma.client.update({
				where: {
					id: employee.employee.id,
				},
				data: {
					password: hashedPassword,
				},
			});
		} else {
			await prisma.vertical_food_employee.update({
				where: {
					id: employee.employee.id,
				},
				data: {
					password: hashedPassword,
				},
			});
		}

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


