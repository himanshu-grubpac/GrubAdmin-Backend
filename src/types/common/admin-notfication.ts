import {
	NOTIFICATION_GOAL,
	NOTIFICATIONS_STATUS,
	NOTIFICATIONS_TYPE,
} from "@/configs/constants.ts";

export type AdminNotificationStatus = (typeof NOTIFICATIONS_STATUS)[number];
export type AdminNotificationType = (typeof NOTIFICATIONS_TYPE)[number];
export type AdminNotificationGoal = (typeof NOTIFICATION_GOAL)[number];
