import { createHandlers } from "@/utils/hono-factory";
import { loginRequestBodyValidator } from "hospitality/validators/auth.validators";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { JWT } from "@/utils/jwt.ts";
import { loggerService } from "@/services/system-log.ts";
import { resolveMessageTemplate } from "@/utils/message";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { buildHospitalityClientLookupWhere, normalizeAuthEmail } from "./auth.utils";

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
			where: buildHospitalityClientLookupWhere(normalizedEmail),
			include: { vertical: true },
		});

		const is_account_found = !!clientRecord;

		if (!clientRecord) {
			throw new APIError("No client can be found!", "hospitality.auth.login.ACCOUNT_NOT_FOUND", { is_account_found });
		}

		if (clientRecord.vertical?.name !== "Hospitality") {
			throw new APIError("You are not authorized to login.", "hospitality.auth.login.UNAUTHORIZED", { is_account_found });
		}

		if (clientRecord.status === "suspended") {
			throw new APIError("Your account has been suspended!", "hospitality.auth.login.SUSPENDED", { is_account_found });
		}

		const is_password_set = !!clientRecord.password;

		if (!clientRecord.password) {
			throw new APIError(
				"Please login using OTP and set a password first to login using password",
				"hospitality.auth.login.PASSWORD_NOT_SET",
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
				"hospitality.auth.login.INVALID_CREDENTIALS",
				{
					is_account_found,
					is_password_set,
				}
			);
		}

		const token = JWT.signDeliveryAuthToken({
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
				type: "employee", // Maintain schema compatibility
			},
			metadata: {
				action: "login",
			},
		});

		return context.json<APIResponse<ResponseData>>({
			success: true,
			client_id: clientRecord.id,
			...resolveMessageTemplate("hospitality.auth.login.SUCCESS"),
			data: {
				auth_token: token,
				is_account_found,
				is_password_set,
			},
		});
	},
);
