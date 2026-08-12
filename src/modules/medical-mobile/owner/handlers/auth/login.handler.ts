import { createHandlers } from "@/utils/hono-factory";
import { loginRequestBodyValidator } from "@/modules/medical-mobile/owner/validators/auth.validators";
import { getUniqueMedicalEmployee } from "@/db/actions/medical/employee.actions";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { JWT } from "@/utils/jwt.ts";
import type { APIResponse } from "@/types/api";
import { assertOwnerAdmin, getOwnerClientId } from "./auth.utils.ts";

interface ResponseData {
	auth_token: string;
	refresh_token?: string;
	is_password_set: boolean;
}

export const loginHandler = createHandlers(loginRequestBodyValidator, async (context) => {
	const { email, phone, password } = context.req.valid("json");

	const employee = await getUniqueMedicalEmployee({ email, phone });
	assertOwnerAdmin(employee);

	if (!employee.employee.password) {
		return context.json(
			{
				success: false,
				code: 400,
				message:
					"Please login using OTP and set a password first to login using password",
			},
			{ status: 400 },
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

	const payload = { id: employee.employee.id, role: "admin" as const, persona: "owner" as const };
	const token = JWT.signMedicalMobileAuthToken(payload);
	const refreshToken = JWT.signMedicalMobileRefreshToken(payload);

	return context.json<APIResponse<ResponseData>>({
		success: true,
		code: 200,
		client_id: getOwnerClientId(employee),
		data: {
			auth_token: token,
			refresh_token: refreshToken,
			is_password_set: true,
		},
	});
});
