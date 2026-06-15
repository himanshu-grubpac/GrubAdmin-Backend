import { prisma } from "@/db";

async function main() {
    const boxes = await prisma.box.findMany({
        where: {
            client_id: "01KSSR97Y9JCVVZ3Z7DMV6EY1E",
            status: "active",
            connection_employee_id: "01KT17GD1NMV7M9MKYK511VG6X",
        },
        include: {
            restaurants: { select: { name: true } },
            telemetry: true,
        },
    });
    console.log("=== PREMA SHARMA BOXES ===");
    console.log("Count:", boxes.length);
    console.log("Boxes:", boxes.map(b => ({ id: b.id, display_id: b.box_display_id, name: b.name, power: b.telemetry?.power_status, restaurants: b.restaurants.map(r => r.name) })));
}

main().catch(console.error);
