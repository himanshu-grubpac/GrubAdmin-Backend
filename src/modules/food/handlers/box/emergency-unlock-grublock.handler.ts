import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { emergencyUnlockGrublockRequestBodyValidator } from "food/validators/box.validators.ts";
import { updateBoxLockStatus } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";

export const emergencyUnlockGrublockHandler = createHandlers(
	foodAuthGuard(["admin", "manager"]),
	emergencyUnlockGrublockRequestBodyValidator,
	async (context) => {
		const { client_id, user_id, user, type } = context.var;
		const { ids, reason } = context.req.valid("json");

		const userObj = user as any;
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
			reason,
			client_id,
		});

		const templatePath = ids.length > 1 
			? "food.box.unlock.BULK_REQUEST_SENT" 
			: "food.box.unlock.REQUEST_SENT";

		const response = {
			success: true as const,
			...resolveMessageTemplate(templatePath, { id: ids[0] }),
			message: "Boxes emergency unlocked successfully", // Specific override
			data: result,
		};

		
		// Start auto-injected log
		try {
			// Find subjects from result if array or use req body
			const subjects = (context.req.valid("json") as any)?.ids || ((context.req.valid("json") as any)?.id ? [(context.req.valid("json") as any)?.id] : ["Unknown"]);
			for (const id of subjects) {
				await loggerService.log({
					category: "GrubLock",
					type: "Emergency unlock",
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

		return context.json<APIResponse<typeof result>>(response, response.code as any);
	},
);
