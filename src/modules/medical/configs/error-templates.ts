import type { ErrorTemplateMap } from "@/configs/template-types";

export const medicalErrorTemplates: ErrorTemplateMap = {
	auth: {
		login: {
			ACCOUNT_NOT_FOUND: {
				message: "No employee can be found!",
				code: 400,
				error_toast_title: "Account not found",
				error_toast_description: "We couldn't find your details. Please contact your department admin.",
			},
			UNAUTHORIZED: {
				message: "You are not authorized to login.",
				code: 403,
				error_toast_title: "Access Denied",
				error_toast_description: "Your role does not have permission to access this portal. If you believe this is an error, please contact your manager.",
			},
			SUSPENDED: {
				message: "Your account has been suspended!",
				code: 403,
				error_toast_title: "Account Suspended",
				error_toast_description: "Your access has been temporarily revoked. Please contact support or your organization administrator for more details.",
			},
			PASSWORD_NOT_SET: {
				message: "Please login using OTP and set a password first.",
				code: 400,
				error_toast_title: "Setup Required",
				error_toast_description: "You haven't set a password yet. Please use the 'Login with OTP' option to access your account for the first time.",
				error_toast_btn_title: "Login with OTP",
				error_toast_btn_action: "/medical/auth/otp-login",
			},
			INVALID_CREDENTIALS: {
				message: "Invalid login credentials.",
				code: 401,
				error_toast_title: "Login Failed",
				error_toast_description: "The password you entered is incorrect. Please try again or reset your password.",
				error_toast_btn_title: "Reset Password",
				error_toast_btn_action: "/medical/auth/forgot-password",
			},
			PASSWORD_INVALID: {
				message: "The current password you entered is incorrect.",
				code: 400,
				error_toast_title: "Verification Failed",
				error_toast_description: "The current password does not match our records. Please try again.",
			},
			OTP_EXPIRED: {
				message: "The OTP has expired. Please request a new one.",
				code: 400,
				error_toast_title: "OTP Expired",
				error_toast_description: "The verification code you entered is no longer valid. Please click 'Resend OTP' to get a new code.",
			},
			OTP_INVALID: {
				message: "The OTP you entered is incorrect.",
				code: 400,
				error_toast_title: "Invalid OTP",
				error_toast_description: "Please try again.",
			},
			OTP_SAVE_FAILED: {
				message: "Failed to save OTP",
				code: 500,
				error_toast_title: "System Busy",
				error_toast_description: "We are having trouble processing your request right now. Please try again in a few minutes.",
			},
			ACCOUNT_INACTIVE: {
				message: "Your account is not active, please contact support",
				code: 400,
				error_toast_title: "Account Restricted",
				error_toast_description: "Your account status prevents login at this time. Please reach out to your administrator for assistance.",
			},
			MAGIC_LINK_SAVE_FAILED: {
				message: "Failed to save reset token",
				code: 500,
				error_toast_title: "System Error",
				error_toast_description: "We couldn't generate your password reset link. Please contact support if this persists.",
			},
			EMAIL_NOT_FOUND: {
				message: "No email found for this account!",
				code: 400,
				error_toast_title: "Setup Required",
				error_toast_description: "This account does not have a primary email address configured. Please contact your organization administrator.",
			},
			AUTH_TOKEN_REQUIRED: {
				message: "Authentication token is required!",
				code: 401,
				error_toast_title: "Session Required",
				error_toast_description: "Your session has expired or is missing. Please log in again to continue.",
			},
			INVALID_AUTH_TOKEN: {
				message: "The auth token is invalid for this request!",
				code: 401,
				error_toast_title: "Security Warning",
				error_toast_description: "The provided security token is not valid for this operation.",
			},
		},
	},
	department: {
		NOT_FOUND: {
			message: "No department found!",
			code: 404,
			error_toast_title: "Department Not Found",
			error_toast_description: "The requested department could not be found in our database.",
		},
		ALREADY_SUSPENDED: {
			message: "All selected departments are already suspended.",
			code: 400,
			error_toast_title: "Redundant Action",
			error_toast_description: "The selected departments are already in a suspended state.",
		},
		ALREADY_ACTIVE: {
			message: "All selected departments are already active.",
			code: 400,
			error_toast_title: "Redundant Action",
			error_toast_description: "The selected departments are already active and operational.",
		},
		HAS_EMPLOYEES: {
			message: "Cannot delete department with active employees.",
			code: 400,
			error_toast_title: "Active Dependencies",
			error_toast_description: "This department still has employees assigned. Please reassign them before deletion.",
		},
		HAS_BOXES: {
			message: "Cannot delete department with assigned boxes.",
			code: 400,
			error_toast_title: "Active Dependencies",
			error_toast_description: "This department still has boxes assigned. Please unassign them before deletion.",
		},
	},
	employee: {
		NOT_FOUND: {
			message: "Employee not found!",
			code: 404,
			error_toast_title: "Missing Resource",
			error_toast_description: "The employee record you are looking for could not be found.",
		},
		ALREADY_IN_STATE: {
			message: "All selected employees are already in the requested state.",
			code: 409,
			error_toast_title: "No Change Required",
			error_toast_description: "One or more selected employees are already in the target state. No changes were applied.",
		},
	},
	box: {
		NOT_FOUND: {
			message: "No such box found!",
			code: 404,
			error_toast_title: "Box Not Found",
			error_toast_description: "The requested GrubPac could not be found in our database.",
		},
		ALREADY_SUSPENDED: {
			message: "All selected boxes are already suspended.",
			code: 400,
			error_toast_title: "Redundant Action",
			error_toast_description: "The selected GrubPacs are already in a suspended state.",
		},
		ALREADY_ACTIVE: {
			message: "All selected boxes are already active.",
			code: 400,
			error_toast_title: "Redundant Action",
			error_toast_description: "The selected GrubPacs are already active and operational.",
		},
	},
	common: {
		VERTICAL_NOT_FOUND: {
			message: "No medical vertical found!",
			code: 400,
			error_toast_title: "System Error",
			error_toast_description: "The application configuration for the medical vertical is missing. Please contact system administration.",
		},
		EMAIL_ALREADY_EXISTS: {
			message: "This email is already registered with another account!",
			code: 400,
			error_toast_title: "Duplicate Email",
			error_toast_description: "An account with this email address already exists. Please use a different email or login to your existing account.",
		},
		MOBILE_ALREADY_EXISTS: {
			message: "An employee with this mobile number already exists",
			code: 400,
			error_toast_title: "Duplicate Mobile",
			error_toast_description: "This mobile number is already associated with another account.",
		},
		DISPLAY_ID_ALREADY_EXISTS: {
			message: "An employee with this display ID already exists",
			code: 400,
			error_toast_title: "Duplicate Display ID",
			error_toast_description: "The provided employee display ID is already in use.",
		},
		ACCESS_DENIED: {
			message: "Access denied: The requested resource is outside your vertical's scope.",
			code: 403,
			error_toast_title: "Access Denied",
			error_toast_description: "You do not have permission to access or modify this resource.",
		},
		DEPARTMENT_HAS_MANAGER: {
			message: "This department already has a manager! Please unassign their role first",
			code: 400,
			error_toast_title: "Assignment Conflict",
			error_toast_description: "This department already has an active manager assigned. You must unassign the current manager before assigning a new one.",
		},
		DEPARTMENT_OWNERSHIP_MISMATCH: {
			message: "This department does not belong to the same owner!",
			code: 400,
			error_toast_title: "Ownership Error",
			error_toast_description: "You can only assign employees to departments within your own organization.",
		},
	},
};
