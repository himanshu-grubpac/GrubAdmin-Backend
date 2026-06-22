import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";

export const blockBoxEmployeeHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	async (context) => {
		const { client_id } = context.var;
		const { box_id, employee_id } = await context.req.json();

		if (!box_id || !employee_id) {
			throw new APIError("Please provide box_id and employee_id", undefined, undefined, 400);
		}

		const permission = await prisma.vertical_medical_employee_box.upsert({
			where: {
				employee_id_box_id: {
					employee_id,
					box_id,
				},
			},
			update: { status: "blocked" },
			create: {
				box_id,
				employee_id,
				status: "blocked",
			},
		});

		return context.json<APIResponse<typeof permission>>({
			success: true,
			code: 200,
			message: "Employee blocked from box successfully!",
			data: permission,
		});
	},
);
