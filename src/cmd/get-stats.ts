import { getVerticalFoodBoxes } from "../db/actions/box.actions";

async function main() {
    const clientId = "01KSSR97Y9JCVVZ3Z7DMV6EY1E";
    const employeeId = "01KT17GD1NMV7M9MKYK511VG6X"; // Prema Sharma
    
    const result = await getVerticalFoodBoxes({
        client_id: clientId,
        status: "active",
        employee_id: employeeId,
        fetchAll: true
    });
    console.log("=== PREMA SHARMA BOXES ===");
    console.log("Count:", result.count);
    console.log("Boxes:", result.boxes.map(b => ({ id: b.id, display_id: b.box_display_id, name: b.name, power: b.power_status, restaurants: b.restaurants.map((r: any) => r.name) })));
}

main().catch(console.error);
