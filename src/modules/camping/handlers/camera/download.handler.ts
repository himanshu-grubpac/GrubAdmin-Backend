import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { downloadFeedRequestBodyValidator } from "camping/validators/camera.validators";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
import { services } from "@/services";
import type { APIResponse } from "@/types/api";

export const downloadFeedHandler = createHandlers(
	campingAuthGuard(),
	downloadFeedRequestBodyValidator,
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

		try {
			const signedUrl = await services.s3.generatePresignedUrl(feed.file_url, 3600);

			return context.json<APIResponse<{ download_url: string; expires_in: number }>>({
				success: true,
				code: 200,
				data: {
					download_url: signedUrl,
					expires_in: 3600,
				},
			});
		} catch {
			throw new APIError(undefined, "camping.camera.DOWNLOAD_FAILED");
		}
	},
);
