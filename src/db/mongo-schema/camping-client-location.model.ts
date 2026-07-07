import { type Document, model, Schema } from "mongoose";

export type CampingClientLocationModel = Document & {
	client_id: string;
	latitude: number;
	longitude: number;
	address: string;
	createdAt: Date;
	updatedAt: Date;
};

const campingClientLocationSchema = new Schema<CampingClientLocationModel>(
	{
		client_id: {
			type: String,
			required: true,
			unique: true,
		},
		latitude: {
			type: Number,
			required: true,
		},
		longitude: {
			type: Number,
			required: true,
		},
		address: {
			type: String,
			default: "",
		},
		createdAt: {
			type: Date,
			default: Date.now,
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

export const CampingClientLocation = model<CampingClientLocationModel>(
	"camping_client_location",
	campingClientLocationSchema,
);
