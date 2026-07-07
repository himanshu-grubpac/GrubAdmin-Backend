import { type Document, model, Schema } from "mongoose";
import type { CampingEmployeeRoleType } from "@/types/common";
import { CAMPING_EMPLOYEE_ROLES } from "@/configs/constants.ts";

export type CampingEmployeeOtpModel = Document & {
	email: string;
	role: CampingEmployeeRoleType;
	otp: string;
	otp_id: string;
	for_what: "login" | "forget_password" | "set_new_password";
	metadata?: any;
	failed_attempts?: number;
	createdAt: Date;
	updatedAt: Date;
};

const campingEmployeeOtpSchema = new Schema<CampingEmployeeOtpModel>(
	{
		email: {
			type: String,
			required: true,
			trim: true,
		},
		role: {
			type: String,
			enum: CAMPING_EMPLOYEE_ROLES,
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
			enum: ["login", "forget_password", "set_new_password"],
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
				returningDoc.id = returningDoc._id;
				delete (returningDoc as any)._id;
			},
		},
	},
);

export const CampingEmployeeOtp = model<CampingEmployeeOtpModel>(
	"camping_employee_otp",
	campingEmployeeOtpSchema,
);
