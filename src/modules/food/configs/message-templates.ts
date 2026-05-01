import type { MessageTemplateMap } from "@/configs/template-types";

export const foodMessageTemplates: MessageTemplateMap = {
	auth: {
		login: {
			SUCCESS: {
				message: "Successfully logged in!",
				code: 200,
				message_toast_title: "Welcome Back",
				message_toast_description: "You have successfully logged in to the portal.",
			},
			OTP_SENT: {
				message: "OTP sent successfully to your registered email.",
				code: 200,
				message_toast_title: "Code Sent",
				message_toast_description: "A 6-digit verification code has been sent to your email. Please check your inbox.",
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
				message_toast_description: "Your identify has been confirmed. You can now proceed to the next step.",
			},
		},
	},
	restaurant: {
		create: {
			SUCCESS: {
				message: "{name} created successfully!",
				code: 201,
				message_toast_title: "Restaurant Added",
				message_toast_description: "You can now assign GrubPacs to this restaurant to get started.",
				message_toast_btn_title: "View GrubPacs",
				message_toast_btn_action: "/food/box/list?restaurant_id={id}",
			},
		},
		update: {
			SUCCESS: {
				message: "Restaurant profile updated successfully!",
				code: 200,
				message_toast_title: "Update Saved",
				message_toast_description: "All changes to the restaurant profile have been saved successfully.",
			},
		},
		transfer: {
			SUCCESS: {
				message: "GrubPacs transferred successfully.",
				code: 200,
				message_toast_title: "GrubPacs transferred successfully.",
				message_toast_description: "The new owner now has access and control.",
				message_toast_btn_title: "View details",
				message_toast_btn_action: "/food/restaurant/details?id={id}",
			},
			BULK_SUCCESS: {
				message: "All GrubPacs successfully transferred.",
				code: 200,
				message_toast_title: "All GrubPacs successfully transferred.",
				message_toast_description: "You can still manage your account, but no longer own any boxes.",
				message_toast_btn_title: "View details",
				message_toast_btn_action: "/food/restaurant/list",
			},
		},
	},
	box: {
		suspend: {
			message: "GrubPac box suspended successfully!",
			code: 200,
			message_toast_title: "Box Suspended",
			message_toast_description: "The selected GrubPac boxes have been successfully suspended.",
		},
		reactivate: {
			message: "GrubPac box reactivated successfully!",
			code: 200,
			message_toast_title: "Box Active",
			message_toast_description: "The selected GrubPac boxes are now active and ready for use.",
		},
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
				message_toast_btn_action: "/food/box/list",
			},
		},
		SECURED: {
			message: "Box secured!",
			code: 200,
			message_toast_title: "Box secured!",
			message_toast_description: "An OTP will be sent to {mobile} when the delivery person taps 'Unlock' in their app.",
			message_toast_btn_title: "View details",
			message_toast_btn_action: "/food/box/details?id={id}",
		},
		unlock: {
			REQUEST_SENT: {
				message: "Unlock Request Sent!",
				code: 200,
				message_toast_title: "Unlock Request Sent!",
				message_toast_description: "Your emergency unlock request has been sent to the box. Please check the box physically to confirm.",
			},
			BULK_REQUEST_SENT: {
				message: "Unlock Request Sent!",
				code: 200,
				message_toast_title: "Unlock Request Sent!",
				message_toast_description: "Your emergency unlock request has been sent to the selected box. Please check the boxes to confirm.",
				message_toast_btn_title: "View details",
				message_toast_btn_action: "/food/box/list",
			},
		},
	},
	employee: {
		create: {
			SUCCESS: {
				message: "Employee added successfully!",
				code: 201,
				message_toast_title: "Employee Added",
				message_toast_description: "New employee record has been created successfully.",
				message_toast_btn_title: "Edit Roles",
				message_toast_btn_action: "/food/employee/details?id={id}",
			},
		},
		profile: {
			UPDATE_SUCCESS: {
				message: "Profile updated!",
				code: 200,
				message_toast_title: "Profile updated!",
				message_toast_description: "Your profile information has been updated successfully.",
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
