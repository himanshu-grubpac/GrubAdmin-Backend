import { AdminNotification } from "@/db/mongo-schema";
import type {
	AdminNotificationGoal,
	AdminNotificationStatus,
	AdminNotificationType,
} from "@/types/common";
import { Types } from "mongoose";

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
	minified?: boolean;
	userId: string;
}

export const getAdminNotifications = async (
	args: GetAdminNotificationsArgs,
) => {
	const query: Record<string, any> = {
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

	const notificationsQuery = AdminNotification.find(query).sort({
		createdAt: -1,
	});

	if (args.minified) {
		notificationsQuery.limit(4);
	}

	return await notificationsQuery.exec();
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
