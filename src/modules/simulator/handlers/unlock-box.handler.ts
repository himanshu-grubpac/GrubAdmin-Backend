import { createHandlers } from "@/utils/hono-factory.ts";
import { boxIdParamValidator } from "../validators/simulator.validators.ts";
import { updateBoxLockStatus } from "@/db/actions/box.actions.ts";
import {
	createSimulatorNotification,
	ensureSimulatorBoxLock,
	getLockTransitionNotification,
} from "@/db/actions/simulator.actions.ts";
import { prisma } from "@/db";

export const unlockBoxHandler = createHandlers(
	boxIdParamValidator,
	async (context) => {
		const { box_id } = context.req.valid("param");

		const box = await prisma.box.findUnique({
			where: { id: box_id },
			select: {
				client_id: true,
				vertical_id: true,
			},
		});

		if (!box) {
			return context.json<any>(
				{ success: false, code: 404, message: "Box not found", data: { status: "error" } },
				{ status: 404 }
			);
		}
		if (!box.client_id || !box.vertical_id) {
			return context.json<any>(
				{ status: "error", message: "Box lock state is unavailable" },
				{ status: 409 },
			);
		}

		const previousLock = await ensureSimulatorBoxLock(box_id);

		await updateBoxLockStatus({
			ids: [box_id],
			lock_status: "unlocked",
			client_id: box.client_id,
			user: {
				id: "simulator",
				email: "simulator@grubpac.com",
				name: "Simulator",
			},
		});

		const persistedLock = await prisma.box_lock.findUnique({
			where: { box_id },
			select: { lock_status: true },
		});
		if (persistedLock?.lock_status !== "unlocked") {
			return context.json<any>(
				{ status: "error", message: "Box lock state was not persisted" },
				{ status: 409 },
			);
		}

		const notification = getLockTransitionNotification(previousLock.lock_status, "unlocked");
		if (notification) {
			await createSimulatorNotification({ box_id, ...notification });
		}

		return context.json<any>(
			{
				status: "success",
				lock_status: "unlocked"
			},
			{ status: 200 }
		);
	}
);
