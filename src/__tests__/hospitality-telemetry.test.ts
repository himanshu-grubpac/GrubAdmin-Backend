import { describe, expect, test, mock } from "bun:test";

mock.module("@/db/mongo-schema", () => ({
	BoxConfig: {
		updateMany: mock(() => Promise.resolve({ modifiedCount: 0 })),
	},
}));

const mockPrisma: any = {
	box: {
		findMany: mock(() => Promise.resolve([])),
	},
	$transaction: mock((callback: any) => {
		const mockTx = {
			box: {
				updateMany: mock(() => Promise.resolve({ count: 0 })),
			},
			vertical_hospitality_floor: {
				findUnique: mock(() => Promise.resolve(null)),
			},
			vertical_hospitality_floor_box: {
				deleteMany: mock(() => Promise.resolve({ count: 0 })),
				createMany: mock(() => Promise.resolve({ count: 0 })),
				findMany: mock(() => Promise.resolve([])),
				updateMany: mock(() => Promise.resolve({ count: 0 })),
			},
			box_telemetry_latest: {
				updateMany: mock(() => Promise.resolve({ count: 0 })),
			},
			notification: {
				create: mock(() => Promise.resolve({ id: "notif_1" })),
				createMany: mock(() => Promise.resolve({ count: 0 })),
			},
		};
		return callback(mockTx);
	}),
};

mock.module("@/db", () => ({
	prisma: mockPrisma,
}));

describe("Hospitality Telemetry Action", () => {
	test("actionHospitalityBoxes maps zone1_temp to zone1_target_temp in BoxConfig and telemetry", async () => {
		const { actionHospitalityBoxes } = require("@/db/actions/hospitality/box.actions.ts");
		const { BoxConfig } = require("@/db/mongo-schema");

		mockPrisma.box.findMany.mockReset();
		mockPrisma.$transaction.mockClear();
		BoxConfig.updateMany.mockClear();

		mockPrisma.box.findMany.mockResolvedValue([
			{ id: "box1", client_id: "client1", status: "active", vertical_id: "v1", box_display_id: "GP-1", name: "Box 1" },
		]);

		await actionHospitalityBoxes({
			ids: ["box1"],
			client_id: "client1",
			power_status: "on",
			ioniser_status: "off",
			zone1_temp: 15,
			gps_status: "on",
		});

		expect(BoxConfig.updateMany).toHaveBeenCalled();
		const mongoCall = BoxConfig.updateMany.mock.calls[0];
		expect(mongoCall[0]).toEqual({ box_id: { $in: ["box1"] } });
		expect(mongoCall[1]).toEqual({
			$set: {
				power_status: "on",
				ioniser_status: "off",
				zone1_target_temp: 15,
			},
		});

		const txCallback = mockPrisma.$transaction.mock.calls[0]?.[0];
		const mockTx = {
			box: { updateMany: mock(() => Promise.resolve({ count: 0 })) },
			vertical_hospitality_floor: { findUnique: mock(() => Promise.resolve(null)) },
			vertical_hospitality_floor_box: {
				deleteMany: mock(() => Promise.resolve({ count: 0 })),
				createMany: mock(() => Promise.resolve({ count: 0 })),
				findMany: mock(() => Promise.resolve([])),
				updateMany: mock(() => Promise.resolve({ count: 0 })),
			},
			box_telemetry_latest: { updateMany: mock(() => Promise.resolve({ count: 0 })) },
			notification: { create: mock(() => Promise.resolve({ id: "notif_1" })), createMany: mock(() => Promise.resolve({ count: 0 })) },
		};
		await txCallback(mockTx);
		expect(mockTx.box_telemetry_latest.updateMany).toHaveBeenCalledWith({
			where: { box_id: { in: ["box1"] } },
			data: {
				power_status: "on",
				ioniser_status: "off",
				zone1_target_temp: 15,
			},
		});
	});
});
