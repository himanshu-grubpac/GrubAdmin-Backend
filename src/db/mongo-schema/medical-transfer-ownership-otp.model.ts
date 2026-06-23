import { type Date, type Document, model, Schema } from "mongoose";

export type MedicalTransferOwnershipOtpModel = Document & {
	user_id: string;
	otp: string;
	otp_id: string;
	transfer_mode: "selected" | "all" | "entire_account";
	ids?: string[];
	name: string;
	organization_name: string;
	country_code: string;
	phone: string;
	email: string;
	country: string;
	state: string;
	createdAt: Date;
};

const medicalTransferOwnershipOtpSchema = new Schema<MedicalTransferOwnershipOtpModel>(
	{
		user_id: { type: String, required: true, trim: true },
		otp: { type: String, required: true, trim: true },
		otp_id: { type: String, required: true, trim: true },
		transfer_mode: {
			type: String,
			enum: ["selected", "all", "entire_account"],
			required: true,
		},
		ids: { type: [String], default: [] },
		name: { type: String, required: true },
		organization_name: { type: String, required: true },
		country_code: { type: String, required: true },
		phone: { type: String, required: true },
		email: { type: String, required: true },
		country: { type: String, required: true },
		state: { type: String, required: true },
		createdAt: { type: Date, default: Date.now, expires: 60 * 10 },
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

medicalTransferOwnershipOtpSchema.index({ user_id: 1, otp_id: 1 }, { unique: true });

export const MedicalTransferOwnershipOtp = model<MedicalTransferOwnershipOtpModel>(
	"medical_transfer_ownership_otp",
	medicalTransferOwnershipOtpSchema,
);
