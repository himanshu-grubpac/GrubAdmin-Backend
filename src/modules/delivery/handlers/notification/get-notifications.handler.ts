import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { getNotificationsRequestQueryValidator } from "delivery/validators/notification.validators.ts";
import { getNotifications } from "@/db/actions/notification.actions.ts";
import type { APIResponse } from "@/types/api";
import type { notification } from "@/db/types";
import { calculatePagination } from "@/utils/pagination.ts";

interface ResponseData {
    notifications: notification[];
    count: number;
    unread_count: number;
}

export const getNotificationsHandler = createHandlers(
    deliveryAuthGuard(),
    getNotificationsRequestQueryValidator,
    async (context) => {
        const { client_id, vertical_id } = context.var;
        const { page, limit, types, restaurant_ids, box_ids, search, is_read, is_dismissed } = context.req.valid("query");

        const { notifications, count, unread_count } = await getNotifications({
            client_id,
            vertical_id,
            page,
            limit,
            types,
            restaurant_ids,
            box_ids,
            search,
            is_read,
            is_dismissed,
        });

        return context.json<APIResponse<ResponseData>>(
            {
                success: true,
                code: 200,
                data: {
                    notifications,
                    count,
                    unread_count,
                },
                pagination: limit
                    ? calculatePagination(page ?? 1, limit, count)
                    : undefined,
            },
            { status: 200 },
        );
    },
);
