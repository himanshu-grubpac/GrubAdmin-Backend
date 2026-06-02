import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";
import { getUniqueVerticalDeliveryEmployee } from "@/db/actions/vertical-delivery-employee.actions";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
import { getDeliveryEmployeeBoxes } from "@/db/actions/box.actions.ts";
import type { box } from "@/db/types";

interface ProfileResponse {
    email: string;
    first_name: string;
    last_name: string;
    country_code: string;
    mobile_number: string;
    employee_id: string | null;
    role: string;
    joining_date: Date | null;
    profile_pic: string | null;
    boxes?: box[];
    organization_name?: string | null;
}

export const getProfileHandler = createHandlers(
    deliveryAuthGuard(),
    async (context) => {
        const user_id = context.get("user_id");
        const client_id = context.get("client_id");

        const employee = await getUniqueVerticalDeliveryEmployee({
            id: user_id,
        });

        if (!employee) {
            throw new APIError("User not found!", undefined, undefined, 404);
        }

        let boxes: box[] | undefined = undefined;

        if (employee.type === "delivery") {
            boxes = await getDeliveryEmployeeBoxes(employee.employee.id);
        }

        const data: ProfileResponse = {
            email: employee.employee.email ?? "",
            first_name:
                employee.type === "admin"
                    ? ((employee.employee as any).name ?? "")
                    : (employee.employee as any).first_name,
            last_name:
                employee.type === "admin"
                    ? ""
                    : (employee.employee as any).last_name,
            country_code: employee.employee.country_code ?? "",
            mobile_number: employee.employee.mobile_number ?? "",
            employee_id:
                employee.type === "admin"
                    ? null
                    : (employee.employee as any).employee_display_id,
            role: employee.type,
            joining_date:
                employee.type === "admin"
                    ? null
                    : (employee.employee as any).joining_date,
            profile_pic: (employee.employee as any).profile_pic ?? null,
            boxes,
            organization_name: null,
        };

        if (employee.type !== "admin") {
            const client = await prisma.client.findUnique({
                where: { id: client_id },
                select: { organization_name: true },
            });
            data.organization_name = client?.organization_name || null;
        } else {
            data.organization_name = (employee.employee as any).organization_name || null;
        }


        return context.json<APIResponse<ProfileResponse>>(
            {
                success: true,
                code: 200,
                data,
            },
            {
                status: 200,
            },
        );
    });

