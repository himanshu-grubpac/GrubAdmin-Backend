import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";

export const getNotificationDropdownsHandler = createHandlers(
    deliveryAuthGuard(),
    async (context) => {
        const { client_id } = context.var;

        const [restaurants, boxes] = await prisma.$transaction([
            prisma.restaurant.findMany({
                where: { client_id },
                select: { id: true, name: true }
            }),
            prisma.box.findMany({
                where: { client_id },
                select: { id: true, name: true, box_display_id: true }
            })
        ]);

        return context.json<APIResponse<any>>(
            {
                success: true,
                code: 200,
                data: {
                    restaurants: restaurants.map(r => ({ id: r.id, label: r.name })),
                    boxes: boxes.map(b => ({ id: b.id, label: b.name || b.box_display_id, display_id: b.box_display_id })),
                    types: [
                        { id: "error", label: "Severe" },
                        { id: "warning", label: "Warning" },
                        { id: "success", label: "Success" },
                        { id: "notification", label: "General" }
                    ]
                },
                message: "Notification dropdowns fetched successfully",
            },
            { status: 200 },
        );
    },
);
