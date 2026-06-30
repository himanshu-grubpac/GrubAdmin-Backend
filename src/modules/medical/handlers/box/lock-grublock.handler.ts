import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { lockUnlockGrublockRequestBodyValidator } from "medical/validators/box.validators.ts";
import { updateBoxLockStatus } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";

export const lockGrublockHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	lockUnlockGrublockRequestBodyValidator,
	async (context) => {
		const { client_id, user_id, user, type } = context.var;
		const { ids, consumer_full_name, consumer_country_code, consumer_phone } = context.req.valid("json");

		const userObj = user as any;
		const userName = type === "admin"
			? (userObj.name as string)
			: `${userObj.first_name || ""} ${userObj.last_name || ""}`.trim();

		const result = await updateBoxLockStatus({
			ids,
			lock_status: "locked",
			user: {
				id: user_id,
				email: userObj.email || "",
				name: userName || "Unknown",
			},
			client_id,
			consumer: consumer_full_name
				? {
					full_name: consumer_full_name,
					country_code: consumer_country_code || "",
					phone: consumer_phone || "",
				}
				: undefined,
		});

		const mobile = consumer_phone ? `${consumer_country_code || ""} ${consumer_phone}`.trim() : "your registered phone";
		const response = {
			success: true as const,
			...resolveMessageTemplate("medical.common.UPDATE_SUCCESS", { id: ids[0], mobile }),
			message: "Boxes locked successfully",
			data: result,
		};

		try {
			for (const id of ids) {
				await loggerService.log({
					category: "GrubLock",
					type: "Status",
					actor: { id: user_id, name: userName, role: type, table: type === "admin" ? "client" : "vertical_medical_employee" },
					client_id,
					subject: { id, name: id, type: "box" },
					metadata: { action: "lock" },
				});
			}
		} catch {
			// non-fatal
		}

		return context.json<APIResponse<typeof result>>(response, response.code as 200);
	},
);
