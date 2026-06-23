import type { MessageTemplateMap } from "@/configs/template-types";

export const hospitalityMessageTemplates: MessageTemplateMap = {
	auth: {
		login: {
			SUCCESS: {
				message: "Successfully logged in!",
				code: 200,
				message_toast_title: "Welcome Back",
				message_toast_description: "You have successfully logged in to the hospitality portal.",
			},
			OTP_SENT: {
				message: "OTP sent successfully to your registered email.",
				code: 200,
				message_toast_title: "Code Sent",
				message_toast_description: "A verification code has been sent to your email. Please check your inbox.",
			},
			PASSWORD_RESET_SUCCESS: {
				message: "Password updated successfully!",
				code: 200,
				message_toast_title: "Security Updated",
				message_toast_description: "Your password has been changed successfully. You can now use it to login.",
			},
			PASSWORD_SET_SUCCESS: {
				message: "Password set successfully!",
				code: 200,
				message_toast_title: "Password set successfully!",
				message_toast_description: "Your account password has been established successfully.",
			},
			OTP_VERIFIED: {
				message: "OTP verified successfully!",
				code: 200,
				message_toast_title: "Verification Successful",
				message_toast_description: "Your identity has been confirmed. You can now proceed to the next step.",
			},
		},
	},
	box: {
		settings: {
			SUCCESS: {
				message: "Settings applied successfully!",
				code: 200,
				message_toast_title: "Settings applied successfully!",
				message_toast_description: "Changes will reflect shortly.",
			},
			BULK_SUCCESS: {
				message: "Settings applied successfully!",
				code: 200,
				message_toast_title: "Settings applied successfully!",
				message_toast_description: "Changes in the selected boxes will reflect shortly.",
				message_toast_btn_title: "View details",
				message_toast_btn_action: "/hospitality/box/list",
			},
		},
	},
	common: {
		FETCH_SUCCESS: {
			message: "Details fetched successfully!",
			code: 200,
			message_toast_title: "Data Loaded",
			message_toast_description: "The requested information has been successfully retrieved.",
		},
		CREATE_SUCCESS: {
			message: "Record created successfully!",
			code: 201,
			message_toast_title: "Creation Successful",
			message_toast_description: "The new record has been successfully created in the system.",
		},
		UPDATE_SUCCESS: {
			message: "Details updated successfully!",
			code: 200,
			message_toast_title: "Update Successful",
			message_toast_description: "All changes have been successfully saved to the system.",
		},
		DELETE_SUCCESS: {
			message: "Records deleted successfully!",
			code: 200,
			message_toast_title: "Deletion Done",
			message_toast_description: "The selected records have been permanently removed from the system.",
		},
	},
};
