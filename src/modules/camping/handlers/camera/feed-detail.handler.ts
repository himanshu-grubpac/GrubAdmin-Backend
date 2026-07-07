import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { getFeedDetailQueryValidator } from "camping/validators/camera.validators";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";

export const getFeedDetailHandler = createHandlers(
	campingAuthGuard(),
	getFeedDetailQueryValidator,
	async (context) => {
		const box_id = context.req.param("box_id");
		const feed_id = context.req.param("feed_id");
		const client_id = context.get("client_id");
		const vertical_id = context.get("vertical_id");

		const box = await prisma.box.findFirst({
			where: { id: box_id, client_id, vertical_id },
		});

		if (!box) {
			throw new APIError(undefined, "camping.box.NOT_FOUND");
		}

		const feed = await prisma.vertical_camping_camera_feed.findFirst({
			where: { id: feed_id, box_id },
		});

		if (!feed) {
			throw new APIError(undefined, "camping.camera.FEED_NOT_FOUND");
		}

		return context.json<APIResponse<typeof feed>>({
			success: true,
			code: 200,
			data: feed,
		});
	},
);
