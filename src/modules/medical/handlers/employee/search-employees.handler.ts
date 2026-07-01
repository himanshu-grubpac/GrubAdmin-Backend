import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { type APIResponse } from "@/types/api";
import { searchMedicalEmployees } from "@/db/actions/medical/employee.actions";
import { withFullNames } from "@/utils/employee.ts";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

const queryValidator = zValidator(
	"query",
	z.object({
		query: z.string().trim().min(3, "Search term must be at least 3 characters"),
		limit: z.coerce.number().optional(),
		status: z.string().optional().default("all"),
		department_id: z.string().ulid().optional().nullable().or(z.literal("")),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const searchEmployeesHandler = createHandlers(
	medicalAuthGuard(),
	queryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { query, limit, status, department_id } = context.req.valid("query");

		const employees = await searchMedicalEmployees({
			query,
			client_id,
			limit,
			status,
			department_id,
		});

		const formattedEmployees = withFullNames(employees).map((e) => ({
			id: e.id,
			name: e.full_name,
			employee_id: (e as any).employee_display_id,
			status: e.status,
			created_at: e.created_at,
			updated_at: e.updated_at,
		}));

		return context.json<APIResponse<{ employees: typeof formattedEmployees }>>(
			{
				success: true,
				code: 200,
				data: { employees: formattedEmployees },
			},
			{ status: 200 },
		);
	},
);
