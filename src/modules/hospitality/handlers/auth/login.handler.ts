import { createHandlers } from "@/utils/hono-factory";
import { loginRequestBodyValidator } from "hospitality/validators/auth.validators";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { loggerService } from "@/services/system-log.ts";
import { resolveMessageTemplate } from "@/utils/message";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { HOSPITALITY_VERTICAL_NAME } from "@/configs/constants";
import {
	assertHospitalityClientHasEmail,
	buildHospitalityClientLookupWhere,
	normalizeAuthEmail,
} from "./auth.utils";
import { signHospitalitySessionToken } from "./hospitality-auth-token";
import { setHospitalityAuthCookie } from "hospitality/utils/hospitality-auth-cookie";

interface ResponseData {
	is_account_found: boolean;
	is_password_set: boolean;
}

export const loginHandler = createHandlers(
	loginRequestBodyValidator,
	async (context) => {
		const { email, password } = context.req.valid("json");
		const normalizedEmail = normalizeAuthEmail(email);
		const normalizedPassword = password.trim();

		if (!normalizedEmail) {
			throw new APIError("Invalid login credentials", "hospitality.auth.login.INVALID_CREDENTIALS");
		}

		const clientRecord = await prisma.client.findFirst({
			where: buildHospitalityClientLookupWhere(normalizedEmail),
			include: { vertical: true },
		});

		const is_account_found = !!clientRecord;

		if (!clientRecord || !assertHospitalityClientHasEmail(clientRecord)) {
			throw new APIError("Invalid login credentials", "hospitality.auth.login.INVALID_CREDENTIALS");
		}

		if (clientRecord.vertical?.name !== HOSPITALITY_VERTICAL_NAME) {
			throw new APIError("Invalid login credentials", "hospitality.auth.login.INVALID_CREDENTIALS");
		}

		if (clientRecord.status === "suspended") {
			throw new APIError("Invalid login credentials", "hospitality.auth.login.INVALID_CREDENTIALS");
		}

		if (clientRecord.status !== "active") {
			throw new APIError("Invalid login credentials", "hospitality.auth.login.INVALID_CREDENTIALS");
		}

		const is_password_set = !!clientRecord.password;

		if (!clientRecord.password) {
			throw new APIError(
				"Invalid login credentials",
				"hospitality.auth.login.INVALID_CREDENTIALS",
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
			);
		}

		const token = await signHospitalitySessionToken(clientRecord.id, "admin");

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

		setHospitalityAuthCookie(context, token);

		return context.json<APIResponse<ResponseData>>({
			success: true,
			client_id: clientRecord.id,
			...resolveMessageTemplate("hospitality.auth.login.SUCCESS"),
			data: {
				is_account_found,
				is_password_set,
			},
		});
	},
);
