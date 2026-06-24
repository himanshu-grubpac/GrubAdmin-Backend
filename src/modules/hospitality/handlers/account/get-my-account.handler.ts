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
		const userObj = user as any;

		const fullName = (userObj.name || "").trim();
		const spaceIdx = fullName.indexOf(" ");
		const firstName = spaceIdx === -1 ? fullName : fullName.slice(0, spaceIdx).trim();
		const lastName = spaceIdx === -1 ? "" : fullName.slice(spaceIdx + 1).trim();

		const employee: Record<string, any> = {
			id: userObj.id,
			email: userObj.email,
			mobile_number: userObj.mobile_number,
			country_code: userObj.country_code,
			status: userObj.status,
			profile_pic: userObj.profile_pic,
			created_at: userObj.created_at,
			updated_at: userObj.updated_at,
			is_password_set: !!userObj.password,
			full_name: fullName,
			first_name: firstName,
			last_name: lastName,
			client_id: userObj.client_display_id,
			organization_name: userObj.organization_name || null,
			country: userObj.country || null,
			state: userObj.state || null,
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
					id: userObj.id,
					client_id,
				},
			},
			{
				status: 200,
			},
		);
	},
);
