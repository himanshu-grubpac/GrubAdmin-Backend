import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { prisma } from "@/db";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

const bodyValidator = zValidator(
	"json",
	z.object({
		department_ids: z.ulid("Please provide a valid source department id").array().min(1, "Please provide at least one department id"),
		destination_department_id: z.string().ulid("Please provide a valid destination department id"),
	}),
	(r) => { if (!r.success) validatorErrorHandler(r.error); },
);

export const validateDepartmentReassignmentHandler = createHandlers(
	medicalAuthGuard(["admin"]),
	bodyValidator,
	async (context) => {
		const { department_ids, destination_department_id } = context.req.valid("json");
		const { client_id } = context.var;

		if (department_ids.includes(destination_department_id)) {
			throw new APIError(
				"Destination department cannot be one of the source departments to reassign.",
				"medical.department.reassign.SELF_REASSIGNMENT",
				undefined,
				400,
			);
		}

		const sourceDepartments = await prisma.vertical_medical_department.findMany({
			where: {
				id: { in: department_ids },
				client_id,
			},
		});

		if (sourceDepartments.length !== department_ids.length) {
			throw new APIError(
				"One or more source departments were not found under this client.",
				"medical.department.reassign.SOURCE_NOT_FOUND",
				undefined,
				404,
			);
		}

		const destDepartment = await prisma.vertical_medical_department.findUnique({
			where: {
				id: destination_department_id,
				client_id,
			},
		});

		if (!destDepartment) {
			throw new APIError(
				"Destination department not found under this client.",
				"medical.department.reassign.DESTINATION_NOT_FOUND",
				undefined,
				404,
			);
		}

		if (destDepartment.status !== "active") {
			throw new APIError(
				"Destination department must be active to receive reassigned resources.",
				"medical.department.reassign.DESTINATION_NOT_ACTIVE",
				undefined,
				409,
			);
		}

		const movingManagers = await prisma.vertical_medical_employee.findMany({
			where: {
				department_id: { in: department_ids },
				role: "manager",
				status: { not: "suspended" },
			},
		});

		if (movingManagers.length > 0) {
			const destManager = await prisma.vertical_medical_employee.findFirst({
				where: {
					department_id: destination_department_id,
					role: "manager",
					status: { not: "suspended" },
				},
			});

			if (destManager) {
				throw new APIError(
					"Destination department already has an active manager. Reassignment would violate manager constraints.",
					"medical.department.assign.manager.ALREADY_HAS_MANAGER",
					undefined,
					409,
				);
			}

			if (movingManagers.length > 1) {
				throw new APIError(
					"Multiple active managers are being reassigned to a single destination department. This is not allowed.",
					"medical.department.assign.manager.MULTIPLE_MANAGERS_NOT_ALLOWED",
					undefined,
					409,
				);
			}
		}

		return context.json<APIResponse<{ valid: boolean }>>(
			{
				success: true,
				code: 200,
				data: { valid: true },
			},
			{ status: 200 },
		);
	},
);
