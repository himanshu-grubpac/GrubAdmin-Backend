import { createHandlers } from "@/utils/hono-factory";
import type { APIResponse } from "@/types/api";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { loggerService } from "@/services/system-log.ts";
import { deleteCookie } from "hono/cookie";

export const logoutHandler = createHandlers(
	hospitalityAuthGuard(),
	async (context) => {
		deleteCookie(context, "otp_id");
		const { client_id, user_id, user, type } = context.var;
		const userObj = user as any;
		const actorName = type === "admin" 
			? userObj.name 
			: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

		await loggerService.log({
			category: "Profile",
			type: "Access",
			actor: {
				id: user_id,
				name: actorName,
				role: type,
				table: type === "admin" ? "client" : "vertical_hospitality_employee",
			},
			client_id,
			subject: {
				id: user_id,
				name: actorName,
				type: "employee",
			},
			metadata: {
				action: "logout",
			},
		});

		return context.json<APIResponse>(
			{
				success: true,
				code: 200,
				message: "Logged out successfully",
			},
			{
				status: 200,
			},
		);
	},
);
