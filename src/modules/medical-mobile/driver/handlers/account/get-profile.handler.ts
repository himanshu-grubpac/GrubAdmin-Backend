import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";
import { getUniqueMedicalEmployee } from "@/db/actions/medical/employee.actions";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
import type { vertical_medical_employee } from "@/db/types";

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
	department?: string | null;
	facility?: string | null;
	driver_display_id?: string | null;
}

export const getProfileHandler = createHandlers(
	medicalMobileAuthGuard(["handler"], "driver"),
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");

		const employee = await getUniqueMedicalEmployee({ id: user_id });

		if (!employee || employee.type !== "handler") {
			throw new APIError("User not found!", undefined, undefined, 404);
		}

		const handler = employee.employee as vertical_medical_employee;

		const [client, department] = await Promise.all([
			prisma.client.findUnique({
				where: { id: client_id },
				select: { organization_name: true, name: true },
			}),
			handler.department_id
				? prisma.vertical_medical_department.findUnique({
						where: { id: handler.department_id },
						select: { name: true },
					})
				: Promise.resolve(null),
		]);

		const data: ProfileResponse = {
			email: handler.email ?? "",
			first_name: handler.first_name,
			last_name: handler.last_name,
			country_code: handler.country_code ?? "",
			mobile_number: handler.mobile_number ?? "",
			employee_id: handler.employee_display_id,
			role: employee.type,
			joining_date: handler.joining_date
				? new Intl.DateTimeFormat("en-GB", {
						day: "numeric",
						month: "long",
						year: "numeric",
					}).format(new Date(handler.joining_date))
				: null,
			profile_pic: handler.profile_pic ?? null,
			organization_name: client?.organization_name || null,
			department: department?.name ?? null,
			facility: client?.organization_name || client?.name || null,
			driver_display_id: handler.employee_display_id,
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
