import { prisma } from "@/db";
import type { notification_type, Prisma } from "@/db/types";
import { getNotifications as getSharedNotifications } from "@/db/actions/notification.actions.ts";

export interface GetMedicalNotificationsParams {
	client_id: string;
	vertical_id?: string;
	page?: number;
	limit?: number;
	types?: notification_type[];
	department_ids?: string[];
	box_ids?: string[];
	search?: string;
	is_read?: boolean;
	is_dismissed?: boolean;
}

export const getMedicalNotifications = async (params: GetMedicalNotificationsParams) => {
	const {
		client_id,
		vertical_id,
		page = 1,
		limit,
		types,
		department_ids,
		box_ids,
		search,
		is_read,
		is_dismissed,
	} = params;

	if (!department_ids?.length) {
		return getSharedNotifications({
			client_id,
			vertical_id,
			page,
			limit,
			types,
			box_ids,
			search,
			is_read,
			is_dismissed,
		});
	}

	const where: Prisma.notificationWhereInput = {
		client_id,
		...(vertical_id && { vertical_id }),
		...(types && types.length > 0 && { type: { in: types } }),
		...(is_read !== undefined && { is_read }),
		...(is_dismissed !== undefined
			? { is_dismissed }
			: is_read === true
				? {}
				: { is_dismissed: false }),
	};

	const boxesInDepartments = await prisma.vertical_medical_department_box.findMany({
		where: {
			department_id: { in: department_ids },
			department: { client_id },
		},
		select: { box_id: true },
	});
	const targetBoxIds = boxesInDepartments.map((row) => row.box_id);

	if (box_ids && box_ids.length > 0) {
		where.box_id = { in: box_ids.filter((id) => targetBoxIds.includes(id)) };
	} else {
		where.box_id = { in: targetBoxIds };
	}

	if (search) {
		where.OR = [
			{ title: { contains: search } },
			{ description: { contains: search } },
			{ box_name: { contains: search } },
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

export const getMedicalNotificationDropdowns = async (client_id: string, vertical_id?: string) => {
	const [departments, boxes] = await prisma.$transaction([
		prisma.vertical_medical_department.findMany({
			where: { client_id },
			select: { id: true, name: true },
		}),
		prisma.box.findMany({
			where: { client_id, ...(vertical_id && { vertical_id }) },
			select: { id: true, name: true, box_display_id: true },
		}),
	]);

	return {
		departments: departments.map((d) => ({ id: d.id, label: d.name })),
		boxes: boxes.map((b) => ({
			id: b.id,
			label: b.name || b.box_display_id,
			display_id: b.box_display_id,
		})),
		types: [
			{ id: "error", label: "Severe" },
			{ id: "warning", label: "Warning" },
			{ id: "success", label: "Success" },
			{ id: "notification", label: "General" },
		],
	};
};
