import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { lockActionRequestBodyValidator } from "camping/validators/box.validators";
import { prisma } from "@/db";
import { updateBoxLockStatus } from "@/db/actions/box.actions";
import { loggerService } from "@/services/system-log";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";

export const lockBoxHandler = createHandlers(
	campingAuthGuard(),
	lockActionRequestBodyValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const user_id = context.get("user_id");
		const vertical_id = context.get("vertical_id");
		const user = context.get("user") as { email?: string; name?: string };
		const clientEmail = user.email?.trim() ?? "";
		const clientName = user.name || clientEmail || "Camping Client";
		const box_id = context.req.param("box_id");
		const { action } = context.req.valid("json");

		const box = await prisma.box.findFirst({
			where: {
				id: box_id,
				client_id,
				status: { not: "suspended" },
			},
		});

		if (!box) {
			throw new APIError(undefined, "camping.box.NOT_FOUND");
		}

		const lockStatus = action === "unlock" ? "unlocked" : "locked";

		await updateBoxLockStatus({
			ids: [box.id],
			lock_status: lockStatus,
			user: {
				id: user_id,
				email: clientEmail,
				name: clientName,
			},
			client_id,
		});

		try {
			await loggerService.log({
				category: "GrubLock",
				type: "Status",
				actor: {
					id: user_id,
					name: clientName,
					role: "admin",
					table: "client",
				},
				client_id,
				vertical_id,
				subject: { id: box.id, name: box.box_display_id, type: "box" },
				metadata: { action },
			});
		} catch {
			// Logging failure shouldn't block response
		}

		const message = action === "unlock" ? "Box unlocked successfully" : "Box locked successfully";

		return context.json<APIResponse<null>>({
			success: true,
			code: 200,
			message,
			data: null,
		});
	},
);
