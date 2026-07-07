import { createHandlers } from "@/utils/hono-factory";
import { loginRequestBodyValidator } from "camping/validators/auth.validators";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { JWT } from "@/utils/jwt.ts";
import { loggerService } from "@/services/system-log.ts";
import { resolveMessageTemplate } from "@/utils/message";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { buildCampingClientLookupWhere, normalizeAuthEmail } from "./auth.utils";

interface ResponseData {
	auth_token: string;
	is_account_found: boolean;
	is_password_set: boolean;
}

export const loginHandler = createHandlers(
	loginRequestBodyValidator,
	async (context) => {
		const { email, password } = context.req.valid("json");
		const normalizedEmail = normalizeAuthEmail(email);
		const normalizedPassword = password.trim();

		const clientRecord = await prisma.client.findFirst({
			where: buildCampingClientLookupWhere(normalizedEmail),
			include: { vertical: true },
		});

		const is_account_found = !!clientRecord;

		if (!clientRecord) {
			throw new APIError("No client can be found!", "camping.auth.login.ACCOUNT_NOT_FOUND", { is_account_found });
		}

		if (clientRecord.vertical?.name !== "Camping") {
			throw new APIError("You are not authorized to login.", "camping.auth.login.UNAUTHORIZED", { is_account_found });
		}

		if (clientRecord.status === "suspended") {
			throw new APIError("Your account has been suspended!", "camping.auth.login.SUSPENDED", { is_account_found });
		}

		const is_password_set = !!clientRecord.password;

		if (!clientRecord.password) {
			throw new APIError(
				"Please login using OTP and set a password first to login using password",
				"camping.auth.login.PASSWORD_NOT_SET",
				{
					is_account_found,
					is_password_set,
				}
			);
		}

		const isCorrectPassword = await Bcrypt.compareHash({
			data: normalizedPassword,
			hashedValue: clientRecord.password,
		});

		if (!isCorrectPassword) {
			throw new APIError(
				"Invalid login credentials",
				"camping.auth.login.INVALID_CREDENTIALS",
				{
					is_account_found,
					is_password_set,
				}
			);
		}

		const token = JWT.signCampingAuthToken({
			role: "admin",
			id: clientRecord.id,
		});

		await loggerService.log({
			category: "Profile",
			type: "Access",
			actor: {
				id: clientRecord.id,
				name: clientRecord.name || "",
				role: "admin",
				table: "client",
			},
			client_id: clientRecord.id,
			subject: {
				id: clientRecord.id,
				name: clientRecord.name || "",
				type: "employee",
			},
			metadata: {
				action: "login",
			},
		});

		return context.json<APIResponse<ResponseData>>({
			success: true,
			client_id: clientRecord.id,
			...resolveMessageTemplate("camping.auth.LOGIN_SUCCESS"),
			data: {
				auth_token: token,
				is_account_found,
				is_password_set,
			},
		});
	},
);
