import { type Document, model, Schema } from "mongoose";
import type { LogAction, LogModule } from "@/types/common/log.ts";
import { LOG_ACTIONS, LOG_MODULES } from "@/configs/constants.ts";

export type AdminLogModel = Document & {
	module: LogModule;
	action: LogAction;
	admin_name: string;
	admin_id: string;
	effected_name?: string;
	effected_id?: string;
	role_name: string | null;
	role_id: string | null;
	ip?: string;
};

const adminLogSchema = new Schema<AdminLogModel>(
	{
		module: {
			type: String,
			enum: LOG_MODULES,
			required: true,
			trim: true,
		},
		action: {
			type: String,
			enum: LOG_ACTIONS,
			required: true,
			trim: true,
		},
		admin_name: {
			type: String,
			trim: true,
			required: true,
		},
		admin_id: {
			type: String,
			required: true,
			trim: true,
		},
		role_name: {
			type: String,
			trim: true,
			default: null,
		},
		role_id: {
			type: String,
			trim: true,
			default: null,
		},
		ip: {
			type: String,
			trim: true,
		},
		effected_name: {
			type: String,
			trim: true,
			default: null,
			required: false,
		},
		effected_id: {
			type: String,
			trim: true,
			default: null,
			required: false,
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

export const AdminLog = model<AdminLogModel>("admin_log", adminLogSchema);
