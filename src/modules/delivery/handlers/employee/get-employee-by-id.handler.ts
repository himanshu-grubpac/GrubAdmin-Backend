import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { getVerticalDeliveryEmployeeById } from "@/db/actions/vertical-delivery-employee.actions";
import type { APIResponse } from "@/types/api";
import { withFullName } from "@/utils/employee.ts";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

const queryValidator = zValidator(
    "query",
    z.object({ id: z.ulid("Please provide a valid employee id") }),
    (r) => { if (!r.success) validatorErrorHandler(r.error); },
);

const flattenBox = (box: any): any => {
    if (!box) return null;
    const { telemetry, ...boxData } = box;
    const { id: _tid, box_id: _tbid, updated_at: _tua, ...telemetryData } = (telemetry || {}) as any;
    return { ...boxData, ...telemetryData };
};

export const getEmployeeByIdHandler = createHandlers(
    deliveryAuthGuard(),
    queryValidator,
    async (context) => {
        const { client_id } = context.var;
        const { id } = context.req.valid("query");

        const employee = await getVerticalDeliveryEmployeeById({ id, client_id });
        const { vertical_delivery_employee_boxes, ...rest } = employee as any;
        const empRaw = employee as any;

        // Employee-level shared permission boxes
        const empSharedPermissions = (vertical_delivery_employee_boxes || []) as any[];
        const empSharedBoxes = empSharedPermissions
            .filter((item: any) => item.status === "shared")
            .map((item: any) => flattenBox(item.box))
            .filter(Boolean);
        const empBlockedBoxIds = new Set(
            empSharedPermissions
                .filter((item: any) => item.status === "blocked")
                .map((item: any) => item.box_id)
        );

        // Restaurant-level box assignments
        const restaurantBoxRecords = empRaw.restaurant?.restaurant_boxes || [];
        const restaurantBoxes = restaurantBoxRecords
            .filter((rb: any) => rb.status === "shared" && rb.box && !empBlockedBoxIds.has(rb.box.id))
            .map((rb: any) => flattenBox(rb.box))
            .filter(Boolean);

        let boxes: any[] = [];
        let allBoxes: any[] = [];

        if (empRaw.role === "manager" && empRaw.restaurant) {
            // Managers: derive boxes from the restaurant's assigned boxes
            // Direct = box.client_id matches the employee's client_id
            const directBoxes = restaurantBoxes.filter((b: any) => b.client_id === client_id);
            const sharedBoxes = restaurantBoxes.filter((b: any) => b.client_id !== client_id);

            boxes = directBoxes;
            // Deduplicate all_boxes
            const allMap = new Map<string, any>();
            for (const b of directBoxes) allMap.set(b.id, b);
            for (const b of sharedBoxes) if (!allMap.has(b.id)) allMap.set(b.id, b);
            allBoxes = Array.from(allMap.values());
        } else {
            // Non-managers: use employee-level shared permissions
            boxes = empSharedBoxes;
            allBoxes = empSharedBoxes;
        }

        // Excluded boxes (blocked at employee level)
        const excludedBoxes = empSharedPermissions
            .filter((item: any) => item.status === "blocked")
            .map((item: any) => flattenBox(item.box))
            .filter(Boolean);

        return context.json<APIResponse<{ employee: any }>>(
            {
                success: true,
                code: 200,
                data: {
                    employee: {
                        ...withFullName(rest),
                        employee_id: rest.employee_display_id,
                        boxes,
                        boxes_count: boxes.length,
                        all_boxes: allBoxes,
                        all_boxes_count: allBoxes.length,
                        excluded_boxes: excludedBoxes,
                    }
                },
            },
            { status: 200 },
        );
    },
);

