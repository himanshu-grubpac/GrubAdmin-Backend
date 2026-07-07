import type { MessageTemplateMap } from "@/configs/template-types";

export const campingMessageTemplates: MessageTemplateMap = {
	auth: {
		LOGIN_SUCCESS: {
			message: "Login successful!",
			code: 200,
			message_toast_title: "Welcome Back",
			message_toast_description: "You have been logged in successfully.",
		},
		PASSWORD_SET_SUCCESS: {
			message: "Password set successfully!",
			code: 200,
			message_toast_title: "Password Set",
			message_toast_description: "Your password has been set successfully.",
		},
		LOGOUT_SUCCESS: {
			message: "Logged out successfully!",
			code: 200,
			message_toast_title: "Logged Out",
			message_toast_description: "You have been logged out successfully.",
		},
	},
	account: {
		UPDATE_SUCCESS: {
			message: "Profile updated successfully!",
			code: 200,
			message_toast_title: "Profile Updated",
			message_toast_description: "Your profile has been updated successfully.",
		},
		DELETE_SUCCESS: {
			message: "Account deleted successfully!",
			code: 200,
			message_toast_title: "Account Deleted",
			message_toast_description: "Your account has been deleted successfully.",
		},
	},
};
