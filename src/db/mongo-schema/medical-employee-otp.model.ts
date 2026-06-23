import { type Document, model, Schema } from "mongoose";
import type { MedicalEmployeeRoleType } from "@/types/common";
import { EMPLOYEE_CLIENT_ROLE } from "@/configs/constants.ts";

export type MedicalEmployeeOtpModel = Document & {
	email: string;
	role: MedicalEmployeeRoleType;
	otp: string;
	otp_id: string;
	for_what: "login" | "forget_password" | "set_new_password" | "unlock_box";
	metadata?: any;
	failed_attempts?: number;
	createdAt: Date;
	updatedAt: Date;
};

const medicalEmployeeOtpSchema = new Schema<MedicalEmployeeOtpModel>(
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
			enum: ["login", "forget_password", "set_new_password", "unlock_box"],
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

export const MedicalEmployeeOtp = model<MedicalEmployeeOtpModel>(
	"medical_employee_otp",
	medicalEmployeeOtpSchema,
);
