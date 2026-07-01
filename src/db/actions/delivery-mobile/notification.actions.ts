import { prisma } from "@/db";
import type { Prisma } from "@/db/prisma";
import type { notification_category, notification_type } from "@/db/prisma";

export const getDeliveryNotifications = async (args: {
	client_id: string;
	employee_id: string;
	page: number;
	limit: number;
	filters: {
		box_ids?: string[];
		types?: notification_type[];
		categories?: notification_category[];
		start_date?: string;
		end_date?: string;
	};
}) => {
	const skip = (args.page - 1) * args.limit;

	// Fetch boxes assigned to this driver
	const assignedBoxes = await prisma.vertical_delivery_employee_box.findMany({
		where: {
			employee_id: args.employee_id,
			status: "shared",
		},
		select: { box_id: true },
	});
	const assignedBoxIds = assignedBoxes.map((b) => b.box_id);

	const where: Prisma.notificationWhereInput = {
		client_id: args.client_id,
		is_dismissed: false,
		OR: [
			{ box_id: { in: assignedBoxIds } },
			{ box_id: null },
		],
	};

	if (args.filters.box_ids && args.filters.box_ids.length > 0) {
		// If they explicitly filter by box, ensure it's within their assigned boxes
		const allowedBoxIds = args.filters.box_ids.filter((id) =>
			assignedBoxIds.includes(id),
		);
		where.box_id = { in: allowedBoxIds };
		delete where.OR; // Replace OR with explicit box filter
	}

	if (args.filters.types && args.filters.types.length > 0) {
		where.type = { in: args.filters.types };
	}

	if (args.filters.categories && args.filters.categories.length > 0) {
		where.category = { in: args.filters.categories };
	}

	if (args.filters.start_date || args.filters.end_date) {
		where.created_at = {};
		if (args.filters.start_date) {
			where.created_at.gte = new Date(args.filters.start_date);
		}
		if (args.filters.end_date) {
			where.created_at.lte = new Date(args.filters.end_date);
		}
	}

	const [total, data] = await Promise.all([
		prisma.notification.count({ where }),
		prisma.notification.findMany({
			where,
			orderBy: { created_at: "desc" },
			skip,
			take: args.limit,
		}),
	]);

	const unread_count = await prisma.notification.count({
		where: { ...where, is_read: false },
	});

	return {
		total,
		unread_count,
		data,
		current_page: args.page,
		total_pages: Math.ceil(total / args.limit),
	};
};

export const markDeliveryNotifications = async (args: {
	client_id: string;
	employee_id: string;
	ids: string[];
	is_read?: boolean;
	is_dismissed?: boolean;
}) => {
	const assignedBoxes = await prisma.vertical_delivery_employee_box.findMany({
		where: {
			employee_id: args.employee_id,
			status: "shared",
		},
		select: { box_id: true },
	});
	const assignedBoxIds = assignedBoxes.map((b) => b.box_id);

	const updateData: any = {};
	if (args.is_read !== undefined) updateData.is_read = args.is_read;
	if (args.is_dismissed !== undefined) updateData.is_dismissed = args.is_dismissed;

	await prisma.notification.updateMany({
		where: {
			id: { in: args.ids },
			client_id: args.client_id,
			OR: [
				{ box_id: { in: assignedBoxIds } },
				{ box_id: null },
			],
		},
		data: updateData,
	});
};

export const createDeliveryTestNotification = async (args: {
	client_id: string;
	box_id?: string;
	category?: notification_category;
	type: notification_type;
	title: string;
	description: string;
}) => {
	let box_display_id = null;
	let box_name = null;
	
	if (args.box_id) {
		const box = await prisma.box.findUnique({
			where: { id: args.box_id },
			select: { box_display_id: true, name: true },
		});
		if (box) {
			box_display_id = box.box_display_id;
			box_name = box.name;
		}
	}

	return prisma.notification.create({
		data: {
			client_id: args.client_id,
			box_id: args.box_id,
			box_display_id,
			box_name,
			type: args.type,
			category: args.category,
			title: args.title,
			description: args.description,
			is_read: false,
			is_dismissed: false,
		},
	});
};
