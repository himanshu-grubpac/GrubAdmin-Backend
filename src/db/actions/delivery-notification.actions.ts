import {
	getNotifications,
	type CreateNotificationParams,
	type GetNotificationsParams,
} from "@/db/actions/notification.actions.ts";
import { prisma } from "@/db";
import type { notification } from "@/db/types";
import { SEARCH_PAGE_SIZE } from "@/validators/pagination";

export type GetDeliveryNotificationsParams = GetNotificationsParams;

export interface DeliveryNotificationsResult {
	notifications: notification[];
	count: number;
	unread_count: number;
	page: number;
	limit: number;
}

/** Delivery list — always paginated; default and max page size 50 (D-BE-06). */
export const getDeliveryNotifications = async (
	params: GetDeliveryNotificationsParams,
): Promise<DeliveryNotificationsResult> => {
	const page = params.page ?? 1;
	const limit = Math.min(params.limit ?? SEARCH_PAGE_SIZE, SEARCH_PAGE_SIZE);

	const { notifications, count, unread_count } = await getNotifications({
		...params,
		page,
		limit,
	});

	return { notifications, count, unread_count, page, limit };
};

/** Batch create delivery notifications — single MySQL write (D-BE-08). */
export const createDeliveryNotifications = async (
	notifications: CreateNotificationParams[],
): Promise<{ created_count: number }> => {
	if (!notifications.length) {
		return { created_count: 0 };
	}

	const result = await prisma.notification.createMany({ data: notifications });
	return { created_count: result.count };
};
