import { prisma } from "@/db";
import type { Prisma } from "@/db/prisma";
import type { notification_category, notification_type } from "@/db/prisma";
import { resolveHandlerBoxById } from "@/db/actions/medical-mobile/box.actions.ts";
import { resolveOwnerBoxById } from "@/db/actions/medical-mobile/owner-box.actions.ts";

export type MedicalBoxAlertsFilters = {
	severity?: string;
	type?: string;
	category?: string;
	from?: string;
	to?: string;
};

const applyAlertFilters = (
	where: Prisma.notificationWhereInput,
	filters: MedicalBoxAlertsFilters,
): void => {
	const severityTypes = filters.severity
		?.split(",")
		.map((s) => s.trim())
		.filter(Boolean) as notification_type[] | undefined;

	const explicitTypes = filters.type
		?.split(",")
		.map((s) => s.trim())
		.filter(Boolean) as notification_type[] | undefined;

	const typeFilter = explicitTypes?.length ? explicitTypes : severityTypes;

	if (typeFilter?.length) {
		where.type = { in: typeFilter };
	}

	if (filters.category) {
		where.category = {
			in: filters.category
				.split(",")
				.map((c) => c.trim())
				.filter(Boolean) as notification_category[],
		};
	}

	if (filters.from || filters.to) {
		where.created_at = {};
		if (filters.from) where.created_at.gte = new Date(filters.from);
		if (filters.to) where.created_at.lte = new Date(filters.to);
	}
};

export const queryMedicalBoxAlerts = async (args: {
	box_id: string;
	client_id: string;
	filters?: MedicalBoxAlertsFilters;
}) => {
	const where: Prisma.notificationWhereInput = {
		client_id: args.client_id,
		box_id: args.box_id,
		is_dismissed: false,
	};

	applyAlertFilters(where, args.filters ?? {});

	const rows = await prisma.notification.findMany({
		where,
		orderBy: { created_at: "desc" },
		take: 50,
	});

	return rows.map((n) => ({
		id: n.id,
		severity: n.type,
		type: n.type,
		category: n.category,
		title: n.title,
		body: n.description,
		created_at: n.created_at.toISOString(),
		box_id: n.box_id,
		is_read: n.is_read,
	}));
};

export const getHandlerBoxAlerts = async (args: {
	box_id: string;
	client_id: string;
	employee_id: string;
	severity?: string;
	type?: string;
	category?: string;
	from?: string;
	to?: string;
}) => {
	await resolveHandlerBoxById(args);
	return queryMedicalBoxAlerts({
		box_id: args.box_id,
		client_id: args.client_id,
		filters: args,
	});
};

export const getOwnerBoxAlerts = async (args: {
	box_id: string;
	client_id: string;
	severity?: string;
	type?: string;
	category?: string;
	from?: string;
	to?: string;
}) => {
	await resolveOwnerBoxById(args);
	return queryMedicalBoxAlerts({
		box_id: args.box_id,
		client_id: args.client_id,
		filters: args,
	});
};
