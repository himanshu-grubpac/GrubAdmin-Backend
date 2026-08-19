import { createHandlers } from "@/utils/hono-factory";
import type { APIResponse } from "@/types/api";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { invalidateDeliveryAuthSessions } from "delivery/handlers/auth/delivery-auth-token";

export const logoutHandler = createHandlers(
    deliveryAuthGuard(),
    async (context) => {
        const { client_id } = context.var;
        await invalidateDeliveryAuthSessions(client_id);

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

