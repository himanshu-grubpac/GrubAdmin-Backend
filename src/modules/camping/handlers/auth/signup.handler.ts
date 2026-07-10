import { createHandlers } from "@/utils/hono-factory";
import { signupRequestBodyValidator } from "camping/validators/auth.validators";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { JWT } from "@/utils/jwt.ts";
import { resolveMessageTemplate } from "@/utils/message";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { getVertical } from "@/db/actions/vertical.actions.ts";
import { ulid } from "ulid";

interface ResponseData {
	auth_token: string;
	client_id: string;
}

export const signupHandler = createHandlers(
	signupRequestBodyValidator,
	async (context) => {
		const { email, password, full_name, mobile_number, country_code } = context.req.valid("json");

		const vertical = await getVertical("Camping");
		if (!vertical) {
			throw new APIError("Camping vertical not configured", undefined, undefined, 500);
		}

		const existingClient = await prisma.client.findFirst({
			where: {
				email: email.trim().toLowerCase(),
				vertical_id: vertical.id,
			},
		});

		if (existingClient) {
			throw new APIError("An account with this email already exists", "camping.auth.login.ACCOUNT_NOT_FOUND");
		}

		const hashedPassword = await Bcrypt.generateHash({
			data: password.trim(),
			saltLength: 10,
		});

		const clientDisplayId = ulid().slice(0, 12).toUpperCase();

		const client = await prisma.client.create({
			data: {
				name: full_name.trim(),
				client_display_id: clientDisplayId,
				email: email.trim().toLowerCase(),
				password: hashedPassword,
				mobile_number: mobile_number?.trim(),
				country_code: country_code?.trim(),
				vertical_id: vertical.id,
				status: "active",
			},
		});

		const token = JWT.signCampingAuthToken({
			role: "admin",
			id: client.id,
		});

		return context.json<APIResponse<ResponseData>>({
			success: true,
			client_id: client.id,
			...resolveMessageTemplate("camping.auth.SIGNUP_SUCCESS"),
			data: {
				auth_token: token,
				client_id: client.id,
			},
		});
	},
);
