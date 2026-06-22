import type { MessageTemplateMap } from "@/configs/template-types";

export const medicalMessageTemplates: MessageTemplateMap = {
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
	department: {
		create: {
			SUCCESS: {
				message: "{name} created successfully!",
				code: 201,
				message_toast_title: "Department Added",
				message_toast_description: "You can now assign GrubPacs to this department to get started.",
				message_toast_btn_title: "View GrubPacs",
				message_toast_btn_action: "/medical/box/list?department_id={id}",
			},
		},
		update: {
			SUCCESS: {
				message: "Department profile updated successfully!",
				code: 200,
				message_toast_title: "Update Saved",
				message_toast_description: "All changes to the department profile have been saved successfully.",
			},
		},
		transfer: {
			SUCCESS: {
				message: "GrubPacs transferred successfully.",
				code: 200,
				message_toast_title: "GrubPacs transferred successfully.",
				message_toast_description: "The new owner now has access and control.",
				message_toast_btn_title: "View details",
				message_toast_btn_action: "/medical/department/details?id={id}",
			},
			BULK_SUCCESS: {
				message: "All GrubPacs successfully transferred.",
				code: 200,
				message_toast_title: "All GrubPacs successfully transferred.",
				message_toast_description: "You can still manage your account, but no longer own any boxes.",
				message_toast_btn_title: "View details",
				message_toast_btn_action: "/medical/department/list",
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
				message_toast_btn_title: "Edit Details",
				message_toast_btn_action: "/medical/employee/details?id={id}",
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
