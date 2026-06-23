import { hospitalityAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { updateGrubpacRequestBodyValidator } from "hospitality/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";

export const updateGrubpacHandler = createHandlers(
	hospitalityAuthGuard(),
	updateGrubpacRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { id, name, box_id } = context.req.valid("json");

		const updateData: any = {};
		if (name !== undefined) updateData.name = name;
		if (box_id !== undefined) updateData.box_display_id = box_id;

		const box = await prisma.box.update({
			where: { id, client_id },
			data: updateData,
		});

		return context.json<APIResponse<typeof box>>({
			success: true,
			code: 200,
			message: "GrubPac updated successfully!",
			data: box,
		});
	},
);
