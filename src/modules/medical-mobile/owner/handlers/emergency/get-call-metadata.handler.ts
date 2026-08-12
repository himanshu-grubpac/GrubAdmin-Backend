import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { getEmergencyCallMetadata } from "@/db/actions/medical-mobile/emergency.actions.ts";
import type { APIResponse } from "@/types/api";
import type { MedicalEmergencyCallMetadata } from "@/types/medical-mobile/emergency";

export const getCallMetadataHandler = createHandlers(
	medicalMobileAuthGuard(["admin"], "owner"),
	async (context) => {
		const client_id = context.get("client_id");
		const data = await getEmergencyCallMetadata(client_id);

		return context.json<APIResponse<MedicalEmergencyCallMetadata>>(
			{ success: true, code: 200, data },
			{ status: 200 },
		);
	},
);
