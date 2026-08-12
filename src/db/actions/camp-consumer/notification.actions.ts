import type { Prisma } from "@/db/prisma";
import type { notification_category, notification_type } from "@/db/prisma";
import { prisma } from "@/db";
import { resolveConsumerBoxById } from "@/db/actions/camp-consumer/box.actions.ts";

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

export const getCampingConsumerNotifications = async (args: {
	client_id: string | null;
	consumer_id: string;
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

	const assignments = await prisma.vertical_camping_consumer_box.findMany({
		where: {
			consumer_id: args.consumer_id,
			status: "active",
		},
		select: {
			box_id: true,
			created_at: true,
			box: { select: { id: true, box_display_id: true, client_id: true } },
		},
	});

	let effectiveClientId = args.client_id;
	if (!effectiveClientId) {
		effectiveClientId = assignments.find((a) => a.box.client_id)?.box.client_id ?? null;
	}

	if (!effectiveClientId) {
		return {
			total: 0,
			unread_count: 0,
			data: [],
			current_page: args.page,
			total_pages: 0,
			context_box: null,
		};
	}

	let targetBoxIds: string[] = [];
	let context_box: { id: string; box_display_id: string } | null = null;

	if (args.filters.box_ids && args.filters.box_ids.length > 0) {
		targetBoxIds = args.filters.box_ids.filter((id) =>
			assignments.some((a) => a.box_id === id),
		);
	} else {
		const connected = await prisma.box.findFirst({
			where: {
				client_id: effectiveClientId,
				telemetry: { connection_status: "connected" },
				camping_consumer_boxes: {
					some: { consumer_id: args.consumer_id, status: "active" },
				},
			},
			select: { id: true, box_display_id: true },
		});
		if (connected && assignments.some((a) => a.box_id === connected.id)) {
			targetBoxIds = [connected.id];
		} else if (assignments.length > 0) {
			targetBoxIds = [assignments[0]!.box_id];
		}
	}

	if (targetBoxIds.length === 1) {
		const b = assignments.find((a) => a.box_id === targetBoxIds[0])?.box;
		if (b) context_box = { id: b.id, box_display_id: b.box_display_id };
	}

	const boxConditions = targetBoxIds
		.map((box_id) => {
			const assignment = assignments.find((a) => a.box_id === box_id);
			if (!assignment) return null;
			const cond: Prisma.notificationWhereInput = {
				box_id,
				created_at: { gte: assignment.created_at },
			};
			return cond;
		})
		.filter(Boolean) as Prisma.notificationWhereInput[];

	const where: Prisma.notificationWhereInput = {
		client_id: effectiveClientId,
		is_dismissed: false,
	};

	const isExplicitFilter = args.filters?.box_ids && args.filters.box_ids.length > 0;

	if (boxConditions.length > 0) {
		where.OR = isExplicitFilter ? boxConditions : [...boxConditions, { box_id: null }];
	} else {
		where.id = "00000000-0000-0000-0000-000000000000";
	}

	if (args.filters.types?.length) where.type = { in: args.filters.types };
	if (args.filters.categories?.length) where.category = { in: args.filters.categories };

	if (args.filters.start_date || args.filters.end_date) {
		where.created_at = where.created_at ?? {};
		if (args.filters.start_date) {
			(where.created_at as Prisma.DateTimeFilter).gte = new Date(args.filters.start_date);
		}
		if (args.filters.end_date) {
			(where.created_at as Prisma.DateTimeFilter).lte = new Date(args.filters.end_date);
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
		id: notification.id,
		severity: notification.type,
		title: notification.title,
		body: notification.description,
		created_at: formatCreatedAtToIST(notification.created_at),
		box_id: notification.box_id,
		is_read: notification.is_read,
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

export const markCampingConsumerNotifications = async (args: {
	client_id: string | null;
	consumer_id: string;
	ids: string[];
	is_read?: boolean;
	is_dismissed?: boolean;
}) => {
	const assignments = await prisma.vertical_camping_consumer_box.findMany({
		where: {
			consumer_id: args.consumer_id,
			status: "active",
		},
		select: { box_id: true, created_at: true, box: { select: { client_id: true } } },
	});

	let effectiveClientId = args.client_id;
	if (!effectiveClientId) {
		effectiveClientId = assignments.find((a) => a.box.client_id)?.box.client_id ?? null;
	}

	if (!effectiveClientId) {
		return;
	}

	const boxConditions = assignments.map((a) => ({
		box_id: a.box_id,
		created_at: { gte: a.created_at },
	}));

	const updateData: Record<string, boolean> = {};
	if (args.is_read !== undefined) updateData.is_read = args.is_read;
	if (args.is_dismissed !== undefined) updateData.is_dismissed = args.is_dismissed;

	const where: Prisma.notificationWhereInput = {
		id: { in: args.ids },
		client_id: effectiveClientId,
	};

	if (boxConditions.length > 0) {
		where.OR = [...boxConditions, { box_id: null }];
	} else {
		where.id = { in: [] };
	}

	await prisma.notification.updateMany({ where, data: updateData });
};

/** GET /boxes/:box_id/alerts — Figma Alerts Default (alias of notification feed scoped to one box). */
export const getConsumerBoxAlerts = async (args: {
	box_id: string;
	client_id: string | null;
	consumer_id: string;
	severity?: string;
	type?: string;
	category?: string;
	from?: string;
	to?: string;
}) => {
	await resolveConsumerBoxById({
		box_id: args.box_id,
		client_id: args.client_id ?? undefined,
		consumer_id: args.consumer_id,
	});

	const where: Prisma.notificationWhereInput = {
		box_id: args.box_id,
		is_dismissed: false,
	};

	if (args.client_id) {
		where.client_id = args.client_id;
	}

	if (args.severity) {
		where.type = {
			in: args.severity
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean) as notification_type[],
		};
	}

	if (args.type) {
		where.type = {
			in: args.type
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean) as notification_type[],
		};
	}

	if (args.category) {
		where.category = {
			in: args.category
				.split(",")
				.map((c) => c.trim())
				.filter(Boolean) as notification_category[],
		};
	}

	if (args.from || args.to) {
		where.created_at = {};
		if (args.from) where.created_at.gte = new Date(args.from);
		if (args.to) where.created_at.lte = new Date(args.to);
	}

	const rows = await prisma.notification.findMany({
		where,
		orderBy: { created_at: "desc" },
		take: 50,
	});

	return rows.map((n) => ({
		id: n.id,
		severity: n.type,
		title: n.title,
		body: n.description,
		created_at: formatCreatedAtToIST(n.created_at),
		box_id: n.box_id,
		is_read: n.is_read,
	}));
};
