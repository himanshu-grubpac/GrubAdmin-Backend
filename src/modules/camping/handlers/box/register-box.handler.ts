import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { registerBoxRequestBodyValidator } from "camping/validators/box.validators";
import { prisma } from "@/db";
import { BoxConfig } from "@/db/mongo-schema";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";

export const registerBoxHandler = createHandlers(
	campingAuthGuard(),
	registerBoxRequestBodyValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const vertical_id = context.get("vertical_id");
		const { box_display_id, name } = context.req.valid("json");

		const result = await prisma.$transaction(async (tx) => {
			const box = await tx.box.findFirst({
				where: {
					box_display_id: box_display_id.trim(),
				},
				include: {
					telemetry: true,
					lock: true,
				},
			});

			if (!box || box.status === "suspended") {
				throw new APIError(undefined, "camping.box.NOT_FOUND");
			}

			if (box.client_id && box.client_id !== client_id) {
				throw new APIError("This box is already registered to another account", undefined, undefined, 409);
			}

			if (box.vertical_id !== vertical_id) {
				throw new APIError("This box is not designated for the Camping vertical", undefined, undefined, 400);
			}

			const updatedBox = await tx.box.update({
				where: { id: box.id },
				data: {
					client_id,
					status: "active",
					name: name !== undefined ? name.trim() : box.name,
				},
				include: {
					telemetry: true,
					lock: true,
				},
			});

			// Update MongoDB configuration
			try {
				await BoxConfig.updateOne(
					{ box_id: box.id },
					{ $set: { client_id } },
					{ upsert: true }
				);
			} catch (err) {
				console.error("Failed to sync BoxConfig client_id to MongoDB:", err);
			}

			return updatedBox;
		});

		const formattedBox = {
			id: result.id,
			box_display_id: result.box_display_id,
			name: result.name || "",
			is_connected: result.telemetry?.connection_status === "connected",
			battery_level: result.telemetry?.battery_percentage ?? 0,
			is_locked: result.lock?.lock_status === "locked",
		};

		return context.json<APIResponse<typeof formattedBox>>({
			success: true,
			code: 200,
			message: "Box registered successfully",
			data: formattedBox,
		});
	},
);
