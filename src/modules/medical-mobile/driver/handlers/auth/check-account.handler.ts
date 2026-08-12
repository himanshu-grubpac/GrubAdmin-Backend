import { createHandlers } from "@/utils/hono-factory.ts";
import { checkAccountRequestBodyValidator } from "@/modules/medical-mobile/driver/validators/auth.validators.ts";
import { getUniqueMedicalEmployee } from "@/db/actions/medical/employee.actions";
import type { APIResponse } from "@/types/api";
import { assertHandlerEmployee, sendOtpToHandler } from "./auth.utils.ts";

export const checkAccountHandler = createHandlers(
	checkAccountRequestBodyValidator,
	async (context) => {
		const { email, phone } = context.req.valid("json");

		const employee = await getUniqueMedicalEmployee({ email, phone });
		const isHandler = employee?.type === "handler";
		const is_password_set = isHandler ? !!employee?.employee?.password : false;
		let message: string | undefined;

		if (isHandler && employee && !is_password_set) {
			assertHandlerEmployee(employee);
			await sendOtpToHandler(employee);
			message = "OTP sent successfully.";
		}

		return context.json<
			APIResponse & {
				is_account_found: boolean;
				is_password_set: boolean;
				message?: string;
			}
		>(
			{
				success: true,
				code: 200,
				is_account_found: isHandler,
				is_password_set,
				message,
			},
			{ status: 200 },
		);
	},
);
