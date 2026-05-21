/**
 * Seed script: Connect boxes to employees
 *
 * Known state from previous DB inspection:
 *   Client:      01KS0QHF59ZHVEVA64E4ZXSSE7
 *   Box GP-CP01: 01KS0QHHJ44X3J2XTJM9HYG67X  (status: suspended)
 *   Box GP-CP02: 01KS0QHHTKCEDAY5GRT5J2X8TX  (status: active)
 *   Restaurant Grub Gourmet Central: 01KS0QHFCQQP64WXY9RBNANCKT  (2 restaurant_boxes: both not_shared)
 *   Restaurant Grub Express Noida:   01KS0QHFMWERHFWPHEX22PQWF2
 *   Restaurant Grub Bistro Gurgaon:  01KS0QHFX9BP4SJKCQYZWFNGKZ
 *
 * Schema notes:
 *   box.client_id  maps to DB column "customer_id"  (@map("customer_id"))
 *   box.connection_employee_id → links box to the currently connected driver
 *
 * This script:
 *  1. Sets box.client_id on both boxes to link them to the test client
 *  2. Sets restaurant_box.status = "shared" for Grub Gourmet Central
 *     → so the manager (Harish Verma) sees 2 permitted boxes
 *  3. Finds active driver employees and connects the first one to GP-CP02
 *     → so GP-CP02 shows as "Box Connected" for that driver
 */

import { prisma } from "../db";

const CLIENT_ID = "01KS0QHF59ZHVEVA64E4ZXSSE7";
const BOX_GP_CP01 = "01KS0QHHJ44X3J2XTJM9HYG67X"; // suspended box
const BOX_GP_CP02 = "01KS0QHHTKCEDAY5GRT5J2X8TX"; // active box
const RESTAURANT_GGC = "01KS0QHFCQQP64WXY9RBNANCKT"; // Grub Gourmet Central

async function main() {
    console.log("Step 1: Setting box.client_id on both boxes to link to client...");
    const cp01 = await prisma.box.update({
        where: { id: BOX_GP_CP01 },
        data: { client_id: CLIENT_ID },
    });
    console.log(`  GP-CP01: client_id = ${cp01.client_id}`);

    const cp02 = await prisma.box.update({
        where: { id: BOX_GP_CP02 },
        data: { client_id: CLIENT_ID },
    });
    console.log(`  GP-CP02: client_id = ${cp02.client_id}`);

    console.log("\nStep 2: Setting restaurant_box.status = 'shared' for Grub Gourmet Central...");
    const rbUpdate = await prisma.restaurant_box.updateMany({
        where: {
            restaurant_id: RESTAURANT_GGC,
            box_id: { in: [BOX_GP_CP01, BOX_GP_CP02] },
        },
        data: { status: "shared" },
    });
    console.log(`  Updated ${rbUpdate.count} restaurant_box row(s) to 'shared'.`);

    console.log("\nStep 3: Finding active delivery employees...");
    const drivers = await prisma.vertical_food_employee.findMany({
        where: {
            client_id: CLIENT_ID,
            role: "delivery",
            status: { not: "suspended" },
        },
        select: { id: true, first_name: true, last_name: true, status: true },
    });
    console.log(`  Found ${drivers.length} active driver(s):`);
    drivers.forEach(d => console.log(`    - ${d.first_name} ${d.last_name} (${d.id}, ${d.status})`));

    if (drivers.length > 0) {
        const firstDriver = drivers[0];
        console.log(`\nStep 4: Connecting ${firstDriver.first_name} ${firstDriver.last_name} to GP-CP02...`);
        await prisma.box.update({
            where: { id: BOX_GP_CP02 },
            data: { connection_employee_id: firstDriver.id },
        });
        console.log("  Done. GP-CP02 is now connected to the driver.");
    } else {
        console.log("\nStep 4: No active drivers found — skipping box connection.");
        console.log("  (All drivers may be suspended. You may need to reactivate one first.)");
    }

    console.log("\n--- Final State ---");
    const finalBoxes = await prisma.box.findMany({
        where: { id: { in: [BOX_GP_CP01, BOX_GP_CP02] } },
        select: {
            id: true,
            box_display_id: true,
            client_id: true,
            status: true,
            connection_employee_id: true,
        },
    });
    console.log("Boxes:", finalBoxes);

    const finalRbs = await prisma.restaurant_box.findMany({
        where: { restaurant_id: RESTAURANT_GGC },
        select: { box_id: true, status: true },
    });
    console.log("Restaurant Boxes (Grub Gourmet Central):", finalRbs);

    console.log("\nSeed complete!");
    console.log("Expected result in UI:");
    console.log("  - Manager Harish Verma: 2 permitted boxes (GP-CP01, GP-CP02)");
    if (drivers.length > 0) {
        console.log(`  - Driver ${drivers[0].first_name} ${drivers[0].last_name}: shows in 'Box Connected' group`);
    }
}

main().catch(console.error);
