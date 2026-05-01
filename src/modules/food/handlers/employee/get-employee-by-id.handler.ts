import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { getVerticalFoodEmployeeById } from "@/db/actions/vertical-food-employee.actions";
import type { APIResponse } from "@/types/api";
import { withFullName } from "@/utils/employee.ts";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";
import { prisma } from "@/db";

const queryValidator = zValidator(
    "query",
    z.object({ id: z.ulid("Please provide a valid employee id") }),
    (r) => { if (!r.success) validatorErrorHandler(r.error); },
);

export const getEmployeeByIdHandler = createHandlers(
    foodAuthGuard(),
    queryValidator,
    async (context) => {
        const { client_id } = context.var;
        const { id } = context.req.valid("query");

        const employee = await getVerticalFoodEmployeeById({ id, client_id });
        const { vertical_food_employee_boxes, ...rest } = employee as any;
        const boxesRaw = (vertical_food_employee_boxes || []) as any[];

        return context.json<APIResponse<{ employee: any }>>(
            {
                success: true,
                code: 200,
                data: {
                    employee: {
                        ...withFullName(rest),
                        employee_id: rest.employee_display_id,
                        boxes: boxesRaw
                            .filter((item: any) => item.status === "shared")
                            .map((item: any) => item.box),
                        excluded_boxes: boxesRaw
                            .filter((item: any) => item.status === "blocked")
                            .map((item: any) => item.box),
                    }
                },
            },
            { status: 200 },
        );
    },
);

