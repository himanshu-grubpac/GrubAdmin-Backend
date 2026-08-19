import { prisma } from "@/db";
import type { notification_type, Prisma } from "@/db/types";
import { PAGE_SIZE } from "@/configs/constants";
import { MAX_PAGE_SIZE } from "@/validators/pagination";
import { APIError } from "@/types/error";
import {
	buildHospitalityMemoKey,
	hospitalityRequestMemo,
} from "@/modules/hospitality/utils/hospitality-request-memo";
import { hospitalityPrefixStringFilter } from "@/modules/hospitality/utils/hospitality-search";

/** Max distinct box ids resolved from floor filter — matches notification validator cap. */
const MAX_FLOOR_SCOPE_BOX_IDS = 500;

export interface GetHospitalityNotificationsParams {
	client_id: string;
	vertical_id?: string;
	page?: number;
	limit?: number;
	types?: notification_type[];
	floor_ids?: string[];
	box_ids?: string[];
	search?: string;
	is_read?: boolean;
	is_dismissed?: boolean;
}

/** FE contract fields only — list + header bell. */
const HOSPITALITY_NOTIFICATION_SELECT = {
	id: true,
	type: true,
	title: true,
	description: true,
	created_at: true,
	is_read: true,
	is_dismissed: true,
	box_id: true,
	box_display_id: true,
	box_name: true,
	restaurant_name: true,
} as const satisfies Prisma.notificationSelect;

export type HospitalityNotificationListItem = Prisma.notificationGetPayload<{
	select: typeof HOSPITALITY_NOTIFICATION_SELECT;
}>;

export interface HospitalityNotificationsResult {
	notifications: HospitalityNotificationListItem[];
	/** Total matching rows — used only to build pagination meta; not returned in list `data`. */
	count: number;
	page: number;
	limit: number;
}

/** Cap dropdown option lists so a single tenant cannot dump unbounded rows into the portal. */
const DROPDOWN_OPTION_LIMIT = 500;

const buildListWhere = (params: {
	client_id: string;
	vertical_id?: string;
	types?: notification_type[];
	box_ids?: string[];
	search?: string;
	is_read?: boolean;
	is_dismissed?: boolean;
}): Prisma.notificationWhereInput => {
	const { client_id, vertical_id, types, box_ids, search, is_read, is_dismissed } = params;
	const trimmedSearch = search?.trim() || undefined;

	const where: Prisma.notificationWhereInput = {
		client_id,
		...(vertical_id && { vertical_id }),
		...(types && types.length > 0 && { type: { in: types } }),
		...(is_read !== undefined && { is_read }),
		is_dismissed: is_dismissed ?? false,
		...(box_ids && box_ids.length > 0 && { box_id: { in: box_ids } }),
	};

	if (trimmedSearch) {
		const prefix = hospitalityPrefixStringFilter(trimmedSearch);
		if (prefix) {
			where.OR = [
				{ title: prefix },
				{ description: prefix },
				{ box_name: prefix },
				{ restaurant_name: prefix },
			];
		}
	}

	return where;
};

const resolveFloorScopedBoxIds = async (
	client_id: string,
	floor_ids: string[],
	box_ids?: string[],
): Promise<string[] | undefined> => {
	const rows = await prisma.vertical_hospitality_floor_box.findMany({
		where: {
			floor_id: { in: floor_ids },
			floor: { client_id },
		},
		select: { box_id: true },
		distinct: ["box_id"],
		take: MAX_FLOOR_SCOPE_BOX_IDS + 1,
	});

	if (rows.length > MAX_FLOOR_SCOPE_BOX_IDS) {
		throw new APIError(
			"Too many boxes on the selected floors. Narrow your floor filter and try again.",
			"hospitality.notification.list.FLOOR_SCOPE_TOO_LARGE",
			undefined,
			400,
		);
	}

	const targetBoxIds = rows.map((row) => row.box_id);

	if (box_ids && box_ids.length > 0) {
		const allowed = new Set(targetBoxIds);
		return box_ids.filter((id) => allowed.has(id));
	}

	return targetBoxIds;
};

export const getHospitalityNotifications = async (
	params: GetHospitalityNotificationsParams,
): Promise<HospitalityNotificationsResult> => {
	const {
		client_id,
		vertical_id,
		page = 1,
		limit,
		types,
		floor_ids,
		box_ids,
		search,
		is_read,
		is_dismissed,
	} = params;

	const effectivePage = page < 1 ? 1 : page;
	const effectiveLimit = Math.min(limit ?? PAGE_SIZE, MAX_PAGE_SIZE);
	const trimmedSearch = search?.trim() || undefined;

	let scopedBoxIds: string[] | undefined = box_ids;

	if (floor_ids?.length) {
		scopedBoxIds = await resolveFloorScopedBoxIds(client_id, floor_ids, box_ids);

		if (!scopedBoxIds || scopedBoxIds.length === 0) {
			return {
				notifications: [],
				count: 0,
				page: effectivePage,
				limit: effectiveLimit,
			};
		}
	}

	const where = buildListWhere({
		client_id,
		vertical_id,
		types,
		box_ids: scopedBoxIds,
		search: trimmedSearch,
		is_read,
		is_dismissed,
	});

	const skip = (effectivePage - 1) * effectiveLimit;

	const [notifications, count] = await prisma.$transaction([
		prisma.notification.findMany({
			where,
			select: HOSPITALITY_NOTIFICATION_SELECT,
			orderBy: { created_at: "desc" },
			skip,
			take: effectiveLimit,
		}),
		prisma.notification.count({ where }),
	]);

	return {
		notifications,
		count,
		page: effectivePage,
		limit: effectiveLimit,
	};
};

/**
 * Tenant + hospitality COUNT for the header badge.
 * Uses `@@index([client_id, vertical_id, is_dismissed, is_read])`.
 * Fail-closed if scope is missing so we never leak another vertical's unread total.
 */
export const getHospitalityUnreadNotificationsCount = async (
	client_id: string,
	vertical_id: string,
): Promise<number> => {
	if (!client_id || !vertical_id) {
		return 0;
	}

	const memoKey = buildHospitalityMemoKey("notification-unread-count", client_id, vertical_id);
	return hospitalityRequestMemo.getOrLoad(memoKey, async () => {
		return prisma.notification.count({
			where: {
				client_id,
				vertical_id,
				is_read: false,
				is_dismissed: false,
			},
		});
	});
};

export const getHospitalityNotificationDropdowns = async (client_id: string, vertical_id?: string) => {
	const memoKey = buildHospitalityMemoKey("notification-dropdowns", client_id, vertical_id);
	return hospitalityRequestMemo.getOrLoad(memoKey, async () => {
		return loadHospitalityNotificationDropdowns(client_id, vertical_id);
	});
};

const loadHospitalityNotificationDropdowns = async (client_id: string, vertical_id?: string) => {
	const [floors, boxes] = await prisma.$transaction([
		prisma.vertical_hospitality_floor.findMany({
			where: { client_id },
			select: { id: true, name: true },
			orderBy: { name: "asc" },
			take: DROPDOWN_OPTION_LIMIT,
		}),
		prisma.box.findMany({
			where: { client_id, ...(vertical_id && { vertical_id }) },
			select: { id: true, name: true, box_display_id: true },
			orderBy: [{ name: "asc" }, { box_display_id: "asc" }],
			take: DROPDOWN_OPTION_LIMIT,
		}),
	]);

	// FE hardcodes type filter options (Severe/Success/Warning); omit unused `types`.
	return {
		floors: floors.map((f) => ({ id: f.id, label: f.name })),
		boxes: boxes.map((b) => ({
			id: b.id,
			label: b.name || b.box_display_id,
			display_id: b.box_display_id,
		})),
	};
};
