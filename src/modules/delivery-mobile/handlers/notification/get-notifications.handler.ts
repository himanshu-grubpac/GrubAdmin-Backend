import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { getNotificationsRequestQueryValidator } from "@/modules/delivery-mobile/validators/notification.validators.ts";
import { getDeliveryNotifications } from "@/db/actions/delivery-mobile/notification.actions.ts";
import type { notification_category, notification_type } from "@/db/prisma";

export const getNotificationsHandler = createHandlers(
	deliveryAuthGuard(["delivery"]),
	getNotificationsRequestQueryValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const {
			page,
			limit,
			box_ids,
			types,
			categories,
			start_date,
			end_date,
		} = context.req.valid("query");

		const parsedPage = parseInt(page || "1", 10);
		const parsedLimit = parseInt(limit || "10", 10);

		const filters = {
			box_ids: box_ids ? box_ids.split(",").map(id => id.trim()).filter(Boolean) : undefined,
			types: types ? (types.split(",").map(t => t.trim()) as notification_type[]) : undefined,
			categories: categories ? (categories.split(",").map(c => c.trim()) as notification_category[]) : undefined,
			start_date,
			end_date,
		};

		const result = await getDeliveryNotifications({
			client_id,
			employee_id: user_id,
			page: parsedPage,
			limit: parsedLimit,
			filters,
		});

		return context.json(
			{
				success: true,
				code: 200,
				message: "Notifications fetched successfully",
				data: result,
			},
			{ status: 200 },
		);
	},
);
