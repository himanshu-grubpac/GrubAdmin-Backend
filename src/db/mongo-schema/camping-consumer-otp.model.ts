import { type Document, model, Schema } from "mongoose";

export type CampingConsumerOtpModel = Document & {
	email: string;
	otp: string;
	otp_id: string;
	for_what:
		| "login"
		| "forget_password"
		| "set_new_password"
		| "unlock_box"
		| "delete_account"
		| "register";
	metadata?: unknown;
	failed_attempts?: number;
	createdAt: Date;
	updatedAt: Date;
};

const campingConsumerOtpSchema = new Schema<CampingConsumerOtpModel>(
	{
		email: {
			type: String,
			required: true,
			trim: true,
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
			enum: [
				"login",
				"forget_password",
				"set_new_password",
				"unlock_box",
				"delete_account",
				"register",
			],
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

export const CampingConsumerOtp = model<CampingConsumerOtpModel>(
	"camping_consumer_otp",
	campingConsumerOtpSchema,
);
