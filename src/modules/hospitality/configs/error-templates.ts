import type { ErrorTemplateMap } from "@/configs/template-types";

export const hospitalityErrorTemplates: ErrorTemplateMap = {
	auth: {
		login: {
			ACCOUNT_NOT_FOUND: {
				message: "No hospitality client account can be found!",
				code: 400,
				error_toast_title: "Account not found",
				error_toast_description: "We couldn't find your details. Please check your credentials.",
			},
			UNAUTHORIZED: {
				message: "You are not authorized to login.",
				code: 403,
				error_toast_title: "Access Denied",
				error_toast_description: "Your account is not assigned to the Hospitality vertical.",
			},
			SUSPENDED: {
				message: "Your account has been suspended!",
				code: 403,
				error_toast_title: "Account Suspended",
				error_toast_description: "Your access has been temporarily revoked. Please contact support.",
			},
			PASSWORD_NOT_SET: {
				message: "Please login using OTP and set a password first.",
				code: 400,
				error_toast_title: "Setup Required",
				error_toast_description: "You haven't set a password yet. Please use the 'Login with OTP' option to access your account for the first time.",
				error_toast_btn_title: "Login with OTP",
				error_toast_btn_action: "/auth/otp-login",
			},
			INVALID_CREDENTIALS: {
				message: "Invalid login credentials.",
				code: 401,
				error_toast_title: "Login Failed",
				error_toast_description: "The password you entered is incorrect. Please try again or reset your password.",
				error_toast_btn_title: "Reset Password",
				error_toast_btn_action: "/auth/forgot-password",
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
				error_toast_description: "This account does not have a primary email address configured. Please contact support.",
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
			CREDENTIAL_MISMATCH: {
				message: "The token does not match the provided credentials!",
				code: 401,
				error_toast_title: "Verification Failed",
				error_toast_description: "The security token provided does not match your account information.",
			},
			AUTH_FAILED: {
				message: "Authentication failed!",
				code: 401,
				error_toast_title: "Access Denied",
				error_toast_description: "We could not verify your identity. Please try logging in again.",
			},
			INVALID_OTP_TOKEN: {
				message: "Invalid otp or token!",
				code: 401,
				error_toast_title: "Invalid Link",
				error_toast_description: "The security code or link you used is incorrect or has already been used.",
			},
			MAGIC_LINK_EXPIRED: {
				message: "The reset link is either expired or invalid!",
				code: 400,
				error_toast_title: "Link Expired",
				error_toast_description: "This password reset link is no longer valid. Please request a new link to proceed.",
			},
		},
	},
	box: {
		NOT_FOUND: {
			message: "No such box found!",
			code: 404,
			error_toast_title: "Box Not Found",
			error_toast_description: "The requested GrubPac could not be found in our database.",
		},
		CLIENT_ASSIGNED: {
			message: "A client is already assigned to this box.",
			code: 400,
			error_toast_title: "Active Assignment",
			error_toast_description: "This box is currently assigned to a client. Please reassign or unassign it before deletion.",
		},
		VERTICAL_MISMATCH: {
			message: "You must assign box that matches the client vertical",
			code: 400,
			error_toast_title: "Vertical Conflict",
			error_toast_description: "The selected box does not match the organization's business vertical.",
		},
	},
	account: {
		PASSWORD_NOT_SET: {
			message: "Password not set for this account. Please set a password first.",
			code: 400,
			error_toast_title: "Setup Required",
			error_toast_description: "Your account does not have a password configured. Please set one before proceeding with this action.",
		},
		NO_CHANGE_REQUESTS: {
			message: "No change requests exist to verify.",
			code: 400,
			error_toast_title: "No Request Found",
			error_toast_description: "We couldn't find any pending profile updates to verify. Please try updating your details again.",
		},
	},
	common: {
		VERTICAL_NOT_FOUND: {
			message: "No hospitality vertical found!",
			code: 400,
			error_toast_title: "System Error",
			error_toast_description: "The application configuration for the hospitality vertical is missing.",
		},
		EMAIL_ALREADY_EXISTS: {
			message: "This email is already registered with another account!",
			code: 400,
			error_toast_title: "Duplicate Email",
			error_toast_description: "An account with this email address already exists. Please use a different email or login to your existing account.",
		},
		ACCESS_DENIED: {
			message: "Access denied: The requested resource is outside your vertical's scope.",
			code: 403,
			error_toast_title: "Access Denied",
			error_toast_description: "You do not have permission to access or modify this resource.",
		},
	},
};
