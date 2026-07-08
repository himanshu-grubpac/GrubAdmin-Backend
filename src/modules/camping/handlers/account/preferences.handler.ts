import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth";
import { updatePreferencesRequestBodyValidator } from "camping/validators/account.validators";
import { CampingAlertPreference } from "@/db/mongo-schema";
import { prisma } from "@/db";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";

export const updatePreferencesHandler = createHandlers(
	campingAuthGuard(),
	updatePreferencesRequestBodyValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const { box_id, camera_alerts, battery_alerts, lock_alerts, display_alerts, other_alerts, theme } = context.req.valid("json");

		let targetBoxId = "default";

		if (box_id) {
			const box = await prisma.box.findFirst({
				where: {
					OR: [
						{ id: box_id },
						{ box_display_id: box_id }
					],
					client_id,
				},
			});

			if (!box) {
				throw new APIError("Box not found or not assigned to this client", undefined, undefined, 404);
			}
			targetBoxId = box.id;
		}

		// Prepare update payload
		const updateData: any = {};
		if (camera_alerts !== undefined) updateData.camera_alerts = camera_alerts;
		if (battery_alerts !== undefined) updateData.battery_alerts = battery_alerts;
		if (lock_alerts !== undefined) updateData.lock_alerts = lock_alerts;
		if (display_alerts !== undefined) updateData.display_alerts = display_alerts;
		if (other_alerts !== undefined) updateData.other_alerts = other_alerts;
		if (theme !== undefined) updateData.theme = theme;

		// Upsert in MongoDB
		const preference = await CampingAlertPreference.findOneAndUpdate(
			{ client_id, box_id: targetBoxId },
			{ $set: updateData },
			{ new: true, upsert: true }
		);

		return context.json<APIResponse<typeof preference>>({
			success: true,
			code: 200,
			message: "Preferences updated successfully",
			data: preference,
		});
	},
);
