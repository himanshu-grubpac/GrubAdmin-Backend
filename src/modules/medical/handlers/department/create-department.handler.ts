import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { createDepartmentRequestBodyValidator } from "medical/validators/department.validators";
import type { vertical_medical_department } from "@/db/types";
import { APIError } from "@/types/error";
import { createDepartment } from "@/db/actions/medical/department.actions";
import type { APIResponse } from "@/types/api";
import { loggerService } from "@/services/system-log.ts";
import { resolveMessageTemplate } from "@/utils/message";
import { prisma } from "@/db";

interface ResponseData {
	department: vertical_medical_department;
}

export const createDepartmentHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	createDepartmentRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { name, status } = context.req.valid("json");

		const existingByName = await prisma.vertical_medical_department.findFirst({
			where: {
				name,
				client_id,
				status: "active"
			}
		});
		if (existingByName) {
			throw new APIError(
				"A department with this name already exists under your account.",
				"medical.department.create.DUPLICATE_NAME",
				undefined,
				409
			);
		}

		const department = await createDepartment({ name, client_id, status });

		const { user_id, user, type: userType } = context.var;
		const userObj = user as any;
		const actorName = userType === "admin"
			? userObj.name
			: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

		await loggerService.log({
			category: "Department",
			type: "Creation",
			actor: {
				id: user_id,
				name: actorName,
				role: userType,
				table: userType === "admin" ? "client" : "vertical_medical_employee",
			},
			client_id,
			subject: {
				id: department.id,
				name: department.name,
				type: "department",
			},
		});

		const response = {
			success: true as const,
			...resolveMessageTemplate("medical.department.create.SUCCESS", { id: department.id, name: department.name }),
			data: { department },
		};

		return context.json<APIResponse<ResponseData>>(response, response.code as any);
	},
);
