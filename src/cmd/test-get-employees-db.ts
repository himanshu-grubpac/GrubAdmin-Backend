import { prisma } from "../db";

async function main() {
    const employees = await prisma.vertical_food_employee.findMany({
        where: {
            OR: [
                { first_name: { contains: "Harsh" } },
                { last_name: { contains: "Verma" } },
                { first_name: { contains: "Harish" } }
            ]
        }
    });

    console.log("Employees in DB:", employees.map(e => ({
        id: e.id,
        first_name: e.first_name,
        last_name: e.last_name,
        role: e.role,
        restaurant_id: e.restaurant_id,
        status: e.status,
    })));

    const allManagers = await prisma.vertical_food_employee.findMany({
        where: {
            role: "manager",
        }
    });
    console.log("All Managers in DB:", allManagers.map(e => ({
        id: e.id,
        first_name: e.first_name,
        last_name: e.last_name,
        restaurant_id: e.restaurant_id,
        status: e.status,
    })));
}

main().catch(console.error);
