import { type Date, type Document, model, Schema } from "mongoose";
import type { VerticalDeliveryEmployeeRoleType } from "@/types/common";
import { EMPLOYEE_CLIENT_ROLE } from "@/configs/constants.ts";

export type DeliveryEmployeeUpdateOtpModel = Document & {
	role: VerticalDeliveryEmployeeRoleType;
	email?: string;
	mobile_number?: string;
	country_code?: string;
	first_name?: string;
	last_name?: string;
	organization_name?: string;
	otp: string;
	otp_id: string;
	user_id: string;
	createdAt: Date;
};

const deliveryEmployeeUpdateOtpSchema = new Schema<DeliveryEmployeeUpdateOtpModel>(
	{
		email: {
			type: String,
			trim: true,
			default: null,
		},
		mobile_number: {
			type: String,
			trim: true,
			default: null,
		},
		country_code: {
			type: String,
			trim: true,
			default: null,
		},
		first_name: {
			type: String,
			trim: true,
			default: null,
		},
		last_name: {
			type: String,
			trim: true,
			default: null,
		},
		organization_name: {
			type: String,
			trim: true,
			default: null,
		},
		role: {
			type: String,
			enum: EMPLOYEE_CLIENT_ROLE,
			required: true,
			trim: true,
		},
		otp: {
			type: String,
			required: true,
			trim: true,
		},
		otp_id: {
			type: String,
			required: true,
			trim: true,
		},
		createdAt: {
			type: Date,
			default: Date.now,
			expires: 60 * 5, // 5 minutes
		},
		user_id: {
			type: String,
			required: true,
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

deliveryEmployeeUpdateOtpSchema.index(
	{
		user_id: 1,
		role: 1,
		otp_id: 1,
	},
	{
		unique: true,
	},
);

export const DeliveryEmployeeUpdateOtp = model<DeliveryEmployeeUpdateOtpModel>(
	"delivery_employee_update_otp",
	deliveryEmployeeUpdateOtpSchema,
);

