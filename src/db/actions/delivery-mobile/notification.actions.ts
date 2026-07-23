import { prisma } from "@/db";
import type { Prisma } from "@/db/prisma";
import type { notification_category, notification_type } from "@/db/prisma";

const IST_TIMEZONE = "Asia/Kolkata";

const formatCreatedAtToIST = (value: Date): string => {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: IST_TIMEZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	}).formatToParts(value);

	const part = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((p) => p.type === type)?.value ?? "00";

	return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}+05:30`;
};

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

	const assignments = await prisma.vertical_delivery_employee_box.findMany({
		where: {
			employee_id: args.employee_id,
			status: { in: ["shared", "unlinked"] },
		},
		select: {
			box_id: true,
			status: true,
			created_at: true,
			unlinked_at: true,
			box: { select: { id: true, box_display_id: true } }
		},
	});

	let targetBoxIds: string[] = [];
	let context_box: { id: string; box_display_id: string } | null = null;

	if (args.filters.box_ids && args.filters.box_ids.length > 0) {
		targetBoxIds = args.filters.box_ids.filter((id) =>
			assignments.some(a => a.box_id === id),
		);
	} else {
		const employee = await prisma.vertical_delivery_employee.findUnique({
			where: { id: args.employee_id },
			select: { last_connected_box_id: true }
		});
		if (employee?.last_connected_box_id && assignments.some(a => a.box_id === employee.last_connected_box_id && a.status === "shared")) {
			targetBoxIds = [employee.last_connected_box_id];
		} else {
			const firstActive = assignments.find(a => a.status === "shared");
			if (firstActive) {
				targetBoxIds = [firstActive.box_id];
			}
		}
	}

	if (targetBoxIds.length === 1) {
		const b = assignments.find(a => a.box_id === targetBoxIds[0])?.box;
		if (b) {
			context_box = { id: b.id, box_display_id: b.box_display_id };
		}
	}

	const boxConditions = targetBoxIds.map(box_id => {
		const assignment = assignments.find(a => a.box_id === box_id);
		if (!assignment) return null;

		const cond: Prisma.notificationWhereInput = { box_id: box_id };
		if (assignment.status === "unlinked" && assignment.unlinked_at) {
			cond.created_at = {
				gte: assignment.created_at,
				lte: assignment.unlinked_at
			};
		} else {
			cond.created_at = {
				gte: assignment.created_at
			};
		}
		return cond;
	}).filter(Boolean) as Prisma.notificationWhereInput[];

	const where: Prisma.notificationWhereInput = {
		client_id: args.client_id,
		is_dismissed: false,
	};

	const isExplicitFilter = args.filters?.box_ids && args.filters.box_ids.length > 0;

	if (boxConditions.length > 0) {
		where.OR = isExplicitFilter
			? boxConditions
			: [...boxConditions, { box_id: null }];
	} else {
		// Force empty if no boxes assigned
		where.id = "00000000-0000-0000-0000-000000000000";
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

	const [total, rows] = await Promise.all([
		prisma.notification.count({ where }),
		prisma.notification.findMany({
			where,
			orderBy: { created_at: "desc" },
			skip,
			take: args.limit,
		}),
	]);

	const data = rows.map((notification) => ({
		...notification,
		created_at: formatCreatedAtToIST(notification.created_at),
	}));

	const unread_count = await prisma.notification.count({
		where: { ...where, is_read: false },
	});

	return {
		total,
		unread_count,
		data,
		current_page: args.page,
		total_pages: Math.ceil(total / args.limit),
		context_box,
	};
};

export const markDeliveryNotifications = async (args: {
	client_id: string;
	employee_id: string;
	ids: string[];
	is_read?: boolean;
	is_dismissed?: boolean;
}) => {
	const assignments = await prisma.vertical_delivery_employee_box.findMany({
		where: {
			employee_id: args.employee_id,
			status: { in: ["shared", "unlinked"] },
		},
		select: { box_id: true, status: true, created_at: true, unlinked_at: true },
	});

	const boxConditions = assignments.map(a => {
		const cond: Prisma.notificationWhereInput = { box_id: a.box_id };
		if (a.status === "unlinked" && a.unlinked_at) {
			cond.created_at = { gte: a.created_at, lte: a.unlinked_at };
		} else {
			cond.created_at = { gte: a.created_at };
		}
		return cond;
	});

	const updateData: any = {};
	if (args.is_read !== undefined) updateData.is_read = args.is_read;
	if (args.is_dismissed !== undefined) updateData.is_dismissed = args.is_dismissed;

	const where: Prisma.notificationWhereInput = {
		id: { in: args.ids },
		client_id: args.client_id,
	};

	if (boxConditions.length > 0) {
		where.OR = [
			...boxConditions,
			{ box_id: null }
		];
	} else {
		where.id = { in: [] };
	}

	await prisma.notification.updateMany({
		where,
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
