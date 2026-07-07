import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";

export const testTriggerNotificationHandler = createHandlers(
	campingAuthGuard(),
	async (context) => {
		const client_id = context.get("client_id");
		const vertical_id = context.get("vertical_id");

		await prisma.notification.create({
			data: {
				client_id,
				vertical_id,
				title: "Test Notification",
				description: "This is a test notification from the Camping portal",
				type: "notification",
				category: "other",
			},
		});

		return context.json<APIResponse<null>>({
			success: true,
			code: 200,
			message: "Test notification sent",
			data: null,
		});
	},
);
