import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { unlockGrublockRequestBodyValidator } from "food/validators/box.validators.ts";
import { saveFoodEmployeeOtp } from "@/db/actions/food-employee-otp.actions.ts";
import type { APIResponse } from "@/types/api";
import { Otp } from "@/utils/otp.ts";

export const unlockGrublockHandler = createHandlers(
	foodAuthGuard(["admin", "manager", "delivery"]),
	unlockGrublockRequestBodyValidator,
	async (context) => {
		const { user, type } = context.var;
		const { ids, consumer_full_name, consumer_country_code, consumer_phone } =
			context.req.valid("json");

		const userObj = user as any;
		
		// Dynamically generate random secure OTP in production, preserve "2026" for backward compatibility in dev/test env
		const otp = process.env.NODE_ENV === "production" ? Otp.generateOtp(4) : "2026";

		const updatedOtpRecord = await saveFoodEmployeeOtp({
			email: userObj.email,
			otp,
			role: type,
			for_what: "unlock_box",
			metadata: {
				ids,
				consumer: consumer_full_name
					? {
							full_name: consumer_full_name,
							country_code: consumer_country_code || "",
							phone: consumer_phone || "",
					  }
					: undefined,
			},
		});

		if (!updatedOtpRecord) {
			return context.json<APIResponse<any>>(
				{
					success: false,
					code: 500,
					error: "Failed to generate OTP",
				},
				{ status: 500 }
			);
		}

		
		// Start auto-injected log
		try {
			// Find subjects from result if array or use req body
			const subjects = (context.req.valid("json") as any)?.ids || ((context.req.valid("json") as any)?.id ? [(context.req.valid("json") as any)?.id] : ["Unknown"]);
			for (const id of subjects) {
				await loggerService.log({
					category: "GrubLock",
					type: "Status",
					actor: { 
						id: (context.var as any).client_id || (context.var as any).admin_id || "Unknown", 
						name: (context.var as any).admin_name || (context.var as any).employee_id || "Admin", 
						role: "admin", 
						table: "client" 
					},
					client_id: context.var.client_id,
					subject: { id: id, name: id, type: "box" },
					metadata: { action: "unlock" }
				});
			}
		} catch (err) { }
		// End auto-injected log

		return context.json<APIResponse<{ otp_id: string; is_otp: boolean; otp_details: { type: string; values: string[] } }>>(
			{
				success: true,
				code: 200,
				message: "OTP sent to mobile successfully",
				data: {
					otp_id: updatedOtpRecord.otp_id,
					is_otp: true,
					otp_details: {
						type: "email",
						values: [userObj.email],
					},
				},
			},
			{
				status: 200,
			},
		);
	},
);
