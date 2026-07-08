import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";
import { loggerService } from "@/services/system-log.ts";
import { deleteCookie } from "hono/cookie";

export const logoutHandler = createHandlers(
	campingAuthGuard(),
	async (context) => {
		deleteCookie(context, "otp_id");
		const { client_id, user_id, user, type } = context.var;
		const userObj = user as any;

		await loggerService.log({
			category: "Profile",
			type: "Access",
			actor: {
				id: user_id,
				name: userObj.name || "Camper",
				role: type,
				table: "client",
			},
			client_id,
			subject: {
				id: user_id,
				name: userObj.name || "Camper",
				type: "employee",
			},
			metadata: {
				action: "logout",
			},
		});

		return context.json<APIResponse<null>>({
			success: true,
			...resolveMessageTemplate("camping.auth.LOGOUT_SUCCESS"),
			data: null,
		});
	},
);
