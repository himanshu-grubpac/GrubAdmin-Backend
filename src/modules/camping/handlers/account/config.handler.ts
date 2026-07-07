import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";

interface ResponseData {
	privacy_policy_url: string;
	terms_of_service_url: string;
}

export const getConfigHandler = createHandlers(
	campingAuthGuard(),
	async (context) => {
		const privacyConfig = await prisma.system_config.findUnique({
			where: { key: "privacyPolicyLink" },
		});
		const termsConfig = await prisma.system_config.findUnique({
			where: { key: "termsAndConditionsLink" },
		});

		return context.json<APIResponse<ResponseData>>({
			success: true,
			code: 200,
			data: {
				privacy_policy_url: privacyConfig?.value || "https://example.com/privacy",
				terms_of_service_url: termsConfig?.value || "https://example.com/terms",
			},
		});
	},
);
