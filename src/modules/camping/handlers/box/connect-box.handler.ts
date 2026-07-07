import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { prisma } from "@/db";
import { BoxConfig } from "@/db/mongo-schema";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";

export const connectBoxHandler = createHandlers(
	campingAuthGuard(),
	async (context) => {
		const box_id = context.req.param("box_id");
		const client_id = context.get("client_id");

		const box = await prisma.box.findFirst({
			where: {
				id: box_id,
				client_id,
				status: { not: "suspended" },
			},
			include: {
				telemetry: true,
			},
		});

		if (!box) {
			throw new APIError(undefined, "camping.box.NOT_FOUND");
		}

		if (box.telemetry?.power_status === "off") {
			throw new APIError("Box is powered off. Please turn it on first.", undefined, undefined, 400);
		}

		await prisma.$transaction(async (tx) => {
			await tx.box_telemetry_latest.upsert({
				where: { box_id: box.id },
				create: {
					box_id: box.id,
					connection_status: "connected",
				},
				update: {
					connection_status: "connected",
				},
			});

			try {
				await BoxConfig.updateOne(
					{ box_id: box.id },
					{ $set: { is_connected: true } }
				);
			} catch (err) {
				console.error("Failed to update BoxConfig connection in MongoDB:", err);
			}
		});

		return context.json<APIResponse<{ id: string; box_display_id: string; is_connected: boolean }>>({
			success: true,
			code: 200,
			message: "Box connected successfully",
			data: {
				id: box.id,
				box_display_id: box.box_display_id,
				is_connected: true,
			},
		});
	},
);
