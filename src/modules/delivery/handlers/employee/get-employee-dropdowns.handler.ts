import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";
import { getRestaurantDropdowns } from "@/db/actions/restaurant.actions.ts";

interface ResponseData {
    restaurants: {
        id: string;
        name: string;
        _count: { boxes: number; total_employees: number };
    }[];
    roles: { id: string; name: string; description: string }[];
}

export const getEmployeeDropdownsHandler = createHandlers(
    deliveryAuthGuard(),
    async (context) => {
        const { client_id } = context.var;

        const restaurantsData = await getRestaurantDropdowns({
            client_id,
        });

        return context.json<APIResponse<ResponseData>>(
            {
                success: true,
                code: 200,
                data: {
                    restaurants: restaurantsData,
                    roles: [
                        {
                            id: "delivery",
                            name: "Driver",
                            description:
                                "Carries and operates assigned boxes via the mobile app only.",
                        },
                        {
                            id: "manager",
                            name: "Manager",
                            description:
                                "Manages boxes and drivers for the assigned restaurant, or all visible boxes if unassigned.",
                        },
                    ],
                },
            },
            {
                status: 200,
            },
        );
    },
);
