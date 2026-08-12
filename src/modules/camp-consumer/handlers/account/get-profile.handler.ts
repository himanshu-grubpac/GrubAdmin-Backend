import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth/camping-auth-guard.ts";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import type { vertical_camping_consumer } from "@/db/types";

interface ProfileResponse {
	email: string;
	full_name: string | null;
	country_code: string | null;
	mobile_number: string | null;
	role: string;
	profile_pic: string | null;
	organization_name?: string | null;
}

export const getProfileHandler = createHandlers(campingAuthGuard(), async (context) => {
	const user = context.get("user") as vertical_camping_consumer;
	const client_id = context.get("client_id");

	const client = client_id
		? await prisma.client.findUnique({
				where: { id: client_id },
				select: { organization_name: true, name: true },
			})
		: null;

	const data: ProfileResponse = {
		email: user.email,
		full_name: user.full_name,
		country_code: user.country_code,
		mobile_number: user.phone,
		role: "consumer",
		profile_pic: null,
		organization_name: client?.organization_name || client?.name || null,
	};

	return context.json<APIResponse<ProfileResponse>>({
		success: true,
		code: 200,
		data,
	});
});
