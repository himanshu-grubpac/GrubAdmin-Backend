import type { MessageTemplateMap } from "@/configs/template-types";

export const hospitalityMessageTemplates: MessageTemplateMap = {
	floor: {
		create: {
			SUCCESS: {
				message: "{name} created successfully!",
				code: 201,
				message_toast_title: "Floor Added",
				message_toast_description: "The floor was successfully added.",
			},
		},
		update: {
			SUCCESS: {
				message: "Floor profile updated successfully!",
				code: 200,
				message_toast_title: "Update Saved",
				message_toast_description: "All changes to the floor have been saved successfully.",
			},
		},
	},
};
