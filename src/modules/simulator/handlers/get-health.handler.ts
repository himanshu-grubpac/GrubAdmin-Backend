import { createHandlers } from "@/utils/hono-factory.ts";
import { boxIdParamValidator } from "../validators/simulator.validators.ts";
import type { APIResponse } from "@/types/api";

export const getHealthHandler = createHandlers(
	boxIdParamValidator,
	async (context) => {
		// Mock endpoint for simulator to ping health
		return context.json<APIResponse<{ status: string }>>(
			{
				success: true,
				code: 200,
				message: "Health retrieved",
				data: { status: "on" },
			},
			{ status: 200 }
		);
	}
);
