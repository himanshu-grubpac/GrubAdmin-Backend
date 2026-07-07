import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
import { CampingBoxSurveillance } from "@/db/mongo-schema";

export const toggleSurveillanceHandler = createHandlers(
	campingAuthGuard(),
	async (context) => {
		const box_id = context.req.param("box_id");
		const client_id = context.get("client_id");
		const vertical_id = context.get("vertical_id");

		const box = await prisma.box.findFirst({
			where: { id: box_id, client_id, vertical_id },
		});

		if (!box) {
			throw new APIError(undefined, "camping.box.NOT_FOUND");
		}

		const current = await CampingBoxSurveillance.findOne({ box_id }).lean();
		const newStatus = current?.surveillance_enabled === true ? false : true;

		const updated = await CampingBoxSurveillance.findOneAndUpdate(
			{ box_id },
			{ box_id, surveillance_enabled: newStatus },
			{ upsert: true, new: true },
		).lean();

		return context.json({
			success: true,
			code: 200,
			data: {
				box_id,
				surveillance_enabled: updated.surveillance_enabled,
			},
		} as any);
	},
);
