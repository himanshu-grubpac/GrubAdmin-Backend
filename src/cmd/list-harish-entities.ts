import { prisma } from "../db";

async function main() {
    const client_id = "01KS0QHF59ZHVEVA64E4ZXSSE7";
    console.log("Listing restaurants for Harish Verma...");
    const restaurants = await prisma.restaurant.findMany({
        where: { client_id },
        select: {
            id: true,
            name: true,
            status: true,
        }
    });
    console.log(restaurants);

    console.log("\nListing employees for Harish Verma...");
    const employees = await prisma.vertical_food_employee.findMany({
        where: { client_id },
        select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            role: true,
            status: true,
            restaurant_id: true,
        }
    });
    console.log(employees);
}

main().catch(console.error);
