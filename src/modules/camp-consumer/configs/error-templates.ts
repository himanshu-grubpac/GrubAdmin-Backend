import type { ErrorTemplateMap } from "@/configs/template-types";

export const campingErrorTemplates: ErrorTemplateMap = {
	box: {
		NOT_FOUND: {
			message: "Box not found or not assigned to your account.",
			code: 404,
			error_toast_title: "Box Not Found",
			error_toast_description:
				"This box is not linked to your camp account. Check the box ID or contact support.",
		},
	},
	auth: {
		login: {
			OTP_EXPIRED: {
				message: "OTP expired or invalid.",
				code: 400,
				error_toast_title: "OTP Expired",
				error_toast_description:
					"The verification code is no longer valid. Please request a new one.",
			},
			SUSPENDED: {
				message: "Your account has been suspended.",
				code: 403,
				error_toast_title: "Account Suspended",
				error_toast_description:
					"Your access has been temporarily revoked. Please contact support for assistance.",
			},
		},
	},
};
