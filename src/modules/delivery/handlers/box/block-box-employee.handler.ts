
import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { reassignBoxEmployeeRequestBodyValidator } from "delivery/validators/box.validators.ts";
import { blockBoxEmployees } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";

export const blockBoxEmployeeHandler = createHandlers(
    deliveryAuthGuard(["admin"]),
    reassignBoxEmployeeRequestBodyValidator,
    async (context) => {
        const { client_id } = context.var;
        const { box_ids, employee_ids } = context.req.valid("json");

        await blockBoxEmployees(box_ids, employee_ids, client_id);

        return context.json<APIResponse<null>>(
            {
                success: true,
                code: 200,
                message: "Employees blocked from boxes successfully",
                data: null,
            },
            { status: 200 },
        );
    },
);
