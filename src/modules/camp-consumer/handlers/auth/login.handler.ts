import { createHandlers } from "@/utils/hono-factory";
import { loginRequestBodyValidator } from "@/modules/camp-consumer/validators/auth.validators";
import { getUniqueCampingConsumer } from "@/db/actions/camp-consumer/consumer.actions";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { JWT } from "@/utils/jwt.ts";
import type { APIResponse } from "@/types/api";
import {
	assertCampingConsumer,
	buildCampingAuthPayload,
	getConsumerClientId,
} from "./auth.utils.ts";

interface ResponseData {
	auth_token: string;
	refresh_token?: string;
	is_password_set: boolean;
}

export const loginHandler = createHandlers(loginRequestBodyValidator, async (context) => {
	const { email, phone, country_code, password } = context.req.valid("json");

	const consumer = await getUniqueCampingConsumer({ email, phone, country_code });
	assertCampingConsumer(consumer);

	if (!consumer.password) {
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
		hashedValue: consumer.password,
	});

	if (!isCorrectPassword) {
		throw new APIError(
			"Invalid login credentials, the I'd and the password does not match",
			undefined,
			undefined,
			401,
		);
	}

	const payload = buildCampingAuthPayload(consumer);
	const token = JWT.signCampingAuthToken(payload);
	const refreshToken = JWT.signCampingRefreshToken(payload);

	return context.json<APIResponse<ResponseData>>({
		success: true,
		code: 200,
		client_id: getConsumerClientId(consumer),
		data: {
			auth_token: token,
			refresh_token: refreshToken,
			is_password_set: true,
		},
	});
});
