import { prisma } from "../db";

async function main() {
    const clientId = "01KS0QHF59ZHVEVA64E4ZXSSE7";

    // Active drivers
    const drivers = await prisma.vertical_delivery_employee.findMany({
        where: { client_id: clientId, role: "delivery", status: { not: "suspended" } },
        select: { id: true, first_name: true, last_name: true, status: true, restaurant_id: true },
    });
    console.log("Active Drivers:", drivers);

    // All boxes
    const boxes = await prisma.box.findMany({
        include: {
            restaurant_boxes: { select: { restaurant_id: true, status: true } }
        }
    });
    console.log("All Boxes:", boxes.map(b => ({
        id: b.id,
        display_id: b.box_display_id,
        customer_id: b.customer_id,
        status: b.status,
        connection_employee_id: b.connection_employee_id,
        restaurant_boxes: b.restaurant_boxes,
    })));

    // Restaurant boxes with status
    const restaurantBoxes = await prisma.restaurant_box.findMany();
    console.log("Restaurant Boxes:", restaurantBoxes);
}

main().catch(console.error);
