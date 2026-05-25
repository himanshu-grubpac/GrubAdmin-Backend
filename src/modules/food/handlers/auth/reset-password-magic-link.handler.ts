import { createHandlers } from "@/utils/hono-factory.ts";
import { resetPasswordMagicLinkRequestBodyValidator } from "food/validators/auth.validators.ts";
import { getSavedOtp, deleteSavedOtp, getOtpByToken } from "@/db/actions/otp.actions.ts";
import { APIError } from "@/types/error";
import { getUniqueVerticalFoodEmployee } from "@/db/actions/vertical-food-employee.actions";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { JWT } from "@/utils/jwt.ts";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { getCookie, setCookie } from "hono/cookie";

interface ResponseData {
	auth_token: string;
}

export const resetPasswordMagicLinkHandler = createHandlers(
	resetPasswordMagicLinkRequestBodyValidator,
	async (context) => {
		const { email, token, password } = context.req.valid("json");

		// Fetch all active forgot_password tokens for the email
		const { Otp: OtpModel } = await import("@/db/mongo-schema/otp.model.ts");
		const activeTokens = await OtpModel.find({ email: email.trim().toLowerCase(), for_what: "forget_password" });

		let savedToken = null;
		const { compareOtp } = await import("@/db/actions/otp.actions.ts");
		for (const activeToken of activeTokens) {
			if (await compareOtp(token, activeToken.otp)) {
				savedToken = activeToken;
				break;
			}
		}

		if (!savedToken) {
			throw new APIError(undefined, "food.auth.login.MAGIC_LINK_EXPIRED");
		}

		const employee = await getUniqueVerticalFoodEmployee({
			email,
		});

		if (!employee?.employee) {
			throw new APIError(undefined, "food.auth.login.ACCOUNT_NOT_FOUND");
		}

		if (employee.employee.status === "suspended") {
			throw new APIError(undefined, "food.auth.login.SUSPENDED");
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

		// Delete the used token
		await deleteSavedOtp(email);

		// Generate auth token for immediate login
		const auth_token = JWT.signFoodAuthToken({
			role:
				employee.type === "admin" ? "admin" : employee.type,
			id: employee.employee.id,
		});

		const otp_id = savedToken.otp_id;

		return context.json<APIResponse<ResponseData & { link_id: string }>>(
			{
				success: true,
				code: 200,
				data: {
					auth_token,
					link_id: otp_id,
				},
			},
			{
				status: 200,
			},
		);
	},
);


