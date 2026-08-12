import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { updateOwnerAccountRequestBodyValidator } from "@/modules/medical-mobile/owner/validators/account.validators.ts";
import { updateMedicalEmployee } from "@/db/actions/medical/employee.actions";
import type { APIResponse } from "@/types/api";
import type { client } from "@/db/types";

/**
 * PUT /account — owner profile update (Figma Settings → edit profile).
 */
export const updateAccountHandler = createHandlers(
	medicalMobileAuthGuard(["admin"], "owner"),
	updateOwnerAccountRequestBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const user = context.get("user") as client;
		const { full_name, email, country_code, phone } = context.req.valid("json");

		let first_name: string | undefined;
		let last_name: string | undefined;

		if (full_name !== undefined) {
			const parts = full_name.trim().split(/\s+/);
			first_name = parts[0] ?? "";
			last_name = parts.slice(1).join(" ") || "";
		}

		const updated = await updateMedicalEmployee({
			id: user_id,
			type: "admin",
			first_name,
			last_name,
			email,
			country_code,
			mobile_number: phone,
		});

		const displayName =
			(updated as client).name?.trim() ||
			`${first_name ?? ""} ${last_name ?? ""}`.trim() ||
			user.organization_name ||
			"Owner";

		return context.json<
			APIResponse<{
				email: string;
				full_name: string;
				country_code: string | null;
				mobile_number: string | null;
				role: string;
				facility: string | null;
			}>
		>({
			success: true,
			code: 200,
			message: "Profile updated successfully",
			data: {
				email: (updated as client).email ?? "",
				full_name: displayName,
				country_code: (updated as client).country_code,
				mobile_number: (updated as client).mobile_number,
				role: "owner",
				facility:
					(updated as client).organization_name || (updated as client).name || null,
			},
		});
	},
);
