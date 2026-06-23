import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { prisma } from "@/db";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

const queryValidator = zValidator(
	"query",
	z.object({ id: z.ulid("Please provide a valid department id") }),
	(r) => { if (!r.success) validatorErrorHandler(r.error); },
);

export const getDepartmentDeleteSummaryHandler = createHandlers(
	medicalAuthGuard(["admin"]),
	queryValidator,
	async (context) => {
		const { id } = context.req.valid("query");
		const { client_id } = context.var;

		const department = await prisma.vertical_medical_department.findUnique({
			where: { id, client_id },
			include: {
				_count: {
					select: {
						department_boxes: true,
						employees: true,
					},
				},
			},
		});

		if (!department) {
			throw new APIError("Department not found", "medical.department.delete.NOT_FOUND", undefined, 404);
		}

		const boxCount = department._count.department_boxes;
		const employeeCount = department._count.employees;
		const reassignRequired = boxCount > 0 || employeeCount > 0;

		return context.json<APIResponse<{
			department_id: string;
			name: string;
			employee_count: number;
			box_count: number;
			reassign_required: boolean;
			recommended_action: "reassign" | "none";
		}>>(
			{
				success: true,
				code: 200,
				data: {
					department_id: department.id,
					name: department.name,
					employee_count: employeeCount,
					box_count: boxCount,
					reassign_required: reassignRequired,
					recommended_action: reassignRequired ? "reassign" : "none",
				},
			},
			{ status: 200 },
		);
	},
);
