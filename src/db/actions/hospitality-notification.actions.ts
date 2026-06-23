import { prisma } from "@/db";
import type { notification_type, Prisma } from "@/db/types";
import { getNotifications as getSharedNotifications } from "@/db/actions/notification.actions.ts";

export interface GetHospitalityNotificationsParams {
	client_id: string;
	page?: number;
	limit?: number;
	types?: notification_type[];
	floor_ids?: string[];
	box_ids?: string[];
	search?: string;
	is_read?: boolean;
	is_dismissed?: boolean;
}

export const getHospitalityNotifications = async (params: GetHospitalityNotificationsParams) => {
	const {
		client_id,
		page = 1,
		limit,
		types,
		floor_ids,
		box_ids,
		search,
		is_read,
		is_dismissed,
	} = params;

	if (!floor_ids?.length) {
		return getSharedNotifications({
			client_id,
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
		...(types && types.length > 0 && { type: { in: types } }),
		...(is_read !== undefined && { is_read }),
		is_dismissed: is_dismissed ?? false,
	};

	const boxesOnFloors = await prisma.vertical_hospitality_floor_box.findMany({
		where: {
			floor_id: { in: floor_ids },
			floor: { client_id },
		},
		select: { box_id: true },
	});
	const targetBoxIds = boxesOnFloors.map((row) => row.box_id);

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
		where: { client_id, is_read: false, is_dismissed: false },
	});

	return { notifications, count, unread_count };
};

export const getHospitalityNotificationDropdowns = async (client_id: string) => {
	const [floors, boxes] = await prisma.$transaction([
		prisma.vertical_hospitality_floor.findMany({
			where: { client_id },
			select: { id: true, name: true },
		}),
		prisma.box.findMany({
			where: { client_id },
			select: { id: true, name: true, box_display_id: true },
		}),
	]);

	return {
		floors: floors.map((f) => ({ id: f.id, label: f.name })),
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
