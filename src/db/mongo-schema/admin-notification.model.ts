import { Document, model, Schema } from "mongoose";
import type {
	AdminNotificationGoal,
	AdminNotificationStatus,
	AdminNotificationType,
} from "@/types/common";
import {
	NOTIFICATION_GOAL,
	NOTIFICATIONS_STATUS,
	NOTIFICATIONS_TYPE,
} from "@/configs/constants.ts";

export interface AdminNotificationModel extends Document {
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
	recipient_id: string;
}

const adminNotificationSchema: Schema<AdminNotificationModel> =
	new Schema<AdminNotificationModel>(
		{
			title: {
				type: String,
				required: true,
				trim: true,
				index: true,
			},
			description: {
				type: String,
				required: true,
				trim: true,
				index: true,
			},
			recipient_id: {
				type: String,
				required: true,
				trim: true,
				index: true,
			},
			goal: {
				type: String,
				required: true,
				trim: true,
				enum: NOTIFICATION_GOAL,
			},
			type: {
				type: String,
				required: true,
				enum: NOTIFICATIONS_TYPE,
				trim: true,
			},
			status: {
				type: String,
				required: true,
				enum: NOTIFICATIONS_STATUS,
				trim: true,
			},
			employee_id: {
				type: String,
				trim: true,
			},
			employee_name: {
				type: String,
				trim: true,
			},
			item_id: {
				type: String,
				trim: true,
			},
			item_name: {
				type: String,
				trim: true,
			},
			item_type: {
				type: String,
				trim: true,
			},
			role_id: {
				type: String,
				trim: true,
			},
		},
		{
			timestamps: true,
			toJSON: {
				transform: (_, returningDoc) => {
					returningDoc["id"] = returningDoc["_id"];
					// @ts-ignore
					delete returningDoc["_id"];
				},
			},
		},
	);

export const AdminNotification = model<AdminNotificationModel>(
	"admin_notification",
	adminNotificationSchema,
);
