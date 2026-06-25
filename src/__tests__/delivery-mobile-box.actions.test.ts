import { describe, expect, test, mock, beforeEach } from "bun:test";
import { APIError } from "@/types/error";

const mockPrisma = {
	vertical_delivery_employee_box: {
		findFirst: mock(() => Promise.resolve(null)),
		findMany: mock(() => Promise.resolve([])),
	},
	box: {
		updateMany: mock(() => Promise.resolve({ count: 1 })),
	},
	box_telemetry_latest: {
		upsert: mock(() => Promise.resolve({})),
	},
	$transaction: mock(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
		callback(mockPrisma),
	),
};

mock.module("@/db", () => ({
	prisma: mockPrisma,
}));

const { resolveDriverBoxByDisplayId } = await import(
	"@/db/actions/delivery-mobile/box.actions.ts"
);

describe("delivery-mobile box actions — resolveDriverBoxByDisplayId", () => {
	beforeEach(() => {
		mockPrisma.vertical_delivery_employee_box.findFirst.mockReset();
	});

	test("returns box when assignment is shared", async () => {
		const box = {
			id: "box-ulid",
			box_display_id: "GP-BOX-556102",
			name: "Box #556102",
			connection_employee_id: null,
			telemetry: null,
			lock: null,
			connection_employee: null,
		};

		mockPrisma.vertical_delivery_employee_box.findFirst.mockResolvedValue({
			id: "assignment-1",
			status: "shared",
			box,
		} as any);

		const result = await resolveDriverBoxByDisplayId({
			box_display_id: "GP-BOX-556102",
			client_id: "client-1",
			employee_id: "driver-1",
		});

		expect(result.box.box_display_id).toBe("GP-BOX-556102");
		expect(mockPrisma.vertical_delivery_employee_box.findFirst).toHaveBeenCalledTimes(1);
	});

	test("throws 404 when no assignment exists", async () => {
		mockPrisma.vertical_delivery_employee_box.findFirst.mockResolvedValue(null);

		await expect(
			resolveDriverBoxByDisplayId({
				box_display_id: "GP-BOX-MISSING",
				client_id: "client-1",
				employee_id: "driver-1",
			}),
		).rejects.toThrow(APIError);
	});

	test("throws 403 when assignment is blocked", async () => {
		mockPrisma.vertical_delivery_employee_box.findFirst.mockResolvedValue({
			id: "assignment-1",
			status: "blocked",
			box: {
				id: "box-ulid",
				box_display_id: "GP-BOX-556102",
				name: "Box",
				connection_employee_id: null,
				telemetry: null,
				lock: null,
				connection_employee: null,
			},
		} as any);

		try {
			await resolveDriverBoxByDisplayId({
				box_display_id: "GP-BOX-556102",
				client_id: "client-1",
				employee_id: "driver-1",
			});
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(APIError);
			expect((error as APIError).code).toBe(403);
		}
	});
});
