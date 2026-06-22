import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { updateGrubpacRequestBodyValidator } from "medical/validators/box.validators";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";

export const updateGrubpacHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	updateGrubpacRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { id, name, box_id, department_ids, blocked_employee_ids, access_mode, ext_temp } = context.req.valid("json");

		const updateData: any = {};
		if (name !== undefined) updateData.name = name;
		if (box_id !== undefined) updateData.box_display_id = box_id;

		const box = await prisma.box.update({
			where: { id, client_id },
			data: updateData,
		});

		if (department_ids !== undefined) {
			await prisma.vertical_medical_department_box.deleteMany({
				where: { box_id: id },
			});
			if (department_ids.length > 0) {
				await prisma.vertical_medical_department_box.createMany({
					data: department_ids.map((dept_id: string) => ({
						box_id: id,
						department_id: dept_id,
					})),
				});
			}
		}

		if (blocked_employee_ids !== undefined) {
			await prisma.vertical_medical_employee_box.deleteMany({
				where: { box_id: id },
			});
			if (blocked_employee_ids.length > 0) {
				await prisma.vertical_medical_employee_box.createMany({
					data: blocked_employee_ids.map((emp_id: string) => ({
						box_id: id,
						employee_id: emp_id,
						status: "blocked",
					})),
				});
			}
		}

		return context.json<APIResponse<typeof box>>({
			success: true,
			code: 200,
			message: "GrubPac updated successfully!",
			data: box,
		});
	},
);
