import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { reassignBoxEmployeeRequestBodyValidator } from "delivery/validators/box.validators.ts";
import { blockBoxEmployees } from "@/db/actions/box.actions.ts";
import { createNotification } from "@/db/actions/notification.actions.ts";
import type { APIResponse } from "@/types/api";

export const blockBoxEmployeeHandler = createHandlers(
    deliveryAuthGuard(["admin"]),
    reassignBoxEmployeeRequestBodyValidator,
    async (context) => {
        const { client_id, vertical_id } = context.var;
        const { box_ids, employee_ids } = context.req.valid("json");

        await blockBoxEmployees(box_ids, employee_ids, client_id);

        // Create a single summary notification instead of O(n*m) individual ones
        try {
         await createNotification({
          client_id,
          vertical_id,
          box_id: box_ids[0],
          type: "warning",
          title: "Employees Blocked from Boxes",
          description: `${employee_ids.length} employee(s) blocked from ${box_ids.length} box(es)`,
         });
        } catch (err) {
         console.error("Failed to create block notification:", err);
        }

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
