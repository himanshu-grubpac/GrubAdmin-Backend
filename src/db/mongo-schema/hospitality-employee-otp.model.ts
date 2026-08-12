import { type Document, model, Schema } from "mongoose";
import type { HospitalityEmployeeRoleType } from "@/types/common";
import { EMPLOYEE_CLIENT_ROLE } from "@/configs/constants.ts";

export type HospitalityEmployeeOtpModel = Document & {
	email: string;
	role: HospitalityEmployeeRoleType;
	otp: string;
	otp_id: string;
	for_what: "login" | "forget_password" | "set_new_password" | "delete_account";
	metadata?: unknown;
	failed_attempts?: number;
	createdAt: Date;
	updatedAt: Date;
};

const hospitalityEmployeeOtpSchema = new Schema<HospitalityEmployeeOtpModel>(
	{
		email: {
			type: String,
			required: true,
			trim: true,
		},
		role: {
			type: String,
			enum: EMPLOYEE_CLIENT_ROLE,
			required: true,
		},
		otp: {
			type: String,
			required: true,
		},
		otp_id: {
			type: String,
			required: true,
		},
		for_what: {
			type: String,
			enum: ["login", "forget_password", "set_new_password", "delete_account"],
			required: true,
			default: "login",
		},
		metadata: {
			type: Schema.Types.Mixed,
			default: null,
		},
		failed_attempts: {
			type: Number,
			default: 0,
		},
		createdAt: {
			type: Date,
			default: Date.now,
			expires: 60 * 5,
		},
	},
	{
		timestamps: true,
		toJSON: {
			transform: (_, returningDoc) => {
				const doc = returningDoc as Record<string, unknown>;
				doc["id"] = doc["_id"];
				delete doc["_id"];
			},
		},
	},
);

export const HospitalityEmployeeOtp = model<HospitalityEmployeeOtpModel>(
	"hospitality_employee_otp",
	hospitalityEmployeeOtpSchema,
);
