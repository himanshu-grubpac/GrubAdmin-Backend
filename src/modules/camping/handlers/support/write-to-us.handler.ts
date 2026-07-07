import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { writeToUsRequestBodyValidator } from "camping/validators/support.validators";
import { services } from "@/services";
import type { APIResponse } from "@/types/api";

export const writeToUsHandler = createHandlers(
	campingAuthGuard(),
	writeToUsRequestBodyValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const { subject, message, attachment_urls } = context.req.valid("json");

		await services.mailer.sendEmail({
			from: "ankan@sqaby.com",
			subject: `Camping Support: ${subject}`,
			to: "support@camping.app",
			text: `Support request from client ${client_id}:\n\n${message}\n\nAttachments: ${attachment_urls?.join(", ") || "None"}`,
		});

		return context.json<APIResponse<null>>({
			success: true,
			code: 200,
			message: "Your message has been sent. We'll get back to you soon.",
			data: null,
		});
	},
);
