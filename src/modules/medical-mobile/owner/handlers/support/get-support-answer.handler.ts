import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { MEDICAL_VERTICAL_NAME } from "@/configs/constants.ts";
import { getSupportAnswerRequestQueryValidator } from "@/modules/mobile-core/support-answer.validators.ts";
import { fetchMobileSupportAnswer } from "@/modules/mobile-core/support-answer.ts";
import type { APIResponse } from "@/types/api";

export const getSupportAnswerHandler = createHandlers(
	medicalMobileAuthGuard(["admin"], "owner"),
	getSupportAnswerRequestQueryValidator,
	async (context) => {
		const { faq_id } = context.req.valid("query");

		const data = await fetchMobileSupportAnswer(faq_id, MEDICAL_VERTICAL_NAME);

		return context.json<APIResponse<typeof data>>(
			{ success: true, code: 200, data },
			{ status: 200 },
		);
	},
);
