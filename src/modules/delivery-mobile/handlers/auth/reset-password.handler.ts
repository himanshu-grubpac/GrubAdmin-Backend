import { createHandlers } from "@/utils/hono-factory.ts";
import { resetPasswordRequestBodyValidator } from "delivery-mobile/validators/auth.validators.ts";
import {
	deleteSavedDeliveryEmployeeOtp,
	getSavedDeliveryEmployeeOtp,
	compareOtp,
} from "@/db/actions/delivery-employee-otp.actions.ts";
import { APIError } from "@/types/error";
import { getUniqueVerticalDeliveryEmployee } from "@/db/actions/vertical-delivery-employee.actions";
import { Bcrypt } from "@/utils/bcrypt.ts";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import type { vertical_delivery_employee } from "@/db/types";
import { invalidateDeliveryAuthSessions } from "delivery/handlers/auth/delivery-auth-token";

export const resetPasswordHandler = createHandlers(
	resetPasswordRequestBodyValidator,
	async (context) => {
		const { email, phone, otp, password } = context.req.valid("json");


		const employee = await getUniqueVerticalDeliveryEmployee({
			email,
			phone,
		});

		if (!employee || !employee.employee.email) {
			throw new APIError("No employee found with the provided credentials!", undefined, undefined, 400);
		}

		const employeeEmail = employee.employee.email;

		const savedOtp = await getSavedDeliveryEmployeeOtp(employeeEmail);

		if (!savedOtp) {
			throw new APIError(
				"The otp has either expired or the credentials are wrong! Please try sending a new otp!",
				undefined,
				undefined,
				400,
			);
		}

		const isOtpValid = await compareOtp(otp, savedOtp.otp);
		if (!isOtpValid) {
			throw new APIError("Invalid otp", undefined, undefined, 400);
		}

		await deleteSavedDeliveryEmployeeOtp(employeeEmail);

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
			await prisma.vertical_delivery_employee.update({
				where: {
					id: employee.employee.id,
				},
				data: {
					password: hashedPassword,
				},
			});
		}

		const client_id =
			employee.type === "admin"
				? employee.employee.id
				: ((employee.employee as vertical_delivery_employee).client_id ?? "");
		if (client_id) {
			await invalidateDeliveryAuthSessions(client_id);
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


