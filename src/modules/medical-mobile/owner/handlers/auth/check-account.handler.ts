import { createHandlers } from "@/utils/hono-factory.ts";
import { checkAccountRequestBodyValidator } from "@/modules/medical-mobile/owner/validators/auth.validators.ts";
import { getUniqueMedicalEmployee } from "@/db/actions/medical/employee.actions";
import type { APIResponse } from "@/types/api";
import { assertOwnerAdmin, sendOtpToOwner } from "./auth.utils.ts";

export const checkAccountHandler = createHandlers(
	checkAccountRequestBodyValidator,
	async (context) => {
		const { email, phone } = context.req.valid("json");

		const employee = await getUniqueMedicalEmployee({ email, phone });
		const isOwner = employee?.type === "admin";
		const is_password_set = isOwner ? !!employee?.employee?.password : false;
		let message: string | undefined;

		if (isOwner && employee && !is_password_set) {
			assertOwnerAdmin(employee);
			await sendOtpToOwner(employee);
			message = "OTP sent successfully.";
		}

		return context.json<
			APIResponse & {
				is_account_found: boolean;
				is_password_set: boolean;
				message?: string;
			}
		>({
			success: true,
			code: 200,
			is_account_found: isOwner,
			is_password_set,
			message,
		});
	},
);
