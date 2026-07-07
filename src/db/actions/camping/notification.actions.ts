import { prisma } from "@/db";

interface GetCampingNotificationsArgs {
	client_id: string;
	vertical_id: string;
	box_id?: string;
	category?: string;
	type?: string;
	page?: number;
	page_size?: number;
}

export const getCampingNotifications = async (args: GetCampingNotificationsArgs) => {
	const { client_id, vertical_id, box_id, category, type, page = 1, page_size = 40 } = args;

	const where: any = {
		client_id,
		vertical_id,
		is_dismissed: false,
	};

	if (box_id) where.box_id = box_id;
	if (category) where.category = category;
	if (type) where.type = type;

	const skip = (page - 1) * page_size;

	const [notifications, total] = await Promise.all([
		prisma.notification.findMany({
			where,
			skip,
			take: page_size,
			orderBy: { created_at: "desc" },
		}),
		prisma.notification.count({ where }),
	]);

	return { notifications, total };
};

export const getCampingUnreadNotificationCount = async (client_id: string, vertical_id: string) => {
	return prisma.notification.count({
		where: {
			client_id,
			vertical_id,
			is_read: false,
			is_dismissed: false,
		},
	});
};

export const markCampingNotificationsAsRead = async (ids: string[], client_id: string) => {
	return prisma.notification.updateMany({
		where: {
			id: { in: ids },
			client_id,
		},
		data: { is_read: true },
	});
};
