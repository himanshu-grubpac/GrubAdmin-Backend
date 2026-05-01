import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { verifyUnlockGrublockRequestBodyValidator } from "food/validators/box.validators.ts";
import { getSavedFoodEmployeeOtp, deleteSavedFoodEmployeeOtp } from "@/db/actions/food-employee-otp.actions.ts";
import { updateBoxLockStatus } from "@/db/actions/box.actions.ts";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";

export const verifyUnlockGrublockHandler = createHandlers(
	foodAuthGuard(["admin", "manager", "delivery"]),
	verifyUnlockGrublockRequestBodyValidator,
	async (context) => {
		const { client_id, user_id, user, type } = context.var;
		const { otp_id, otp } = context.req.valid("json");

		const userObj = user as any;
		const savedOtp = await getSavedFoodEmployeeOtp(userObj.email, otp_id);

		if (!savedOtp) {
			throw new APIError("OTP expired or invalid", undefined, undefined, 400);
		}

		if (savedOtp.otp !== otp) {
			throw new APIError("Invalid OTP", undefined, undefined, 400);
		}

		if (savedOtp.for_what !== "unlock_box") {
			throw new APIError("Invalid OTP purpose", undefined, undefined, 400);
		}

		const { ids, consumer } = savedOtp.metadata || {};

		if (!ids || !Array.isArray(ids)) {
			throw new APIError("Invalid session metadata", undefined, undefined, 400);
		}

		const userName = type === "admin"
			? userObj.name
			: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

		const result = await updateBoxLockStatus({
			ids,
			lock_status: "unlocked",
			user: {
				id: user_id,
				email: userObj.email || "",
				name: userName || "Unknown",
			},
			client_id,
			consumer: consumer || undefined,
		});

		// Clean up OTP after successful verification
		await deleteSavedFoodEmployeeOtp(userObj.email);

		
		// Start auto-injected log
		try {
			// Find subjects from result if array or use req body
			const subjects = (context.req.valid("json") as any)?.ids || ((context.req.valid("json") as any)?.id ? [(context.req.valid("json") as any)?.id] : ["Unknown"]);
			for (const id of subjects) {
				await loggerService.log({
					category: "GrubLock",
					type: "OTP",
					actor: { 
						id: (context.var as any).client_id || (context.var as any).admin_id || "Unknown", 
						name: (context.var as any).admin_name || (context.var as any).employee_id || "Admin", 
						role: "admin", 
						table: "client" 
					},
					client_id: context.var.client_id,
					subject: { id: id, name: id, type: "box" },
					metadata: {  }
				});
			}
		} catch (err) { }
		// End auto-injected log

		return context.json<APIResponse<typeof result>>(
			{
				success: true,
				code: 200,
				message: "Boxes unlocked successfully",
				data: result,
			},
			{
				status: 200,
			},
		);
	},
);
