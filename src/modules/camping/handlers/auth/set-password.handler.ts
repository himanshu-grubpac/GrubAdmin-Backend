import { createHandlers } from "@/utils/hono-factory.ts";
import { setNewPasswordRequestBodyValidator } from "camping/validators/auth.validators.ts";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";
import { prisma } from "@/db";
import { JWT } from "@/utils/jwt.ts";
import {
	deleteSavedCampingOtp,
} from "@/db/actions/camping-otp.actions.ts";
import { loggerService } from "@/services/system-log.ts";

interface ResponseData {
	auth_token: string;
}

export const setPasswordHandler = createHandlers(
	setNewPasswordRequestBodyValidator,
	async (context) => {
		const body = context.req.valid("json");
		const { password, email, full_name } = body;
		const normalizedPassword = password.trim();

		const authHeader = context.req.header("Authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			throw new APIError(undefined, "camping.auth.login.AUTH_TOKEN_REQUIRED");
		}

		const token = authHeader.split(" ")[1];
		if (!token) {
			throw new APIError(undefined, "camping.auth.login.AUTH_TOKEN_REQUIRED");
		}

		let userId: string;
		try {
			const decoded = JWT.verifyCampingAuthToken(token);
			userId = decoded.id;
		} catch {
			throw new APIError(undefined, "camping.auth.login.AUTH_FAILED");
		}

		const clientRecord = await prisma.client.findUnique({
			where: { id: userId },
		});

		if (!clientRecord) {
			throw new APIError(undefined, "camping.auth.login.ACCOUNT_NOT_FOUND");
		}

		if (clientRecord.status === "suspended") {
			throw new APIError(undefined, "camping.auth.login.SUSPENDED");
		}

		const hashedPassword = await Bcrypt.generateHash({
			data: normalizedPassword,
			saltLength: 10,
		});

		await prisma.client.update({
			where: {
				id: clientRecord.id,
			},
			data: {
				password: hashedPassword,
				name: full_name || clientRecord.name,
			},
		});

		if (clientRecord.email) {
			await deleteSavedCampingOtp(clientRecord.email);
		}

		const newToken = JWT.signCampingAuthToken({
			id: clientRecord.id,
			role: "admin",
		});

		await loggerService.log({
			category: "Profile",
			type: "Updation",
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
				action: "set_password",
			},
		});

		return context.json<APIResponse<ResponseData>>({
			success: true,
			...resolveMessageTemplate("camping.auth.PASSWORD_SET_SUCCESS"),
			data: {
				auth_token: newToken,
			},
		});
	},
);
