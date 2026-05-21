import { prisma } from "../db";

async function main() {
    const boxes = await prisma.box.findMany({
        where: {
            id: {
                in: [
                    "01KS0QHHJ44X3J2XTJM9HYG67X",
                    "01KS0QHHTKCEDAY5GRT5J2X8TX"
                ]
            }
        }
    });

    console.log("Boxes in DB:", boxes.map(b => ({
        id: b.id,
        box_display_id: b.box_display_id,
        client_id: b.client_id,
        status: b.status,
    })));
}

main().catch(console.error);
