import { type Document, model, Schema } from "mongoose";

export type MedicalLocationShareModel = Document & {
	token: string;
	box_id: string;
	client_id: string;
	created_by_employee_id?: string | null;
	expires_at: Date;
	createdAt: Date;
	updatedAt: Date;
};

const medicalLocationShareSchema = new Schema<MedicalLocationShareModel>(
	{
		token: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		box_id: {
			type: String,
			required: true,
			index: true,
		},
		client_id: {
			type: String,
			required: true,
			index: true,
		},
		created_by_employee_id: {
			type: String,
			default: null,
		},
		expires_at: {
			type: Date,
			required: true,
		},
	},
	{
		timestamps: true,
	},
);

medicalLocationShareSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const MedicalLocationShare = model<MedicalLocationShareModel>(
	"medical_location_share",
	medicalLocationShareSchema,
);
