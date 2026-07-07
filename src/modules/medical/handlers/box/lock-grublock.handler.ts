import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { lockUnlockGrublockRequestBodyValidator } from "medical/validators/box.validators.ts";
import { updateMedicalBoxLockStatus } from "@/db/actions/medical/box.actions.ts";
import { createNotification } from "@/db/actions/notification.actions.ts";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";

export const lockGrublockHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	lockUnlockGrublockRequestBodyValidator,
	async (context) => {
		const { client_id, user_id, user, type, vertical_id } = context.var;
		const { ids, consumer_full_name, consumer_country_code, consumer_phone } = context.req.valid("json");

		const userObj = user as any;
		const userName = type === "admin"
			? (userObj.name as string)
			: `${userObj.first_name || ""} ${userObj.last_name || ""}`.trim();

		const result = await updateMedicalBoxLockStatus({
			ids,
			lock_status: "locked",
			user: {
				id: user_id,
				email: userObj.email || "",
				name: userName || "Unknown",
				type,
				role: type,
				client_id,
				vertical_id,
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

		// Create notification for each locked box
		try {
			for (const boxId of ids) {
				await createNotification({
					client_id,
					vertical_id,
					box_id: boxId,
					type: "warning",
					title: "Box Locked",
					description: `Box ${boxId} has been locked${consumer_full_name ? ` by ${consumer_full_name}` : ""}`,
				});
			}
		} catch (err) {
			console.error("Failed to create lock notification:", err);
		}

		return context.json<APIResponse<typeof result>>(response, response.code as 200);
	},
);
