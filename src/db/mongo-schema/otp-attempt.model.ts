import { model, Schema, type Document } from "mongoose";
export type OtpAttemptModel = Document & {
	email: string;
	ip_address: string;
	attempts: number;
	last_attempt: Date;
	is_locked: boolean;
	lock_until: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

const otpAttemptSchema = new Schema<OtpAttemptModel>(
	{
		email: {
			type: String,
			required: true,
			trim: true,
			lowercase: true,
		},
		ip_address: {
			type: String,
			required: true,
			trim: true,
		},
		attempts: {
			type: Number,
			default: 0,
			min: 0,
		},
		last_attempt: {
			type: Date,
			default: Date.now,
		},
		is_locked: {
			type: Boolean,
			default: false,
		},
		lock_until: {
			type: Date,
			default: null,
		},
	},
	{
		timestamps: true,
		expires: 24 * 60 * 60, 
	},
);

export const OtpAttempt = model<OtpAttemptModel>("OtpAttempt", otpAttemptSchema);