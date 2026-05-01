import type { MessageTemplateMap } from "@/configs/template-types";

export const adminMessageTemplates: MessageTemplateMap = {
	auth: {
		login: {
			SUCCESS: {
				message: "Admin successfully logged in!",
				code: 200,
				message_toast_title: "Welcome Administrator",
				message_toast_description: "You have verified your credentials and accessed the admin portal.",
			},
		},
	},
	account: {
		UPDATE_SUCCESS: {
			message: "Admin account updated successfully!",
			code: 200,
			message_toast_title: "Profile Updated",
			message_toast_description: "Your administrative account details have been securely updated.",
		},
	},
};
