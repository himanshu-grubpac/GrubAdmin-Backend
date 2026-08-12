import { describe, expect, test, mock, beforeEach } from "bun:test";
import { Hono } from "hono";
import { medicalMobileOwnerRouter } from "@/modules/medical-mobile/owner";

const mockUpdateMedicalBoxLockStatus = mock(() => Promise.resolve({ count: 1 }));
const mockCreateNotification = mock(() => Promise.resolve({}));

mock.module("@/db/actions/medical/box.actions.ts", () => ({
	updateMedicalBoxLockStatus: mockUpdateMedicalBoxLockStatus,
}));

mock.module("@/db/actions/notification.actions.ts", () => ({
	createNotification: mockCreateNotification,
}));

mock.module("@/middlewares/auth", () => ({
	medicalMobileAuthGuard: () => async (c: any, next: () => Promise<void>) => {
		c.set("user_id", "owner-1");
		c.set("client_id", "client-a");
		c.set("vertical_id", "vertical-medical");
		c.set("user", {
			id: "owner-1",
			email: "owner@test.com",
			name: "Owner Hospital",
			organization_name: "Owner Hospital",
		});
		await next();
	},
}));

const { emergencyUnlockMedicalBoxes } = await import("@/db/actions/medical/grublock.actions.ts");

describe("Medical mobile owner emergency unlock", () => {
	beforeEach(() => {
		mockUpdateMedicalBoxLockStatus.mockClear();
		mockCreateNotification.mockClear();
	});

	test("PATCH /grublock/emergency_unlock route is registered (no OTP path)", () => {
		const app = new Hono();
		app.route("/api/v1/medical-mobile/owner", medicalMobileOwnerRouter);
		const routes = app.routes.map((r) => `${r.method} ${r.path}`);

		expect(routes).toContain("PATCH /api/v1/medical-mobile/owner/grublock/emergency_unlock");
		expect(routes).not.toContain("POST /api/v1/medical-mobile/owner/boxes/:box_id/lock/otp");
	});

	test("emergencyUnlockMedicalBoxes unlocks with optional reason and creates notifications", async () => {
		await emergencyUnlockMedicalBoxes({
			ids: ["box-1"],
			client_id: "client-a",
			vertical_id: "vertical-medical",
			user: {
				id: "owner-1",
				email: "owner@test.com",
				name: "Owner Hospital",
				role: "owner",
				type: "admin",
			},
			reason: "Medical emergency",
		});

		expect(mockUpdateMedicalBoxLockStatus).toHaveBeenCalledTimes(1);
		expect(mockUpdateMedicalBoxLockStatus).toHaveBeenCalledWith(
			expect.objectContaining({
				ids: ["box-1"],
				lock_status: "unlocked",
				client_id: "client-a",
				reason: "Medical emergency",
			}),
		);
		expect(mockCreateNotification).toHaveBeenCalledTimes(1);
	});

	test("emergency unlock action accepts missing reason", async () => {
		await emergencyUnlockMedicalBoxes({
			ids: ["box-1"],
			client_id: "client-a",
			vertical_id: "vertical-medical",
			user: {
				id: "owner-1",
				email: "owner@test.com",
				name: "Owner Hospital",
				role: "owner",
			},
		});

		expect(mockUpdateMedicalBoxLockStatus).toHaveBeenCalledWith(
			expect.not.objectContaining({ reason: expect.anything() }),
		);
	});
});
