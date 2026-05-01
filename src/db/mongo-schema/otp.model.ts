import { model, Schema, type Date, type Document } from "mongoose";

export type OtpModel = Document & {
	email: string;
	role: "admin" | "employee" | "client" | "super_admin" | "manager" | "delivery";
	otp: string;
	otp_id: string;
	for_what: "login" | "forget_password" | "set_new_password" | "account_update";
	is_password_reset?: boolean;
	createdAt: Date;
	updatedAt: Date;
};

const otpSchema = new Schema<OtpModel>(
	{
		email: {
			type: String,
			required: true,
			trim: true,
		},
		otp_id: {
			type: String,
			required: true,
		},
		role: {
			type: String,
			enum: ["admin", "employee", "client", "super_admin", "manager", "delivery"],
			required: true,
		},
		otp: {
			type: String,
			required: true,
		},
		for_what: {
			type: String,
			enum: ["login", "forget_password", "set_new_password", "account_update"],
			required: true,
			default: "login",
		},
		is_password_reset: {
			type: Boolean,
			default: false,
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

export const Otp = model<OtpModel>("otp", otpSchema);
