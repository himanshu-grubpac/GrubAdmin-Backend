import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
interface LiveStreamData {
	box_id: string;
	camera_number: number;
	stream_url: string;
	stream_type: string;
	status: string;
}

export const getLiveStreamHandler = createHandlers(
	campingAuthGuard(),
	async (context) => {
		const box_id = context.req.param("box_id");
		const client_id = context.get("client_id");
		const camera = parseInt(context.req.query("camera") || "1");

		if (camera < 1 || camera > 4) {
			throw new APIError("Invalid camera number. Must be between 1 and 4.", undefined, undefined, 400);
		}

		const box = await prisma.box.findFirst({
			where: { id: box_id, client_id },
			include: { telemetry: true },
		});

		if (!box) {
			throw new APIError(undefined, "camping.box.NOT_FOUND");
		}

		const cameraStatus = box.telemetry?.camera_status;
		if (cameraStatus === "off" || cameraStatus === "unknown") {
			throw new APIError(undefined, "camping.camera.STREAM_UNAVAILABLE");
		}

		const stream_url = `https://stream.camping.app/live/${box_id}/cam${camera}/index.m3u8`;

		return context.json({
			success: true,
			code: 200,
			data: {
				box_id,
				camera_number: camera,
				stream_url,
				stream_type: "hls",
				status: cameraStatus || "unknown",
			},
		} as any);
	},
);
