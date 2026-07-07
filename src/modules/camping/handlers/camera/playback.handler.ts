import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { playbackFeedRequestBodyValidator } from "camping/validators/camera.validators";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
interface PlaybackData {
	box_id: string;
	camera_number: number;
	playback_url: string;
	feed_id: string;
	duration: number | null;
}

export const playbackFeedHandler = createHandlers(
	campingAuthGuard(),
	playbackFeedRequestBodyValidator,
	async (context) => {
		const box_id = context.req.param("box_id");
		const feed_id = context.req.param("feed_id");
		const client_id = context.get("client_id");
		const { camera } = context.req.valid("json");

		const box = await prisma.box.findFirst({
			where: { id: box_id, client_id },
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

		const playback_url = `https://stream.camping.app/playback/${box_id}/${feed_id}/index.m3u8`;

		return context.json({
			success: true,
			code: 200,
			data: {
				box_id,
				camera_number: camera || feed.camera_number,
				playback_url,
				feed_id: feed.id,
				duration: feed.duration,
			},
		} as any);
	},
);
