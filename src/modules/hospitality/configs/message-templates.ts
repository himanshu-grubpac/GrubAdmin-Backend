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
		transfer: {
			SUCCESS: {
				message: "GrubPacs transferred successfully.",
				code: 200,
				message_toast_title: "GrubPacs transferred successfully.",
				message_toast_description: "The new owner now has access and control.",
				message_toast_btn_title: "View details",
				message_toast_btn_action: "/hospitality/floor/list",
			},
			BULK_SUCCESS: {
				message: "All GrubPacs successfully transferred.",
				code: 200,
				message_toast_title: "All GrubPacs successfully transferred.",
				message_toast_description: "You can still manage your account, but no longer own any boxes.",
				message_toast_btn_title: "View details",
				message_toast_btn_action: "/hospitality/floor/list",
			},
		},
	},
};
