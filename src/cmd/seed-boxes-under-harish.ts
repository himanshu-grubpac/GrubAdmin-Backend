import { prisma } from "../db";
import { ulid } from "ulid";

const CLIENT_ID = "01KS0QHF59ZHVEVA64E4ZXSSE7";
const VERTICAL_ID = "01KR0DHRG48S8MT3J3WS1E00PD";

const RESTAURANT_GGC = "01KS0QHFCQQP64WXY9RBNANCKT"; // Grub Gourmet Central
const RESTAURANT_GEN = "01KS0QHFMWERHFWPHEX22PQWF2"; // Grub Express Noida

async function main() {
    console.log("Starting safe mock boxes seeding sequence under Harish Verma...");

    const boxDisplayIds = ["GP-CP01", "GP-CP02", "GP-ND01", "GP-ND02"];

    // Step 1: Clean up any existing boxes with these display IDs to prevent duplicates/crashing
    console.log("Cleaning up existing box data for GP-CP01, GP-CP02, GP-ND01, GP-ND02...");

    // Find existing box records to clean associated tables
    const existingBoxes = await prisma.box.findMany({
        where: { box_display_id: { in: boxDisplayIds } },
        select: { id: true }
    });
    const existingIds = existingBoxes.map(b => b.id);

    if (existingIds.length > 0) {
        console.log(`  Deleting existing telemetries, restaurant mappings, and employee mappings for ${existingIds.length} box(es)...`);
        await prisma.box_telemetry_latest.deleteMany({ where: { box_id: { in: existingIds } } });
        await prisma.restaurant_box.deleteMany({ where: { box_id: { in: existingIds } } });
        await prisma.vertical_food_employee_box.deleteMany({ where: { box_id: { in: existingIds } } });
        await prisma.box.deleteMany({ where: { id: { in: existingIds } } });
        console.log("  Cleanup complete.");
    } else {
        console.log("  No existing boxes found. Skipping cleanup.");
    }

    // Step 2: Retrieve active drivers to connect to boxes
    console.log("\nFetching active drivers for connection...");
    const drivers = await prisma.vertical_food_employee.findMany({
        where: {
            client_id: CLIENT_ID,
            role: "delivery",
        },
        select: { id: true, first_name: true, last_name: true, status: true, restaurant_id: true }
    });

    const activeDriver = drivers.find(d => d.status === "active");
    const driverId = activeDriver ? activeDriver.id : (drivers[0] ? drivers[0].id : null);

    if (activeDriver) {
        console.log(`  Found active driver for GP-CP01 / GP-CP02: ${activeDriver.first_name} ${activeDriver.last_name} (${activeDriver.id})`);
    } else if (drivers[0]) {
        console.log(`  No active driver found. Using driver: ${drivers[0].first_name} ${drivers[0].last_name} (${drivers[0].id})`);
    } else {
        console.log("  Warning: No drivers found in DB!");
    }

    // Step 3: Create the 4 GrubPac boxes
    console.log("\nCreating GrubPac box records...");

    const boxesToInsert = [
        {
            name: "GrubPac Box CP-1",
            box_display_id: "GP-CP01",
            vertical_id: VERTICAL_ID,
            client_id: CLIENT_ID,
            status: "active" as const,
            vehicle_number: "DL-3C-AS-1234",
            connection_employee_id: driverId,
        },
        {
            name: "GrubPac Box CP-2",
            box_display_id: "GP-CP02",
            vertical_id: VERTICAL_ID,
            client_id: CLIENT_ID,
            status: "active" as const,
            vehicle_number: "DL-3C-AS-5678",
            connection_employee_id: null,
        },
        {
            name: "GrubPac Box ND-1",
            box_display_id: "GP-ND01",
            vertical_id: VERTICAL_ID,
            client_id: CLIENT_ID,
            status: "active" as const,
            vehicle_number: "UP-16-DF-4321",
            connection_employee_id: null,
        },
        {
            name: "GrubPac Box ND-2",
            box_display_id: "GP-ND02",
            vertical_id: VERTICAL_ID,
            client_id: CLIENT_ID,
            status: "active" as const,
            vehicle_number: null,
            connection_employee_id: null,
        }
    ];

    const seededBoxes = [];
    for (const b of boxesToInsert) {
        const created = await prisma.box.create({ data: b });
        seededBoxes.push(created);
        console.log(`  Seeded box: ${created.box_display_id} (ID: ${created.id})`);
    }

    // Step 4: Create Latest Telemetry Records
    console.log("\nCreating box telemetry records...");
    const telemetries = [
        {
            box_id: seededBoxes[0].id,
            health_status: "healthy" as const,
            power_status: "on" as const,
            battery_percentage: 87,
            memory_percentage: 12,
            ext_temp: 34,
            zone1_temp: 4,
            zone2_temp: 6,
            connection_status: "connected" as const,
        },
        {
            box_id: seededBoxes[1].id,
            health_status: "attention" as const,
            power_status: "on" as const,
            battery_percentage: 32,
            memory_percentage: 45,
            ext_temp: 38,
            zone1_temp: 12,
            zone2_temp: 14,
            connection_status: "connected" as const,
        },
        {
            box_id: seededBoxes[2].id,
            health_status: "critical" as const,
            power_status: "on" as const,
            battery_percentage: 8,
            memory_percentage: 89,
            ext_temp: 41,
            zone1_temp: 24,
            zone2_temp: 26,
            connection_status: "connected" as const,
        },
        {
            box_id: seededBoxes[3].id,
            health_status: "healthy" as const,
            power_status: "off" as const,
            battery_percentage: 0,
            memory_percentage: 0,
            ext_temp: 28,
            zone1_temp: 28,
            zone2_temp: 28,
            connection_status: "disconnected" as const,
        }
    ];

    for (const t of telemetries) {
        await prisma.box_telemetry_latest.create({ data: t });
    }
    console.log("  Successfully seeded latest telemetries.");

    // Step 5: Map boxes to restaurants (restaurant_box)
    console.log("\nMapping boxes to restaurants...");
    const restaurantMappings = [
        { restaurant_id: RESTAURANT_GGC, box_id: seededBoxes[0].id, status: "shared" as const },
        { restaurant_id: RESTAURANT_GGC, box_id: seededBoxes[1].id, status: "shared" as const },
        { restaurant_id: RESTAURANT_GEN, box_id: seededBoxes[2].id, status: "shared" as const },
        { restaurant_id: RESTAURANT_GEN, box_id: seededBoxes[3].id, status: "shared" as const }
    ];

    for (const rm of restaurantMappings) {
        await prisma.restaurant_box.create({ data: rm });
        console.log(`  Mapped ${rm.box_id} to restaurant ${rm.restaurant_id} (${rm.status})`);
    }

    // Step 6: Map boxes to employees (vertical_food_employee_box) for manager access
    if (driverId) {
        console.log("\nMapping connected boxes to drivers in employee box mappings...");
        const employeeMappings = [
            { employee_id: driverId, box_id: seededBoxes[0].id, status: "shared" as const }
        ];

        for (const em of employeeMappings) {
            await prisma.vertical_food_employee_box.create({ data: em });
            console.log(`  Mapped box ${em.box_id} to employee ${em.employee_id}`);
        }
    }

    console.log("\nSeeding of boxes mock data completed successfully!");
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
