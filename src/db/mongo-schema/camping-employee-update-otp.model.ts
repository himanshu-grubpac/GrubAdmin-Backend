import { type Document, model, Schema } from "mongoose";

export type CampingEmployeeUpdateOtpModel = Document & {
	email: string;
	otp: string;
	otp_id: string;
	for_what: "update_profile";
	metadata?: any;
	failed_attempts?: number;
	createdAt: Date;
	updatedAt: Date;
	new_values: Record<string, any>;
};

const campingEmployeeUpdateOtpSchema = new Schema<CampingEmployeeUpdateOtpModel>(
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
			enum: ["update_profile"],
			required: true,
			default: "update_profile",
		},
		metadata: {
			type: Schema.Types.Mixed,
			default: null,
		},
		failed_attempts: {
			type: Number,
			default: 0,
		},
		new_values: {
			type: Schema.Types.Mixed,
			default: {},
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

export const CampingEmployeeUpdateOtp = model<CampingEmployeeUpdateOtpModel>(
	"camping_employee_update_otp",
	campingEmployeeUpdateOtpSchema,
);
