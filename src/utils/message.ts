import { messageTemplates } from "@/configs/message-templates";

export const resolveMessageTemplate = (path: string, data?: Record<string, any>) => {
	const keys = path.split(".");
	let current: any = messageTemplates;
	
	for (const key of keys) {
		current = current?.[key];
	}

	if (current && typeof current === "object" && "message" in current) {
		const template = current as any;
		
		let message = template.message as string;
		let message_toast_title = template.message_toast_title as string;
		let message_toast_description = template.message_toast_description as string;
		let message_toast_btn_action = template.message_toast_btn_action as string | undefined;

		if (data) {
			for (const [key, value] of Object.entries(data)) {
				const placeholder = `{${key}}`;
				message = message.replace(new RegExp(placeholder, "g"), String(value));
				message_toast_title = message_toast_title.replace(new RegExp(placeholder, "g"), String(value));
				message_toast_description = message_toast_description.replace(new RegExp(placeholder, "g"), String(value));
				if (message_toast_btn_action) {
					message_toast_btn_action = message_toast_btn_action.replace(new RegExp(placeholder, "g"), String(value));
				}
			}
		}

		return {
			message,
			code: (template.code || 200) as number,
			message_toast_title,
			message_toast_description,
			message_toast_btn_title: template.message_toast_btn_title as string | undefined,
			message_toast_btn_action,
		};
	}

	return {
		message: "Operation successful",
		code: 200,
		message_toast_title: "Success",
		message_toast_description: "The request was processed successfully.",
	};
};
