import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { deleteCookie } from "hono/cookie";

export const deleteAccountHandler = createHandlers(
	hospitalityAuthGuard(),
	async (context) => {
		const { user } = context.var;

		const activeBoxCount = await prisma.box.count({
			where: {
				client_id: user.id,
				status: "active",
			},
		});

		if (activeBoxCount > 0) {
			throw new APIError(
				"Cannot delete account: you have active Grubpacs assigned to your account.",
				undefined,
				undefined,
				400,
			);
		}

		await prisma.client.update({
			where: { id: user.id },
			data: { status: "inactive" },
		});

		deleteCookie(context, "auth_token", { path: "/" });
		deleteCookie(context, "otp_id", { path: "/" });

		return context.json<APIResponse>({ success: true, code: 200 }, { status: 200 });
	},
);
