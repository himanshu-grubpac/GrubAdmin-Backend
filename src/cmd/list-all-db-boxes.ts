import { prisma } from "../db";

async function main() {
    console.log("Listing all boxes in DB...");
    const boxes = await prisma.box.findMany({
        select: {
            id: true,
            box_display_id: true,
            name: true,
            client_id: true,
            status: true,
            connection_employee_id: true,
        }
    });

    console.log(`Total boxes in DB: ${boxes.length}`);
    console.log(boxes);

    console.log("\nListing all clients in DB...");
    const clients = await prisma.client.findMany({
        select: {
            id: true,
            name: true,
            email: true,
        }
    });
    console.log(`Total clients in DB: ${clients.length}`);
    console.log(clients);
}

main().catch(console.error);
