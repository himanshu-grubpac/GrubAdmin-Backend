import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";

export const getMyAccountHandler = createHandlers(
	campingAuthGuard(),
	async (context) => {
		const client_id = context.get("client_id");

		const client = await prisma.client.findUnique({
			where: { id: client_id },
			select: {
				id: true,
				name: true,
				email: true,
				mobile_number: true,
				country_code: true,
				profile_pic: true,
				client_display_id: true,
				organization_name: true,
				status: true,
			},
		});

		return context.json<APIResponse<typeof client>>({
			success: true,
			code: 200,
			data: client,
		});
	},
);
