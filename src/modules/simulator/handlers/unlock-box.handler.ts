import { createHandlers } from "@/utils/hono-factory.ts";
import { boxIdParamValidator } from "../validators/simulator.validators.ts";
import { updateBoxLockStatus } from "@/db/actions/box.actions.ts";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";

export const unlockBoxHandler = createHandlers(
	boxIdParamValidator,
	async (context) => {
		const { box_id } = context.req.valid("param");

		const box = await prisma.box.findUnique({
			where: { id: box_id },
			select: { client_id: true },
		});

		if (!box) {
			return context.json<any>(
				{ success: false, code: 404, message: "Box not found", data: { status: "error" } },
				{ status: 404 }
			);
		}

		await updateBoxLockStatus({
			ids: [box_id],
			lock_status: "unlocked",
			client_id: box.client_id as string,
			user: {
				id: "simulator",
				email: "simulator@grubpac.com",
				name: "Simulator",
			},
		});

		return context.json<any>(
			{
				success: true,
				code: 200,
				message: "Box unlocked",
				data: { status: "success" },
			},
			{ status: 200 }
		);
	}
);
