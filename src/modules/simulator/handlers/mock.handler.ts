import { createHandlers } from "@/utils/hono-factory.ts";
import { boxIdParamValidator } from "../validators/simulator.validators.ts";
import type { APIResponse } from "@/types/api";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod";

export const updateSettingsHandler = createHandlers(
	boxIdParamValidator,
	zValidator("json", z.object({}).passthrough(), (r) => {
		if (!r.success) validatorErrorHandler(r.error);
	}), // Accept any settings payload
	async (context) => {
		// Mock endpoint for simulator settings
		return context.json<APIResponse<{ status: string }>>(
			{
				success: true,
				code: 200,
				message: "Settings updated",
				data: { status: "success" },
			},
			{ status: 200 }
		);
	}
);

export const createConnectionHandler = createHandlers(
	boxIdParamValidator,
	zValidator("json", z.object({}).passthrough(), (r) => {
		if (!r.success) validatorErrorHandler(r.error);
	}), // Accept driver_id, restaurant_id etc
	async (context) => {
		return context.json<APIResponse<{ status: string }>>(
			{
				success: true,
				code: 200,
				message: "Connection simulated",
				data: { status: "success" },
			},
			{ status: 200 }
		);
	}
);

export const deleteConnectionHandler = createHandlers(
	boxIdParamValidator,
	async (context) => {
		return context.json<APIResponse<{ status: string }>>(
			{
				success: true,
				code: 200,
				message: "Disconnection simulated",
				data: { status: "success" },
			},
			{ status: 200 }
		);
	}
);
