import { createHandlers } from "@/utils/hono-factory.ts";
import { boxIdParamValidator } from "../validators/simulator.validators.ts";
import type { APIResponse } from "@/types/api";

import { prisma } from "@/db";

export const getHealthHandler = createHandlers(
	boxIdParamValidator,
	async (context) => {
		const { box_id } = context.req.valid("param");
		const box = await prisma.box.findUnique({
			where: { id: box_id },
			select: { status: true }
		});
		
		if (!box) {
			return context.json<any>({ status: "error", message: "Box not found" }, { status: 404 });
		}

		return context.json<any>(
			{
				status: box.status === "active" ? "on" : "off"
			},
			{ status: 200 }
		);
	}
);
