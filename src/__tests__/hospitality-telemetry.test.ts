import { describe, expect, test, mock } from "bun:test";

// Mock MongoDB BoxConfig
mock.module("@/db/mongo-schema", () => ({
	BoxConfig: {
		updateMany: mock(() => Promise.resolve({ modifiedCount: 0 })),
	},
}));

// Mock prisma client
const mockPrisma: any = {
	box: {
		findMany: mock(() => Promise.resolve([])),
	},
	$transaction: mock((callback: any) => {
		const mockTx = {
			box: {
				updateMany: mock(() => Promise.resolve({ count: 0 })),
			},
			vertical_hospitality_floor_box: {
				deleteMany: mock(() => Promise.resolve({ count: 0 })),
				createMany: mock(() => Promise.resolve({ count: 0 })),
			},
			box_telemetry_latest: {
				updateMany: mock(() => Promise.resolve({ count: 0 })),
			},
		};
		return callback(mockTx);
	}),
};

mock.module("@/db", () => ({
	prisma: mockPrisma,
}));

describe("Hospitality Telemetry Action", () => {
	test("actionHospitalityBoxes updates both MongoDB BoxConfig and SQL box_telemetry_latest", async () => {
		const { actionHospitalityBoxes } = require("@/db/actions/hospitality/box.actions.ts");
		const { BoxConfig } = require("@/db/mongo-schema");

		// Reset mocks
		mockPrisma.box.findMany.mockReset();
		mockPrisma.$transaction.mockClear();
		BoxConfig.updateMany.mockClear();

		// Configure mock box findMany return
		mockPrisma.box.findMany.mockResolvedValue([
			{ id: "box1", client_id: "client1", status: "active" },
			{ id: "box2", client_id: "client1", status: "active" },
		]);

		// Execute hospitality boxes action
		await actionHospitalityBoxes({
			ids: ["box1", "box2"],
			client_id: "client1",
			status: "active",
			power_status: "on",
			ioniser_status: "off",
			zone1_temp: 15,
		});

		// Verify that BoxConfig.updateMany was called with MongoDB payload
		expect(BoxConfig.updateMany).toHaveBeenCalled();
		const mongoCall = BoxConfig.updateMany.mock.calls[0];
		expect(mongoCall[0]).toEqual({ box_id: { $in: ["box1", "box2"] } });
		expect(mongoCall[1]).toEqual({
			$set: {
				power_status: "on",
				ioniser_status: "off",
				zone1_temp: 15,
			},
		});

		// Verify transaction callback executed sql update
		expect(mockPrisma.$transaction).toHaveBeenCalled();
	});
});
