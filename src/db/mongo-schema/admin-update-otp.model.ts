import mongoose, { type Date, type Document, model } from "mongoose";

export type AdminUpdateOtpModel = Document & {
	email: string;
	otp: string;
	user_id: string;
	mobile_number?: string;
	country_code?: string;
	createdAt: Date;
	updatedAt: Date;
};

export const adminUpdateOtpSchema = new mongoose.Schema<AdminUpdateOtpModel>(
	{
		email: {
			type: String,
			trim: true,
		},
		otp: {
			type: String,
			required: true,
			trim: true,
		},
		user_id: {
			type: String,
			required: true,
			trim: true,
			unique: true,
		},
		mobile_number: {
			type: String,
			trim: true,
		},
		country_code: {
			type: String,
			trim: true,
		},
		createdAt: {
			type: Date,
			default: Date.now,
			expires: 60 * 5, // 5 minutes
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

export const AdminUpdateOtp = model<AdminUpdateOtpModel>(
	"admin_update_otp",
	adminUpdateOtpSchema,
);
