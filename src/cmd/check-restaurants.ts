import { prisma } from "../db";

async function main() {
    const clientId = "01KS0QHF59ZHVEVA64E4ZXSSE7";
    const restaurants = await prisma.restaurant.findMany({
        where: { client_id: clientId },
        include: {
            _count: { select: { restaurant_boxes: true, employees: true } }
        }
    });

    console.log(`Restaurants for Client ${clientId}:`, restaurants.map(r => ({
        id: r.id,
        name: r.name,
        status: r.status,
        _count: (r as any)._count,
    })));
}

main().catch(console.error);
