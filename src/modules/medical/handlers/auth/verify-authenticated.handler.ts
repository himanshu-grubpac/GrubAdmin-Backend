import { medicalAuthGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";
import type { MedicalEmployeeRoleType } from "@/types/common";
import { APIError } from "@/types/error";
import { createHandlers } from "@/utils/hono-factory";
import type { client, vertical_medical_employee } from "@/db/types";

interface ResponseData {
	type: MedicalEmployeeRoleType;
	roles: string[];
}

export const verifyAuthenticatedHandler = createHandlers(
	medicalAuthGuard(),
	async (context) => {
		const { user, type } = context.var;

		const userRecord = user as client | vertical_medical_employee;

		if (userRecord.status === "suspended") {
			throw new APIError(
				"Your account has been suspended!",
				undefined,
				undefined,
				401,
			);
		}

		const roles: string[] =
			type === "admin"
				? ["admin"]
				: type === "manager"
					? ["manager"]
					: ["handler"];

		return context.json<APIResponse<ResponseData>>({
			success: true,
			code: 200,
			data: {
				type,
				roles,
			},
		});
	},
);
