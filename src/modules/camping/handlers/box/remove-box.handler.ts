import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { prisma } from "@/db";
import { BoxConfig } from "@/db/mongo-schema";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";

export const removeBoxHandler = createHandlers(
	campingAuthGuard(),
	async (context) => {
		const box_id = context.req.param("box_id");
		const client_id = context.get("client_id");

		await prisma.$transaction(async (tx) => {
			const box = await tx.box.findFirst({
				where: {
					id: box_id,
					client_id,
					status: { not: "suspended" },
				},
			});

			if (!box) {
				throw new APIError(undefined, "camping.box.NOT_FOUND");
			}

			await tx.box.update({
				where: { id: box.id },
				data: {
					client_id: null,
					status: "unassigned",
					connection_employee_id: null,
				},
			});

			// Update MongoDB
			try {
				await BoxConfig.updateOne(
					{ box_id: box.id },
					{ $set: { client_id: null } }
				);
			} catch (err) {
				console.error("Failed to unset BoxConfig client_id in MongoDB:", err);
			}
		});

		return context.json<APIResponse<null>>({
			success: true,
			code: 200,
			message: "Box removed from account successfully",
			data: null,
		});
	},
);
