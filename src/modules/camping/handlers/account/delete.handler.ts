import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";

export const deleteAccountHandler = createHandlers(
	campingAuthGuard(),
	async (context) => {
		const client_id = context.get("client_id");

		const boxCount = await prisma.box.count({
			where: { client_id, status: { not: "unassigned" } },
		});

		if (boxCount > 0) {
			throw new APIError(
				"Cannot delete account with active boxes. Please remove all boxes first.",
				undefined,
				undefined,
				400,
			);
		}

		const client = await prisma.client.findUnique({
			where: { id: client_id },
		});

		if (!client) {
			throw new APIError("Account not found", undefined, undefined, 404);
		}

		await prisma.$transaction(async (tx) => {
			await tx.notification.deleteMany({
				where: { client_id },
			});

			await tx.box.updateMany({
				where: { client_id },
				data: { client_id: null, status: "unassigned" },
			});

			await tx.client.delete({
				where: { id: client_id },
			});
		});

		return context.json<APIResponse<null>>({
			success: true,
			...resolveMessageTemplate("camping.account.DELETE_SUCCESS"),
			data: null,
		});
	},
);
