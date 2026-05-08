import { createHandlers } from "@/utils/hono-factory";
import { loginRequestBodyValidator } from "../../validators/auth.validators";
import { getUniqueAdmin, updateAdmin } from "@/db/actions/admin.actions";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt";
import { JWT } from "@/utils/jwt";
import { setAuthCookie } from "@/utils/cookie";
import { JWT_ACCESS_TOKEN_EXPIRY } from "@/configs/env";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message.ts";

export const loginHandler = createHandlers(
	loginRequestBodyValidator,
	async (context) => {
		const { email, password } = context.req.valid("json");
		const normalizedEmail = email.trim().toLowerCase();

		const admin = await getUniqueAdmin({
			email: normalizedEmail,
		});

		if (!admin) {
			throw new APIError(undefined, "admin.auth.ACCOUNT_NOT_FOUND", undefined, 404);
		}

		if (!admin.user.password) {
			throw new APIError("Please try to login using OTP instead of password!", undefined, undefined, 400);
		}

		if (admin.user.status === "suspended") {
			throw new APIError(undefined, "admin.auth.UNAUTHORIZED", undefined, 403);
		}

		const isCorrectPassword = await Bcrypt.compareHash({
			data: password,
			hashedValue: admin.user.password,
		});    


		if (!isCorrectPassword) {
			throw new APIError(undefined, "admin.account.INVALID_PASSWORD", undefined, 401);
		}

		if (admin.user.status === "unassigned") {
			await updateAdmin({
				email: normalizedEmail,
				data: {
					status: "active",
				},
			});
		}

		const token = JWT.signAuthToken({
			id: admin.user.id,
			role: admin.type,
		});

		// Set JWT token as HttpOnly Secure cookie instead of returning in body
		setAuthCookie(context, token, { expiresIn: JWT_ACCESS_TOKEN_EXPIRY });

		const response = {
			success: true as const,
			...resolveMessageTemplate("admin.auth.login.SUCCESS"),
		};

		return context.json(response as any, response.code as any);
	},
);
