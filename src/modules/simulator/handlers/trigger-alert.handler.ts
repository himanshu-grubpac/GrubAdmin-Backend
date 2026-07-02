import { createHandlers } from "@/utils/hono-factory.ts";
import { triggerAlertValidator } from "../validators/simulator.validators.ts";
import { createSimulatorNotification } from "@/db/actions/simulator.actions.ts";
import type { APIResponse } from "@/types/api";

export const triggerAlertHandler = createHandlers(
	triggerAlertValidator,
	async (context) => {
		const body = context.req.valid("json");

		await createSimulatorNotification({
			box_id: body.box_id,
			category: body.category,
			type: body.type,
			title: body.title,
			description: body.description,
		});

		return context.json<APIResponse<{ status: string }>>(
			{
				success: true,
				code: 201,
				message: "Alert triggered successfully",
				data: { status: "success" },
			},
			{ status: 201 }
		);
	}
);
