import { type Document, model, Schema } from "mongoose";

export interface SystemLogModel extends Document {
	category: string;
	type: string;
	description: string;
	actor: {
		id: string;
		name: string;
		role?: string;
		table?: string;
		ip?: string;
	};
	client_id?: string;
	vertical_id?: string;
	subject?: {
		id?: string;
		name?: string;
		type?: string;
	};
	metadata?: Record<string, any>;
	createdAt: Date;
	updatedAt: Date;
}

const systemLogSchema = new Schema<SystemLogModel>(
	{
		category: {
			type: String,
			required: true,
			trim: true,
			index: true,
		},
		type: {
			type: String,
			required: true,
			trim: true,
			index: true,
		},
		description: {
			type: String,
			required: true,
			trim: true,
		},
		actor: {
			id: { type: String, required: true },
			name: { type: String, required: true },
			role: { type: String },
			table: { type: String },
			ip: { type: String },
		},
		client_id: { type: String, index: true },
		vertical_id: { type: String, index: true },
		subject: {
			id: { type: String },
			name: { type: String },
			type: { type: String },
		},
		metadata: {
			type: Schema.Types.Mixed,
		},
	},
	{
		timestamps: true,
		toJSON: {
			transform: (_, returningDoc) => {
				returningDoc["id"] = returningDoc["_id"];
				// @ts-ignore
				delete returningDoc["_id"];
				// @ts-ignore
				delete returningDoc["__v"];
			},
		},
	},
);

// Indexes for common queries
systemLogSchema.index({ category: 1, type: 1 });
systemLogSchema.index({ "actor.id": 1 });
systemLogSchema.index({ "subject.id": 1, client_id: 1 });
systemLogSchema.index({ createdAt: -1 });

export const ClientAdminLog = model<SystemLogModel>("client_admin_log", systemLogSchema, "admin_logs");
export const DeliveryEmployeeLog = model<SystemLogModel>("delivery_employee_log", systemLogSchema, "delivery_employee_logs");
export const RestaurantLog = model<SystemLogModel>("restaurant_log", systemLogSchema, "restaurant_logs");
export const GrubpacLog = model<SystemLogModel>("grubpac_log", systemLogSchema, "grubpac_logs");
export const DepartmentLog = model<SystemLogModel>("department_log", systemLogSchema, "department_logs");
