import { createHandlers } from "@/utils/hono-factory";
import type { APIResponse } from "@/types/api";
import { foodAuthGuard } from "@/middlewares/auth";

export const logoutHandler = createHandlers(
    foodAuthGuard(),
    async (context) => {
        return context.json<APIResponse>(
            {
                success: true,
                code: 200,
                message: "Logged out successfully",
            },
            {
                status: 200,
            },
        );
    },
);

