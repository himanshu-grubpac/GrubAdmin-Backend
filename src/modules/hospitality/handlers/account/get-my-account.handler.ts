import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import type { client, vertical_hospitality_employee } from "@/db/types";
import type { APIResponse } from "@/types/api";
import { resolveHospitalityDisplayName } from "../auth/auth.utils";

interface ResponseData {
	employee: Record<string, any>;
	role: string;
	id: string;
	client_id: string;
}

export const getMyAccountHandler = createHandlers(
	hospitalityAuthGuard(),
	async (context) => {
		const { type: role, user, client_id, debug_client_organization_name, is_password_set } = context.var;

		const base = {
			id: user.id,
			email: user.email,
			mobile_number: user.mobile_number,
			country_code: user.country_code,
			status: user.status,
			profile_pic: user.profile_pic,
			created_at: user.created_at,
			updated_at: user.updated_at,
			is_password_set,
			restaurant_id: null as string | null,
			restaurant_name: null as string | null,
		};

		let employee: Record<string, any>;

		if (role === "admin") {
			const admin = user as client;
			const fullName = resolveHospitalityDisplayName({
				fullName: admin.name,
				email: admin.email,
			});
			const spaceIdx = fullName.indexOf(" ");
			employee = {
				...base,
				full_name: fullName,
				first_name: spaceIdx === -1 ? fullName : fullName.slice(0, spaceIdx).trim(),
				last_name: spaceIdx === -1 ? "" : fullName.slice(spaceIdx + 1).trim(),
				client_id: admin.client_display_id,
				employee_display_id: null,
				organization_name: admin.organization_name || null,
				country: admin.country || null,
				state: admin.state || null,
			};
		} else {
			const emp = user as vertical_hospitality_employee;
			const first = (emp.first_name || "").trim();
			const last = (emp.last_name || "").trim();
			const fullName = resolveHospitalityDisplayName({
				firstName: first,
				lastName: last,
				email: emp.email,
			});
			employee = {
				...base,
				first_name: first || (fullName.includes(" ") ? fullName.split(" ")[0] : fullName),
				last_name: last,
				full_name: fullName,
				client_id: emp.client_id,
				employee_display_id: emp.employee_display_id ?? null,
				organization_name: debug_client_organization_name || null,
				country: null,
				state: null,
			};
		}

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					employee,
					role,
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
