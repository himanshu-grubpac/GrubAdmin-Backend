import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { getCameraFeedQueryValidator } from "camping/validators/camera.validators";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
export const getRecordedFeedsHandler = createHandlers(
	campingAuthGuard(),
	getCameraFeedQueryValidator,
	async (context) => {
		const box_id = context.req.param("box_id");
		const client_id = context.get("client_id");
		const { camera, date, page, page_size } = context.req.valid("query");

		const box = await prisma.box.findFirst({
			where: { id: box_id, client_id },
		});

		if (!box) {
			throw new APIError(undefined, "camping.box.NOT_FOUND");
		}

		const where: any = { box_id, status: "available" };
		if (camera) where.camera_number = camera;
		if (date) {
			const startDate = new Date(date);
			const endDate = new Date(startDate);
			endDate.setDate(endDate.getDate() + 1);
			where.recorded_at = { gte: startDate, lt: endDate };
		}

		const skip = (page - 1) * page_size;

		const [feeds, total] = await Promise.all([
			prisma.vertical_camping_camera_feed.findMany({
				where,
				skip,
				take: page_size,
				orderBy: { recorded_at: "desc" },
			}),
			prisma.vertical_camping_camera_feed.count({ where }),
		]);

		return context.json({
			success: true,
			code: 200,
			data: { feeds, total, page, page_size },
		} as any);
	},
);
