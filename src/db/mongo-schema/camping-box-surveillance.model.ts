import { type Document, model, Schema } from "mongoose";

export type CampingBoxSurveillanceModel = Document & {
	box_id: string;
	surveillance_enabled: boolean;
	createdAt: Date;
	updatedAt: Date;
};

const campingBoxSurveillanceSchema = new Schema<CampingBoxSurveillanceModel>(
	{
		box_id: {
			type: String,
			required: true,
			unique: true,
		},
		surveillance_enabled: {
			type: Boolean,
			default: false,
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

export const CampingBoxSurveillance = model<CampingBoxSurveillanceModel>(
	"camping_box_surveillance",
	campingBoxSurveillanceSchema,
);
