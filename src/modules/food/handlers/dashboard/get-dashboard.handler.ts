import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { getFoodEmployeeBoxes } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";

interface ResponseData {
    is_password_set: boolean;
    has_boxes: boolean;
}

export const getDashboardHandler = createHandlers(
    foodAuthGuard(),
    async (context) => {
        const { user } = context.var;

        // Check if password is set
        const is_password_set = !!user.password;

        // Check if user has boxes assigned
        const boxes = await getFoodEmployeeBoxes(user.id);
        const has_boxes = boxes.length > 0;

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
