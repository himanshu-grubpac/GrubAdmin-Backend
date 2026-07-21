import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";

const mockPrisma = {
	box: {
		findUnique: mock(() => Promise.resolve(null as any)),
	},
	box_lock: {
		findUnique: mock(() => Promise.resolve(null as any)),
		upsert: mock(() => Promise.resolve({ lock_status: "unlocked" } as any)),
	},
	notification: {
		createMany: mock(() => Promise.resolve({ count: 1 })),
	},
};
const mockUpdateBoxLockStatus = mock(() => Promise.resolve({ count: 1 }));

mock.module("@/db", () => ({ prisma: mockPrisma }));
mock.module("@/db/actions/box.actions.ts", () => ({
	updateBoxLockStatus: mockUpdateBoxLockStatus,
}));

const { lockBoxHandler } = await import(
	"@/modules/simulator/handlers/lock-box.handler.ts"
);
const { unlockBoxHandler } = await import(
	"@/modules/simulator/handlers/unlock-box.handler.ts"
);

const app = new Hono();
app.patch("/boxes/:box_id/lock", ...lockBoxHandler);
app.patch("/boxes/:box_id/unlock", ...unlockBoxHandler);

const metadata = {
	client_id: "client-1",
	vertical_id: "vertical-1",
	box_display_id: "BOX-1",
	name: "Simulator Box",
};

describe("simulator lock notifications", () => {
	beforeEach(() => {
		mockUpdateBoxLockStatus.mockClear();
		mockPrisma.box.findUnique.mockReset();
		mockPrisma.box_lock.findUnique.mockReset();
		mockPrisma.box_lock.upsert.mockReset();
		mockPrisma.box_lock.upsert.mockResolvedValue({ lock_status: "unlocked" });
		mockPrisma.notification.createMany.mockClear();
	});

	test("creates a missing lock row, persists locked, and notifies once", async () => {
		mockPrisma.box.findUnique
			.mockResolvedValueOnce({
				client_id: "client-1",
				vertical_id: "vertical-1",
				lock: null,
			})
			.mockResolvedValueOnce(metadata);
		mockPrisma.box_lock.findUnique.mockResolvedValue({ lock_status: "locked" });

		const response = await app.request("/boxes/box-1/lock", { method: "PATCH" });

		expect(response.status).toBe(200);
		expect(mockPrisma.box_lock.upsert).toHaveBeenCalledWith({
			where: { box_id: "box-1" },
			update: {},
			create: {
				id: expect.any(String),
				box_id: "box-1",
				lock_status: "unlocked",
			},
			select: { lock_status: true },
		});
		expect(mockUpdateBoxLockStatus).toHaveBeenCalledTimes(1);
		expect(mockPrisma.notification.createMany).toHaveBeenCalledTimes(1);
		expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
			data: [expect.objectContaining({
				client_id: "client-1",
				vertical_id: "vertical-1",
				box_id: "box-1",
				category: "lock",
				type: "notification",
			})],
		});
	});

	test("creates a missing lock row as unlocked without a false unlock notification", async () => {
		mockPrisma.box.findUnique.mockResolvedValue({
			client_id: "client-1",
			vertical_id: "vertical-1",
			lock: null,
		});
		mockPrisma.box_lock.findUnique.mockResolvedValue({ lock_status: "unlocked" });

		const response = await app.request("/boxes/box-1/unlock", { method: "PATCH" });

		expect(response.status).toBe(200);
		expect(mockPrisma.box_lock.upsert).toHaveBeenCalledTimes(1);
		expect(mockUpdateBoxLockStatus).toHaveBeenCalledTimes(1);
		expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
	});

	test("does not notify or claim success when no lock row was persisted", async () => {
		mockPrisma.box.findUnique.mockResolvedValue({
			client_id: "client-1",
			vertical_id: "vertical-1",
			lock: { lock_status: "unlocked" },
		});
		mockPrisma.box_lock.findUnique.mockResolvedValue(null);

		const response = await app.request("/boxes/box-1/lock", { method: "PATCH" });

		expect(response.status).toBe(409);
		expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
		expect(await response.json()).toMatchObject({
			status: "error",
			message: "Box lock state was not persisted",
		});
	});

	test("creates a notification for an existing unlocked row after lock persists", async () => {
		mockPrisma.box.findUnique
			.mockResolvedValueOnce({
				client_id: "client-1",
				vertical_id: "vertical-1",
				lock: { lock_status: "unlocked" },
			})
			.mockResolvedValueOnce(metadata);
		mockPrisma.box_lock.upsert.mockResolvedValue({ lock_status: "unlocked" });
		mockPrisma.box_lock.findUnique.mockResolvedValue({ lock_status: "locked" });

		const response = await app.request("/boxes/box-1/lock", { method: "PATCH" });

		expect(response.status).toBe(200);
		expect(mockPrisma.notification.createMany).toHaveBeenCalledTimes(1);
	});

	test("creates a success notification for an existing locked row after unlock persists", async () => {
		mockPrisma.box.findUnique
			.mockResolvedValueOnce({
				client_id: "client-1",
				vertical_id: "vertical-1",
				lock: { lock_status: "locked" },
			})
			.mockResolvedValueOnce(metadata);
		mockPrisma.box_lock.upsert.mockResolvedValue({ lock_status: "locked" });
		mockPrisma.box_lock.findUnique.mockResolvedValue({ lock_status: "unlocked" });

		const response = await app.request("/boxes/box-1/unlock", { method: "PATCH" });

		expect(response.status).toBe(200);
		expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
			data: [expect.objectContaining({
				category: "lock",
				type: "success",
			})],
		});
	});

	test("does not duplicate notifications for repeated lock requests", async () => {
		mockPrisma.box.findUnique
			.mockResolvedValueOnce({
				client_id: "client-1",
				vertical_id: "vertical-1",
				lock: null,
			})
			.mockResolvedValueOnce(metadata)
			.mockResolvedValueOnce({
				client_id: "client-1",
				vertical_id: "vertical-1",
				lock: { lock_status: "locked" },
			});
		mockPrisma.box_lock.upsert
			.mockResolvedValueOnce({ lock_status: "unlocked" })
			.mockResolvedValueOnce({ lock_status: "locked" });
		mockPrisma.box_lock.findUnique.mockResolvedValue({ lock_status: "locked" });

		const firstResponse = await app.request("/boxes/box-1/lock", { method: "PATCH" });
		const secondResponse = await app.request("/boxes/box-1/lock", { method: "PATCH" });

		expect(firstResponse.status).toBe(200);
		expect(secondResponse.status).toBe(200);
		expect(mockUpdateBoxLockStatus).toHaveBeenCalledTimes(2);
		expect(mockPrisma.notification.createMany).toHaveBeenCalledTimes(1);
	});

	test("does not duplicate notifications for repeated unlock requests", async () => {
		mockPrisma.box.findUnique
			.mockResolvedValueOnce({
				client_id: "client-1",
				vertical_id: "vertical-1",
				lock: { lock_status: "locked" },
			})
			.mockResolvedValueOnce(metadata)
			.mockResolvedValueOnce({
				client_id: "client-1",
				vertical_id: "vertical-1",
				lock: { lock_status: "unlocked" },
			});
		mockPrisma.box_lock.upsert
			.mockResolvedValueOnce({ lock_status: "locked" })
			.mockResolvedValueOnce({ lock_status: "unlocked" });
		mockPrisma.box_lock.findUnique.mockResolvedValue({ lock_status: "unlocked" });

		const firstResponse = await app.request("/boxes/box-1/unlock", { method: "PATCH" });
		const secondResponse = await app.request("/boxes/box-1/unlock", { method: "PATCH" });

		expect(firstResponse.status).toBe(200);
		expect(secondResponse.status).toBe(200);
		expect(mockUpdateBoxLockStatus).toHaveBeenCalledTimes(2);
		expect(mockPrisma.notification.createMany).toHaveBeenCalledTimes(1);
	});
});
