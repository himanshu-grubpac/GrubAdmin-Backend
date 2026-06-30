import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { updateMedicalEmployeeById, getUniqueMedicalEmployee } from "@/db/actions/medical/employee.actions";
import type { APIResponse } from "@/types/api";
import { withFullName, resolveEmployeeName } from "@/utils/employee.ts";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";
import { loggerService } from "@/services/system-log.ts";

const bodyValidator = zValidator(
	"json",
	z.object({
		id: z.ulid("Please provide a valid employee id"),
		full_name: z.string().trim().min(1).optional(),
		first_name: z.string().trim().min(1).optional(),
		last_name: z.string().trim().optional(),
		country_code: z.string().trim().min(1).optional(),
		mobile_number: z.string().trim().min(7).max(20).optional(),
		email: z.string().trim().email().optional(),
		employee_id: z.string().trim().min(1).optional(),
		joining_date: z.coerce.date().optional(),
		role: z.union([z.literal("manager"), z.literal("handler")]).optional(),
		department_id: z.ulid().nullable().optional().or(z.literal("")),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const updateEmployeeHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	bodyValidator,
	async (context) => {
		const { client_id, user, type, user_id } = context.var;
		const body = context.req.valid("json");
		const { id, full_name, first_name: rawFirst, last_name: rawLast, ...rest } = body;

		const oldEmployeeResult = await getUniqueMedicalEmployee({ id });
		const oldEmployee = oldEmployeeResult?.employee;

		let nameUpdate: { first_name?: string; last_name?: string } = {};
		if (full_name || rawFirst) {
			const { first_name, last_name } = resolveEmployeeName({ full_name, first_name: rawFirst, last_name: rawLast });
			nameUpdate = { first_name, last_name };
		}

		const employee = await updateMedicalEmployeeById({
			id,
			client_id,
			...nameUpdate,
			...rest,
			employee_display_id: (rest as any).employee_id,
		});

		const changes: any[] = [];
		if (oldEmployee) {
			const fieldsToCompare: (keyof typeof rest | "employee_id")[] = ["role", "mobile_number", "email", "employee_id"];
			for (const field of fieldsToCompare) {
				const reqValue = (rest as any)[field];
				const dbValue = (oldEmployee as any)[field === "employee_id" ? "employee_display_id" : field];
				if (reqValue !== undefined && dbValue !== reqValue) {
					changes.push({
						field,
						old_value: String(dbValue || "None"),
						new_value: String(reqValue),
					});
				}
			}
		}

		const userObj = user as any;
		const actorName = type === "admin"
			? userObj.name
			: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

		await loggerService.log({
			category: "Employee",
			type: "Updation",
			actor: {
				id: user_id,
				name: actorName,
				role: type,
				table: type === "admin" ? "client" : "vertical_medical_employee",
			},
			client_id,
			subject: {
				id: employee.id,
				name: withFullName(employee).full_name,
				type: "employee",
			},
			metadata: {
				changes,
			},
		});

		return context.json<APIResponse<{ employee: typeof employee & { full_name: string } }>>(
			{
				success: true,
				code: 200,
				data: {
					employee: {
						...withFullName(employee),
						employee_id: (employee as any).employee_display_id,
					} as any,
				},
			},
			{ status: 200 },
		);
	},
);
