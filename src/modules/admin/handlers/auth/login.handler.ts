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
import { services } from "@/services";
import { DEFAULT_IP_ADDRESS } from "@/configs/constants.ts";
import { logger } from "@/utils/logger";

export const loginHandler = createHandlers(
	loginRequestBodyValidator,
	async (context) => {
		const { email, password } = context.req.valid("json");
		const normalizedEmail = email.trim().toLowerCase();

		logger.info(`Login attempt for: ${normalizedEmail}`);

		const admin = await getUniqueAdmin({
			email: normalizedEmail,
		});

		if (!admin) {
			logger.warn(`Login failed - account not found: ${normalizedEmail}`);
			throw new APIError(undefined, "admin.auth.ACCOUNT_NOT_FOUND", undefined, 404);
		}

		if (!admin.user.password) {
			logger.warn(`Login failed - no password set: ${normalizedEmail}`);
			throw new APIError("Please try logging in using OTP instead of password!", undefined, undefined, 400);
		}

		if (admin.user.status === "suspended") {
			logger.warn(`Login failed - account suspended: ${normalizedEmail}`);
			throw new APIError(undefined, "admin.auth.UNAUTHORIZED", undefined, 403);
		}

		const isCorrectPassword = await Bcrypt.compareHash({
			data: password,
			hashedValue: admin.user.password,
		});    


		if (!isCorrectPassword) {
			logger.warn(`Login failed - invalid password: ${normalizedEmail}`);
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

		// Log the login event
		const ip = context.req.header("x-forwarded-for")?.split(",")[0] || 
				   context.req.header("x-real-ip") || 
				   DEFAULT_IP_ADDRESS;

		services.adminLogger.log({
			module: "authentication",
			action: "login",
			admin_id: admin.user.id,
			admin_name: `${admin.user.first_name} ${admin.user.last_name || ""}`.trim(),
			role_id: admin.user.role_id,
			role_name: admin.user.role?.name || "Admin",
			ip,
			effected_id: admin.user.id,
			effected_name: "Self",
		});

		logger.info(`Login successful: ${normalizedEmail} (id: ${admin.user.id})`);

		// Set JWT token as HttpOnly Secure cookie
		setAuthCookie(context, token, { expiresIn: JWT_ACCESS_TOKEN_EXPIRY });

		const response = {
			success: true as const,
			data: { token },
			...resolveMessageTemplate("admin.auth.login.SUCCESS"),
		};

		return context.json(response as any, response.code as any);
	},
);
