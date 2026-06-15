import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { searchVerticalDeliveryEmployees } from "@/db/actions/vertical-delivery-employee.actions";
import type { APIResponse } from "@/types/api";
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
        restaurant_id: z.string().ulid().optional().nullable().or(z.literal("")),
    }),
    (r) => { if (!r.success) validatorErrorHandler(r.error); },
);

export const searchEmployeesHandler = createHandlers(
    deliveryAuthGuard(),
    queryValidator,
    async (context) => {
        const { client_id } = context.var;
        const { query, limit, status, restaurant_id } = context.req.valid("query");

        const employees = await searchVerticalDeliveryEmployees({
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

