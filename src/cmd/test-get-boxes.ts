import { prisma } from "../db";
import { getVerticalFoodBoxes } from "../db/actions/box.actions";

async function main() {
    const employee = await prisma.vertical_food_employee.findFirst({
        where: {
            first_name: "Harish",
            last_name: "Verma",
        },
    });

    if (!employee) {
        console.log("Harish Verma not found!");
        return;
    }

    console.log("Found Employee:", {
        id: employee.id,
        role: employee.role,
        restaurant_id: employee.restaurant_id,
        client_id: employee.client_id,
        status: employee.status,
    });

    const result = await getVerticalFoodBoxes({
        client_id: employee.client_id!,
        employee_id: employee.id,
        permission_status: "shared",
    });

    console.log("getVerticalFoodBoxes result count:", result.boxes.length);
    console.log("getVerticalFoodBoxes result boxes:", result.boxes.map(b => ({
        id: b.id,
        box_display_id: b.box_display_id,
        name: b.name,
    })));

    const restaurantBoxes = await prisma.restaurant_box.findMany({
        where: {
            restaurant_id: employee.restaurant_id || undefined,
        },
        include: {
            box: true,
        },
    });
    console.log("restaurantBoxes in DB:", restaurantBoxes.map(rb => ({
        box_id: rb.box_id,
        status: rb.status,
        box_display_id: rb.box.box_display_id,
    })));
}

main().catch(console.error);
