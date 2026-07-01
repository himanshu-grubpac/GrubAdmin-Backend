import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { getUnreadNotificationsCount } from "@/db/actions/notification.actions.ts";
import type { APIResponse } from "@/types/api";

export const getUnreadNotificationsCountHandler = createHandlers(
    deliveryAuthGuard(),
    async (context) => {
        const { client_id, vertical_id } = context.var;

        const unread_count = await getUnreadNotificationsCount(client_id, vertical_id);

        return context.json<APIResponse<{ unread_count: number }>>(
            {
                success: true,
                code: 200,
                data: {
                    unread_count,
                },
                message: "Unread notifications count fetched successfully",
            },
            { status: 200 },
        );
    },
);
