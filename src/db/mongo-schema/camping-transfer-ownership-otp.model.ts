import { type Document, model, Schema } from "mongoose";

export type CampingTransferOwnershipOtpModel = Document & {
	client_id: string;
	otp: string;
	otp_id: string;
	for_what: "transfer_ownership" | "transfer_entire_account";
	metadata?: any;
	failed_attempts?: number;
	createdAt: Date;
	updatedAt: Date;
};

const campingTransferOwnershipOtpSchema = new Schema<CampingTransferOwnershipOtpModel>(
	{
		client_id: {
			type: String,
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
			enum: ["transfer_ownership", "transfer_entire_account"],
			required: true,
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

export const CampingTransferOwnershipOtp = model<CampingTransferOwnershipOtpModel>(
	"camping_transfer_ownership_otp",
	campingTransferOwnershipOtpSchema,
);
