import { type Document, model, Schema } from "mongoose";

export type CampingAlertPreferenceModel = Document & {
	client_id: string;
	box_id: string;
	camera_alerts: boolean;
	battery_alerts: boolean;
	lock_alerts: boolean;
	display_alerts: boolean;
	other_alerts: boolean;
	theme: "light" | "dark";
	createdAt: Date;
	updatedAt: Date;
};

const campingAlertPreferenceSchema = new Schema<CampingAlertPreferenceModel>(
	{
		client_id: {
			type: String,
			required: true,
		},
		box_id: {
			type: String,
			required: true,
		},
		camera_alerts: {
			type: Boolean,
			default: true,
		},
		battery_alerts: {
			type: Boolean,
			default: true,
		},
		lock_alerts: {
			type: Boolean,
			default: true,
		},
		display_alerts: {
			type: Boolean,
			default: true,
		},
		other_alerts: {
			type: Boolean,
			default: true,
		},
		theme: {
			type: String,
			enum: ["light", "dark"],
			default: "light",
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

export const CampingAlertPreference = model<CampingAlertPreferenceModel>(
	"camping_alert_preference",
	campingAlertPreferenceSchema,
);
