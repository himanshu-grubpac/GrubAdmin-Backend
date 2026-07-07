import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";

interface DashboardData {
	greeting: string;
	user_name: string;
	total_boxes: number;
	connected_boxes: number;
	has_password_set: boolean;
}

export const getDashboardHandler = createHandlers(
	campingAuthGuard(),
	async (context) => {
		const client_id = context.get("client_id");
		const user = context.get("user");

		const currentHour = new Date().getHours();
		let greeting = "Good evening";
		if (currentHour < 12) greeting = "Good morning";
		else if (currentHour < 17) greeting = "Good afternoon";

		const client = await prisma.client.findUnique({
			where: { id: client_id },
		});

		const totalBoxes = await prisma.box.count({
			where: { client_id, status: { not: "unassigned" } },
		});

		const connectedBoxes = await prisma.box.count({
			where: {
				client_id,
				status: { not: "unassigned" },
				telemetry: { connection_status: "connected" },
			},
		});

		return context.json<APIResponse<DashboardData>>({
			success: true,
			code: 200,
			data: {
				greeting,
				user_name: client?.name || user?.name || "",
				total_boxes: totalBoxes,
				connected_boxes: connectedBoxes,
				has_password_set: !!client?.password,
			},
		});
	},
);
