import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { getRestaurantEmployees } from "@/db/actions/restaurant.actions";
import type { APIResponse } from "@/types/api";
import { withFullNames } from "@/utils/employee.ts";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

const queryValidator = zValidator(
    "query",
    z.object({
        id: z.ulid("Please provide a valid restaurant id"),
        status: z
            .union([z.literal("active"), z.literal("suspended"), z.literal("unassigned")])
            .optional(),
    }),
    (r) => { if (!r.success) validatorErrorHandler(r.error); },
);

export const getRestaurantEmployeesHandler = createHandlers(
    deliveryAuthGuard(),
    queryValidator,
    async (context) => {
        const { client_id } = context.var;
        const { id, status: requestStatus } = context.req.valid("query");
        const status = requestStatus || { not: "suspended" };

        const data = await getRestaurantEmployees({ id, client_id, status: status as any });

        return context.json<APIResponse<{ restaurant: typeof data.restaurant; employees: ReturnType<typeof withFullNames<(typeof data.employees)[0]>> }>>(
            {
                success: true,
                code: 200,
                data: {
                    restaurant: data.restaurant,
                    employees: withFullNames(data.employees).map((e) => ({
                        ...e,
                        employee_id: (e as any).employee_display_id,
                    })) as any,
                },
            },
            { status: 200 },
        );
    },
);
