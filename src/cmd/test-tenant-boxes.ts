import { prisma } from "../db";

async function main() {
    const clientId = "01KS0QHF59ZHVEVA64E4ZXSSE7";
    const boxes = await prisma.box.findMany({
        where: {
            client_id: clientId,
        },
        include: {
            restaurant_boxes: {
                include: {
                    restaurant: true,
                }
            }
        }
    });

    console.log(`Boxes for Client ${clientId}:`, boxes.map(b => ({
        id: b.id,
        box_display_id: b.box_display_id,
        status: b.status,
        restaurant_boxes: b.restaurant_boxes.map(rb => ({
            restaurant_name: rb.restaurant.name,
            status: rb.status,
        }))
    })));
}

main().catch(console.error);
