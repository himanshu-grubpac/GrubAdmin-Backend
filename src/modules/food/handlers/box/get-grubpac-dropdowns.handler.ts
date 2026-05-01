import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";
import { getRestaurantDropdowns } from "@/db/actions/restaurant.actions.ts";
import { searchVerticalFoodEmployees } from "@/db/actions/vertical-food-employee.actions";
import { withFullNames } from "@/utils/employee.ts";

interface ResponseData {
    restaurants: {
        id: string;
        name: string;
        _count: { boxes: number; total_employees: number };
    }[];
    employees: {
        id: string;
        name: string;
        employee_id: string;
        status: string;
    }[];
}

export const getGrubpacDropdownsHandler = createHandlers(
    foodAuthGuard(),
    async (context) => {
        const { client_id } = context.var;

        const [restaurants, employees] = await Promise.all([
            getRestaurantDropdowns({ client_id }),
            searchVerticalFoodEmployees({
                client_id,
                limit: 1000,
                status: "all",
            }),
        ]);

        const formattedEmployees = withFullNames(employees).map((e) => ({
            id: e.id,
            name: e.full_name,
            employee_id: (e as any).employee_display_id,
            status: e.status,
            created_at: e.created_at,
            updated_at: e.updated_at,
        }));

        return context.json<APIResponse<ResponseData>>(
            {
                success: true,
                code: 200,
                data: {
                    restaurants,
                    employees: formattedEmployees,
                },
            },
            {
                status: 200,
            },
        );
    },
);

