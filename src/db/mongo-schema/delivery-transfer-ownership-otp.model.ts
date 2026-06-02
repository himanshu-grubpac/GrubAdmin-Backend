import { type Date, type Document, model, Schema } from "mongoose";

export type DeliveryTransferOwnershipOtpModel = Document & {
	user_id: string; // current owner id
	otp: string;
	otp_id: string;
	transfer_mode: "selected" | "all";
	ids?: string[]; // if mode is selected, these are the box ids
	name: string;
	organization_name: string;
	country_code: string;
	phone: string;
	email: string;
	country: string;
	state: string;
	createdAt: Date;
};

const deliveryTransferOwnershipOtpSchema = new Schema<DeliveryTransferOwnershipOtpModel>(
	{
		user_id: {
			type: String,
			required: true,
			trim: true,
		},
		otp: {
			type: String,
			required: true,
			trim: true,
		},
		otp_id: {
			type: String,
			required: true,
			trim: true,
		},
		transfer_mode: {
			type: String,
			enum: ["selected", "all"],
			required: true,
		},
		ids: {
			type: [String],
			default: [],
		},
		name: { type: String, required: true },
		organization_name: { type: String, required: true },
		country_code: { type: String, required: true },
		phone: { type: String, required: true },
		email: { type: String, required: true },
		country: { type: String, required: true },
		state: { type: String, required: true },
		createdAt: {
			type: Date,
			default: Date.now,
			expires: 60 * 10, // 10 minutes for transfer ownership
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

deliveryTransferOwnershipOtpSchema.index(
	{
		user_id: 1,
		otp_id: 1,
	},
	{
		unique: true,
	},
);

export const DeliveryTransferOwnershipOtp = model<DeliveryTransferOwnershipOtpModel>(
	"delivery_transfer_ownership_otp",
	deliveryTransferOwnershipOtpSchema,
);
