import type { ErrorTemplateMap } from "@/configs/template-types";

export const adminErrorTemplates: ErrorTemplateMap = {
	auth: {
		ACCOUNT_NOT_FOUND: {
			message: "No admin found",
			code: 404,
			error_toast_title: "Account Missing",
			error_toast_description: "The requested administrator account could not be found.",
		},
		UNAUTHORIZED: {
			message: "You do not have enough permissions to perform this action.",
			code: 403,
			error_toast_title: "Permission Denied",
			error_toast_description: "Your administrative role does not allow this modification.",
		},
	},
	account: {
		UPDATE_RESTRICTION: {
			message: "When updating email, mobile, or password, you cannot update other fields simultaneously.",
			code: 400,
			error_toast_title: "Multi-field update restricted",
			error_toast_description: "For security, sensitive fields like email and password must be updated individually.",
		},
		SAME_OLD_VALUE: {
			message: "The new value provided is the same as the current one.",
			code: 400,
			error_toast_title: "No changes detected",
			error_toast_description: "The new information matches your existing details.",
		},
		OTP_ALREADY_SENT: {
			message: "An OTP has already been sent recently.",
			code: 400,
			error_toast_title: "Check your inbox",
			error_toast_description: "A verification code was already sent. Please wait a moment or check your spam folder.",
		},
		INVALID_PASSWORD: {
			message: "The old password provided is incorrect.",
			code: 400,
			error_toast_title: "Verification Failed",
			error_toast_description: "The current password you entered does not match our records.",
		},

	},
};
