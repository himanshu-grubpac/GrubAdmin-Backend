import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { createTestNotificationBodyValidator } from "@/modules/delivery-mobile/validators/notification.validators.ts";
import { createDeliveryTestNotification } from "@/db/actions/delivery-mobile/notification.actions.ts";

export const testTriggerNotificationHandler = createHandlers(
	deliveryAuthGuard(["delivery"]),
	createTestNotificationBodyValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const { box_id, category, type, title, description } = context.req.valid("json");

		const newNotification = await createDeliveryTestNotification({
			client_id,
			box_id,
			category,
			type,
			title,
			description,
		});

		return context.json(
			{
				success: true,
				code: 201,
				message: "Test notification created successfully",
				data: newNotification,
			},
			{ status: 201 },
		);
	},
);
