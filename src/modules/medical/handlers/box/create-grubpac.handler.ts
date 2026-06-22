import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { createGrubpacRequestBodyValidator } from "medical/validators/box.validators";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";

export const createGrubpacHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	createGrubpacRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { name, box_id, department_ids, blocked_employee_ids, access_mode } = context.req.valid("json");

		const existingBox = await prisma.box.findFirst({
			where: {
				box_display_id: box_id,
				client_id,
			},
		});

		if (existingBox) {
			throw new APIError("A box with this ID already exists.", undefined, undefined, 409);
		}

		const box = await prisma.box.create({
			data: {
				name: name || null,
				box_display_id: box_id,
				client_id,
			},
		});

		if (department_ids && department_ids.length > 0) {
			await prisma.vertical_medical_department_box.createMany({
				data: department_ids.map((dept_id: string) => ({
					box_id: box.id,
					department_id: dept_id,
				})),
			});
		}

		if (blocked_employee_ids && blocked_employee_ids.length > 0) {
			await prisma.vertical_medical_employee_box.createMany({
				data: blocked_employee_ids.map((emp_id: string) => ({
					box_id: box.id,
					employee_id: emp_id,
					status: "blocked",
				})),
			});
		}

		return context.json<APIResponse<any>>({
			success: true,
			code: 201,
			message: "GrubPac created successfully!",
			data: box,
		});
	},
);
