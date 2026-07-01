import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";

interface ResponseData {
	departments: {
		id: string;
		name: string;
		_count: { boxes: number; total_employees: number };
	}[];
	roles: { id: string; name: string; description: string }[];
}

export const getEmployeeDropdownsHandler = createHandlers(
	medicalAuthGuard(),
	async (context) => {
		const { client_id } = context.var;

		const departments = await prisma.vertical_medical_department.findMany({
			where: { client_id },
			include: {
				_count: {
					select: {
						employees: true,
						department_boxes: true,
					},
				},
			},
		});

		const departmentsData = departments.map((dept) => ({
			id: dept.id,
			name: dept.name,
			_count: {
				boxes: dept._count.department_boxes,
				total_employees: dept._count.employees,
			},
		}));

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					departments: departmentsData,
					roles: [
						{
							id: "handler",
							name: "Handler",
							description:
								"Carries and operates assigned GrubPacs via the mobile app only.",
						},
						{
							id: "manager",
							name: "Manager",
							description:
								"Manages GrubPacs and handlers for the assigned department, or all visible boxes if unassigned.",
						},
					],
				},
			},
			{
				status: 200,
			},
		);
	},
);
