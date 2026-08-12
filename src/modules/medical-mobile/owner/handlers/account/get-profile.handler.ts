import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";
import { getUniqueMedicalEmployee } from "@/db/actions/medical/employee.actions";
import { APIError } from "@/types/error";
import type { client } from "@/db/types";
import { getOwnerDisplayName } from "@/modules/medical-mobile/owner/handlers/auth/auth.utils.ts";

interface ProfileResponse {
	email: string;
	first_name: string;
	last_name: string;
	country_code: string;
	mobile_number: string;
	employee_id: string | null;
	role: string;
	joining_date: string | null;
	profile_pic: string | null;
	organization_name?: string | null;
	facility?: string | null;
}

export const getProfileHandler = createHandlers(
	medicalMobileAuthGuard(["admin"], "owner"),
	async (context) => {
		const user_id = context.get("user_id");
		const user = context.get("user") as client;

		const employee = await getUniqueMedicalEmployee({ id: user_id });

		if (!employee || employee.type !== "admin") {
			throw new APIError("User not found!", undefined, undefined, 404);
		}

		const owner = employee.employee as client;
		const displayName = getOwnerDisplayName(owner);
		const nameParts = displayName.split(/\s+/);

		const data: ProfileResponse = {
			email: owner.email ?? "",
			first_name: nameParts[0] ?? displayName,
			last_name: nameParts.slice(1).join(" "),
			country_code: owner.country_code ?? "",
			mobile_number: owner.mobile_number ?? "",
			employee_id: owner.client_display_id,
			role: "owner",
			joining_date: owner.created_at
				? new Intl.DateTimeFormat("en-GB", {
						day: "numeric",
						month: "long",
						year: "numeric",
					}).format(new Date(owner.created_at))
				: null,
			profile_pic: owner.profile_pic ?? null,
			organization_name: owner.organization_name || null,
			facility: owner.organization_name || owner.name || null,
		};

		return context.json<APIResponse<ProfileResponse>>(
			{
				success: true,
				code: 200,
				data,
			},
			{ status: 200 },
		);
	},
);
