import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";

export const removeBoxEmployeeHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	async (context) => {
		const { client_id } = context.var;
		const { box_id, employee_id } = await context.req.json();

		if (!box_id || !employee_id) {
			throw new APIError("Please provide box_id and employee_id", undefined, undefined, 400);
		}

		await prisma.vertical_medical_employee_box.deleteMany({
			where: {
				box_id,
				employee_id,
			},
		});

		return context.json<APIResponse<null>>({
			success: true,
			code: 200,
			message: "Employee removed from box successfully!",
		});
	},
);
