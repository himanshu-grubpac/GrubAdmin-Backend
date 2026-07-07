import type { ErrorTemplateMap } from "@/configs/template-types";

export const campingErrorTemplates: ErrorTemplateMap = {
	auth: {
		login: {
			ACCOUNT_NOT_FOUND: {
				message: "No account found with these credentials.",
				code: 400,
				error_toast_title: "Account Not Found",
				error_toast_description: "We couldn't find your account. Please check your email or contact support.",
			},
			UNAUTHORIZED: {
				message: "You are not authorized to login.",
				code: 401,
				error_toast_title: "Access Denied",
				error_toast_description: "Your role does not have permission to access this portal. Please contact your manager.",
			},
			SUSPENDED: {
				message: "Your account has been suspended!",
				code: 403,
				error_toast_title: "Account Suspended",
				error_toast_description: "Your access has been temporarily revoked. Please contact support for more details.",
			},
			PASSWORD_NOT_SET: {
				message: "Please login using OTP and set a password first.",
				code: 400,
				error_toast_title: "Setup Required",
				error_toast_description: "You haven't set a password yet. Please use the 'Login with OTP' option to access your account.",
				error_toast_btn_title: "Login with OTP",
				error_toast_btn_action: "/camping/auth/otp-login",
			},
			INVALID_CREDENTIALS: {
				message: "Invalid login credentials.",
				code: 401,
				error_toast_title: "Login Failed",
				error_toast_description: "The password you entered is incorrect. Please try again or reset your password.",
				error_toast_btn_title: "Reset Password",
				error_toast_btn_action: "/camping/auth/forgot-password",
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
				error_toast_description: "Please try again or request a new OTP.",
			},
			OTP_SAVE_FAILED: {
				message: "Failed to save OTP. Please try again.",
				code: 500,
				error_toast_title: "System Busy",
				error_toast_description: "We are having trouble processing your request right now. Please try again in a few minutes.",
			},
			ACCOUNT_INACTIVE: {
				message: "Your account is not active. Please contact support.",
				code: 400,
				error_toast_title: "Account Restricted",
				error_toast_description: "Your account status prevents login at this time. Please reach out to your administrator.",
			},
			EMAIL_NOT_FOUND: {
				message: "No email found for this account!",
				code: 400,
				error_toast_title: "Setup Required",
				error_toast_description: "This account does not have a primary email address configured. Please contact your administrator.",
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
				message: "Invalid OTP or token!",
				code: 401,
				error_toast_title: "Invalid Link",
				error_toast_description: "The security code or link you used is incorrect or has already been used.",
			},
			OTP_COOLDOWN: {
				message: "Please wait before requesting a new OTP.",
				code: 429,
				error_toast_title: "Too Many Requests",
				error_toast_description: "You have requested an OTP too recently. Please wait a moment before trying again.",
			},
		},
	},
	account: {
		PASSWORD_REQUIRED: {
			message: "Current password is required to update your password.",
			code: 400,
			error_toast_title: "Password Required",
			error_toast_description: "Please enter your current password to proceed with the password change.",
		},
		SAME_PASSWORD: {
			message: "New password must be different from your current password.",
			code: 400,
			error_toast_title: "Same Password",
			error_toast_description: "The new password you entered is the same as your current password. Please choose a different one.",
		},
		EMAIL_EXISTS: {
			message: "This email is already in use by another account.",
			code: 409,
			error_toast_title: "Email Already Exists",
			error_toast_description: "This email address is already associated with another account. Please use a different email.",
		},
		PHONE_EXISTS: {
			message: "This phone number is already in use by another account.",
			code: 409,
			error_toast_title: "Phone Already Exists",
			error_toast_description: "This phone number is already associated with another account. Please use a different number.",
		},
		NO_CHANGE_REQUESTS: {
			message: "No change requests exist to verify.",
			code: 400,
			error_toast_title: "No Request Found",
			error_toast_description: "We couldn't find any pending profile updates to verify. Please try updating your details again.",
		},
	},
	box: {
		NOT_FOUND: {
			message: "No such GrubPac found!",
			code: 404,
			error_toast_title: "Box Not Found",
			error_toast_description: "The requested GrubPac could not be found in our database.",
		},
		CONNECTION_FAILED: {
			message: "Failed to connect to the box.",
			code: 400,
			error_toast_title: "Connection Failed",
			error_toast_description: "We could not establish a connection to the box. Please try again.",
		},
	},
	camera: {
		FEED_NOT_FOUND: {
			message: "No camera feed found.",
			code: 404,
			error_toast_title: "Feed Not Found",
			error_toast_description: "The requested camera feed could not be found.",
		},
		STREAM_UNAVAILABLE: {
			message: "Live stream is currently unavailable.",
			code: 503,
			error_toast_title: "Stream Unavailable",
			error_toast_description: "The camera live stream is temporarily unavailable. The box may be offline.",
		},
		DOWNLOAD_FAILED: {
			message: "Failed to generate download link.",
			code: 500,
			error_toast_title: "Download Failed",
			error_toast_description: "We could not generate a download link for this recording. Please try again.",
		},
	},
};
