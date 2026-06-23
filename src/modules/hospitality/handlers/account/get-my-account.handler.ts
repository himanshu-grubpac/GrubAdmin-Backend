import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import type { client } from "@/db/types";
import type { APIResponse } from "@/types/api";

interface ResponseData {
	employee: Record<string, any>;
	role: string;
	id: string;
	client_id: string;
}

export const getMyAccountHandler = createHandlers(
	hospitalityAuthGuard(),
	async (context) => {
		const { type, user, client_id } = context.var;

		const fullName = (user.name || "").trim();
		const spaceIdx = fullName.indexOf(" ");
		const firstName = spaceIdx === -1 ? fullName : fullName.slice(0, spaceIdx).trim();
		const lastName = spaceIdx === -1 ? "" : fullName.slice(spaceIdx + 1).trim();

		const employee: Record<string, any> = {
			id: user.id,
			email: user.email,
			mobile_number: user.mobile_number,
			country_code: user.country_code,
			status: user.status,
			profile_pic: user.profile_pic,
			created_at: user.created_at,
			updated_at: user.updated_at,
			is_password_set: !!user.password,
			full_name: fullName,
			first_name: firstName,
			last_name: lastName,
			client_id: (user as any).client_display_id,
			organization_name: user.organization_name || null,
			country: user.country || null,
			state: user.state || null,
			restaurant_id: null,
			restaurant_name: null,
		};

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					employee,
					role: "admin",
					id: user.id,
					client_id,
				},
			},
			{
				status: 200,
			},
		);
	},
);
