import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import type { client, vertical_medical_employee } from "@/db/types";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";

interface ResponseData {
	employee: Record<string, unknown>;
	role: string;
	id: string;
	client_id: string;
}

export const getMyAccountHandler = createHandlers(
	medicalAuthGuard(),
	async (context) => {
		const { type, user, client_id } = context.var;

		const employee: Record<string, unknown> = {
			id: user.id,
			email: user.email,
			mobile_number: user.mobile_number,
			country_code: user.country_code,
			status: user.status,
			profile_pic: user.profile_pic,
			created_at: user.created_at,
			updated_at: user.updated_at,
			is_password_set: !!user.password,
		};

		if (type === "admin") {
			const fullName = ((user as client).name || "").trim();
			const spaceIdx = fullName.indexOf(" ");
			employee.full_name = fullName;
			employee.first_name = spaceIdx === -1 ? fullName : fullName.slice(0, spaceIdx).trim();
			employee.last_name = spaceIdx === -1 ? "" : fullName.slice(spaceIdx + 1).trim();
			employee.client_id = (user as client).client_display_id;
			employee.organization_name = (user as client).organization_name || null;
			employee.country = (user as client).country || null;
			employee.state = (user as client).state || null;
			employee.department_id = null;
			employee.department_name = null;
		} else {
			const emp = user as vertical_medical_employee;
			employee.first_name = emp.first_name || "";
			employee.last_name = emp.last_name || "";
			employee.full_name = [emp.first_name, emp.last_name].filter(Boolean).join(" ");
			employee.employee_id = emp.employee_display_id;
			employee.client_id = emp.client_id;
			employee.role = emp.role;
			employee.joining_date = emp.joining_date;

			const clientRecord = await prisma.client.findUnique({
				where: { id: emp.client_id as string },
				select: { organization_name: true },
			});
			employee.organization_name = clientRecord?.organization_name || null;

			if (emp.department_id) {
				const department = await prisma.vertical_medical_department.findUnique({
					where: { id: emp.department_id },
					select: { id: true, name: true },
				});
				employee.department_id = department?.id || null;
				employee.department_name = department?.name || null;
			} else {
				employee.department_id = null;
				employee.department_name = null;
			}
		}

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					employee,
					role: type === "admin" ? "admin" : "employee",
					id: user.id,
					client_id,
				},
			},
			{ status: 200 },
		);
	},
);
