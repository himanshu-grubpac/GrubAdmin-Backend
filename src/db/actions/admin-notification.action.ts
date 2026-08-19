import { AdminNotification, type AdminNotificationModel } from "@/db/mongo-schema";
import type {
	AdminNotificationGoal,
	AdminNotificationStatus,
	AdminNotificationType,
} from "@/types/common";
import { Types } from "mongoose";
import {
	ADMIN_NOTIFICATION_MAX_PAGE_SIZE,
} from "@/modules/admin/configs/admin-notification-limits.ts";

interface CreateAdminNotificationArgs {
	title: string;
	description: string;
	employee_id?: string;
	employee_name?: string;
	item_id?: string;
	item_name?: string;
	item_type?: string;
	role_id?: string;
	status: AdminNotificationStatus;
	type: AdminNotificationType;
	goal: AdminNotificationGoal;
}

export const createAdminNotifications = async (
	args: CreateAdminNotificationArgs[],
) => {
	return AdminNotification.insertMany(args);
};

interface GetAdminNotificationsArgs {
	query?: string;
	type?: AdminNotificationType[];
	status?: AdminNotificationStatus[];
	page?: number;
	limit?: number;
	userId: string;
}

export interface AdminNotificationsResult {
	notifications: AdminNotificationModel[];
	count: number;
	page: number;
	limit: number;
}

/** Admin list — always paginated; default and max page size 50 (A-BE-02). */
export const getAdminNotifications = async (
	args: GetAdminNotificationsArgs,
): Promise<AdminNotificationsResult> => {
	const page = Math.max(args.page ?? 1, 1);
	const limit = Math.min(
		args.limit ?? ADMIN_NOTIFICATION_MAX_PAGE_SIZE,
		ADMIN_NOTIFICATION_MAX_PAGE_SIZE,
	);
	const skip = (page - 1) * limit;

	const query: Record<string, unknown> = {
		recipient_id: args.userId,
	};

	if (args.query) {
		query["$or"] = [
			{
				title: {
					$regex: args.query,
					$options: "i",
				},
			},
			{
				description: {
					$regex: args.query,
					$options: "i",
				},
			},
		];
	}

	if (args.type) {
		query["type"] = {
			$in: args.type,
		};
	}

	if (args.status) {
		query["status"] = {
			$in: args.status,
		};
	}

	const [notifications, count] = await Promise.all([
		AdminNotification.find(query)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.exec(),
		AdminNotification.countDocuments(query),
	]);

	return { notifications, count, page, limit };
};

interface ReadAdminNotificationArgs {
	ids: string[];
	recipientId: string;
}

export const readAdminNotification = async (
	args: ReadAdminNotificationArgs,
) => {
	return AdminNotification.updateMany(
		{
			_id: {
				$in: args.ids.map((id) => new Types.ObjectId(id)),
			},
			recipient_id: args.recipientId,
		},
		{
			status: "read",
		},
	);
};
