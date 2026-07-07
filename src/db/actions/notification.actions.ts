import { prisma } from "@/db";
import type { notification_type, Prisma } from "@/db/types";

export interface GetNotificationsParams {
	client_id: string;
	vertical_id?: string;
	page?: number;
	limit?: number;
	types?: notification_type[];
	restaurant_ids?: string[];
	box_ids?: string[];
	search?: string;
	is_read?: boolean;
	is_dismissed?: boolean;
}

export interface MarkNotificationsParams {
	client_id: string;
	vertical_id?: string;
	/** Specific IDs to mark. If omitted, all notifications for the client are marked. */
	ids?: string[];
	is_read?: boolean;
	is_dismissed?: boolean;
}

export interface CreateNotificationParams {
	client_id: string;
	vertical_id?: string;
	box_id?: string;
	box_display_id?: string;
	box_name?: string;
	restaurant_name?: string;
	type?: notification_type;
	title: string;
	description: string;
}

// ─── Read ───────────────────────────────────────────────────────────────────

export const getNotifications = async ({
	client_id,
	vertical_id,
	page = 1,
	limit,
	types,
	restaurant_ids,
	box_ids,
	search,
	is_read,
	is_dismissed,
}: GetNotificationsParams) => {
	const where: Prisma.notificationWhereInput = {
		client_id,
		...(vertical_id && { vertical_id }),
		...(types && types.length > 0 && { type: { in: types } }),
		...(is_read !== undefined && { is_read }),
		is_dismissed: is_dismissed ?? false,
	};

	// Filter by boxes in specific restaurants
	if (restaurant_ids && restaurant_ids.length > 0) {
		const boxesInRestaurants = await prisma.restaurant_box.findMany({
			where: { restaurant_id: { in: restaurant_ids } },
			select: { box_id: true }
		});
		const targetBoxIds = boxesInRestaurants.map(rb => rb.box_id);
		
		if (box_ids && box_ids.length > 0) {
			// Intersection of requested boxes and boxes in requested restaurants
			where.box_id = { in: box_ids.filter(id => targetBoxIds.includes(id)) };
		} else {
			where.box_id = { in: targetBoxIds };
		}
	} else if (box_ids && box_ids.length > 0) {
		where.box_id = { in: box_ids };
	}

	if (search) {
		where.OR = [
			{ title: { contains: search } },
			{ description: { contains: search } },
			{ box_name: { contains: search } },
			{ restaurant_name: { contains: search } },
		];
	}

	const fetchAll = limit === undefined;
	const skip = fetchAll ? undefined : (page - 1) * limit!;
	const take = fetchAll ? undefined : limit;

	const [notifications, count] = await prisma.$transaction([
		prisma.notification.findMany({
			where,
			orderBy: { created_at: "desc" },
			skip,
			take,
		}),
		prisma.notification.count({ where }),
	]);

	const unread_count = await prisma.notification.count({
		where: { client_id, ...(vertical_id && { vertical_id }), is_read: false, is_dismissed: false },
	});

	return { notifications, count, unread_count };
};

export const getUnreadNotificationsCount = async (client_id: string, vertical_id?: string) => {
	return prisma.notification.count({
		where: { client_id, ...(vertical_id && { vertical_id }), is_read: false, is_dismissed: false },
	});
};

// ─── Mutations ───────────────────────────────────────────────────────────────

export const markNotifications = async ({
	client_id,
	vertical_id,
	ids,
	is_read,
	is_dismissed,
}: MarkNotificationsParams) => {
	const where: Prisma.notificationWhereInput = {
		client_id,
		...(vertical_id && { vertical_id }),
		...(ids && ids.length > 0 ? { id: { in: ids } } : { is_dismissed: false }),
	};

	const data: Prisma.notificationUpdateManyMutationInput = {};
	if (is_read !== undefined) data.is_read = is_read;
	if (is_dismissed !== undefined) data.is_dismissed = is_dismissed;

	const result = await prisma.notification.updateMany({ where, data });
	return { updated_count: result.count };
};

export const createNotification = async (params: CreateNotificationParams) => {
	return prisma.notification.create({ data: params });
};
