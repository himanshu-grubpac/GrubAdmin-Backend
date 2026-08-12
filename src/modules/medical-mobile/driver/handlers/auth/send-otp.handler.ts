import { createHandlers } from "@/utils/hono-factory.ts";
import { sendOtpRequestBodyValidator } from "@/modules/medical-mobile/driver/validators/auth.validators.ts";
import { getUniqueMedicalEmployee } from "@/db/actions/medical/employee.actions";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { assertHandlerEmployee, sendOtpToHandler } from "./auth.utils.ts";

export const sendOtpHandler = createHandlers(sendOtpRequestBodyValidator, async (context) => {
	const { email, phone } = context.req.valid("json");

	const employee = await getUniqueMedicalEmployee({ email, phone });
	const is_account_found = !!employee && employee.type === "handler";

	if (!employee || employee.type !== "handler") {
		throw new APIError("No Employee found!", undefined, { is_account_found }, 404);
	}

	assertHandlerEmployee(employee);
	const { email: sentToEmail } = await sendOtpToHandler(employee);

	return context.json<
		APIResponse<{ otp_details: { type: string; values: string[] } }> & {
			is_account_found: boolean;
		}
	>(
		{
			success: true,
			code: 200,
			is_account_found,
			data: {
				otp_details: {
					type: "email",
					values: [sentToEmail],
				},
			},
		},
		{ status: 200 },
	);
});
