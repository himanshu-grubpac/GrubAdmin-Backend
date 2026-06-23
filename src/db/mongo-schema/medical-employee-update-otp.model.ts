import { type Date, type Document, model, Schema } from "mongoose";
import type { MedicalEmployeeRoleType } from "@/types/common";
import { EMPLOYEE_CLIENT_ROLE } from "@/configs/constants.ts";

export type MedicalEmployeeUpdateOtpModel = Document & {
	role: MedicalEmployeeRoleType;
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

const medicalEmployeeUpdateOtpSchema = new Schema<MedicalEmployeeUpdateOtpModel>(
	{
		email: { type: String, trim: true, default: null },
		mobile_number: { type: String, trim: true, default: null },
		country_code: { type: String, trim: true, default: null },
		first_name: { type: String, trim: true, default: null },
		last_name: { type: String, trim: true, default: null },
		organization_name: { type: String, trim: true, default: null },
		role: { type: String, enum: EMPLOYEE_CLIENT_ROLE, required: true, trim: true },
		otp: { type: String, required: true, trim: true },
		otp_id: { type: String, required: true, trim: true },
		createdAt: { type: Date, default: Date.now, expires: 60 * 5 },
		user_id: { type: String, required: true, trim: true },
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

medicalEmployeeUpdateOtpSchema.index({ user_id: 1, role: 1, otp_id: 1 }, { unique: true });

export const MedicalEmployeeUpdateOtp = model<MedicalEmployeeUpdateOtpModel>(
	"medical_employee_update_otp",
	medicalEmployeeUpdateOtpSchema,
);
