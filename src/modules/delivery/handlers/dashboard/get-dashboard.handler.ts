import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { clientHasBoxes } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";

interface ResponseData {
    is_password_set: boolean;
    has_boxes: boolean;
}

export const getDashboardHandler = createHandlers(
    deliveryAuthGuard(),
    async (context) => {
        const { user, client_id } = context.var;

        // Check if password is set
        const is_password_set = !!user.password;

        // Boxes belong to the client (box.client_id), not the employee row.
        // Admin login resolves `user` to a `client`, so an employee-id lookup
        // always returned zero. Scope by client_id so managers and admins both
        // reflect the account's boxes.
        const has_boxes = await clientHasBoxes(client_id);

        return context.json<APIResponse<ResponseData>>(
            {
                success: true,
                code: 200,
                data: {
                    is_password_set,
                    has_boxes,
                },
            },
            {
                status: 200,
            },
        );
    },
);
