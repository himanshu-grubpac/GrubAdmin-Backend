import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { searchVerticalFoodEmployees } from "@/db/actions/vertical-food-employee.actions";
import type { APIResponse } from "@/types/api";
import { withFullNames } from "@/utils/employee.ts";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

const queryValidator = zValidator(
    "query",
    z.object({
        query: z.string().trim().min(1, "Please provide a valid search term"),
        limit: z.coerce.number().optional(),
        status: z.string().optional().default("all"),
        restaurant_id: z.string().ulid().optional().nullable().or(z.literal("")),
    }),
    (r) => { if (!r.success) validatorErrorHandler(r.error); },
);

export const searchEmployeesHandler = createHandlers(
    foodAuthGuard(),
    queryValidator,
    async (context) => {
        const { client_id } = context.var;
        const { query, limit, status, restaurant_id } = context.req.valid("query");

        const employees = await searchVerticalFoodEmployees({
            query,
            client_id,
            limit,
            status,
            restaurant_id,
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

