import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { createNotification } from "@/db/actions/notification.actions.ts";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";

export const blockBoxEmployeeHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	async (context) => {
		const { client_id, vertical_id } = context.var;
		const { box_id, employee_id } = await context.req.json();

		if (!box_id || !employee_id) {
			return context.json<APIResponse<null>>(
				{
					success: false,
					code: 400,
					message: "box_id and employee_id are required",
					data: null,
				},
				{ status: 400 },
			);
		}

		const result = await prisma.vertical_medical_employee_box.upsert({
			where: {
				employee_id_box_id: {
					box_id,
					employee_id,
				},
			},
			update: { status: "blocked" },
			create: {
				box_id,
				employee_id,
				status: "blocked",
			},
		});

		// Create notification for blocked employee
		try {
			await createNotification({
				client_id,
				vertical_id,
				box_id,
				type: "warning",
				title: "Employee Blocked from Box",
				description: `Employee ${employee_id} has been blocked from accessing box ${box_id}`,
			});
		} catch (err) {
			console.error("Failed to create block notification:", err);
		}

		return context.json<APIResponse<typeof result>>(
			{
				success: true,
				code: 200,
				message: "Employee blocked from box successfully!",
				data: result,
			},
			{ status: 200 },
		);
	},
);
