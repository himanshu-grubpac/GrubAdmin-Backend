import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
import { CampingBoxSurveillance } from "@/db/mongo-schema";

export const getSurveillanceStatusHandler = createHandlers(
	campingAuthGuard(),
	async (context) => {
		const box_id = context.req.param("box_id");
		const client_id = context.get("client_id");

		const box = await prisma.box.findFirst({
			where: { id: box_id, client_id },
		});

		if (!box) {
			throw new APIError(undefined, "camping.box.NOT_FOUND");
		}

		const surveillance = await CampingBoxSurveillance.findOne({ box_id }).lean();

		return context.json({
			success: true,
			code: 200,
			data: {
				box_id,
				surveillance_enabled: surveillance?.surveillance_enabled ?? false,
			},
		} as any);
	},
);
