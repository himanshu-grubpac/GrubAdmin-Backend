import { prisma } from "../db";
import { Bcrypt } from "../utils/bcrypt";

async function run() {
  console.log("[ACTION] Seeding persistent Tenant B (Competitor) and relations...");

  // 1. Ensure Tenant A (Harish Verma) is present
  const clientA = await prisma.client.findFirst({
    where: { email: "verma.harish@grubpac.com" },
  });

  if (!clientA) {
    console.error("[ERROR] Tenant A (verma.harish@grubpac.com) must be seeded first using seed-mock-data script!");
    process.exit(1);
  }

  const verticalId = clientA.vertical_id || "01KR0DHRG48S8MT3J3WS1E00PD";

  // 2. Find or create Tenant B (Competitor Corp)
  let clientB = await prisma.client.findFirst({
    where: { email: "competitor@grubpac.com" },
  });

  const hashedPassword = await Bcrypt.generateHash({
    data: "Qwerty@54321",
    saltLength: 10,
  });

  if (!clientB) {
    console.log("[ACTION] Creating Client B (Competitor Corp)...");
    clientB = await prisma.client.create({
      data: {
        id: "01KS0QNB4KT6EQ02AVNVBCZVEJ",
        name: "Competitor Corp",
        client_display_id: "8888",
        organization_name: "Competitor Delivery Solutions",
        country: "India",
        state: "Delhi",
        email: "competitor@grubpac.com",
        password: hashedPassword,
        mobile_number: "9000000888",
        country_code: "+91",
        status: "active",
        vertical_id: verticalId,
      },
    });
  }

  const clientBId = clientB.id;
  console.log(`[INFO] Tenant B ID: ${clientBId}`);

  // 3. Create Restaurant for Tenant B
  let restaurantB = await prisma.restaurant.findFirst({
    where: { name: "Competitor Delhi Kitchen", client_id: clientBId }
  });

  if (!restaurantB) {
    console.log("[ACTION] Creating Restaurant for Tenant B...");
    restaurantB = await prisma.restaurant.create({
      data: {
        name: "Competitor Delhi Kitchen",
        city: "New Delhi",
        state: "Delhi",
        pincode: "110002",
        line_one: "Daryaganj, Block A",
        latitude: 28.6415,
        longitude: 77.2408,
        status: "active",
        client_id: clientBId,
      }
    });
  }

  // 4. Create Employee for Tenant B
  let employeeB = await prisma.vertical_food_employee.findFirst({
    where: { email: "competitor-drv@competitor.com", client_id: clientBId }
  });

  if (!employeeB) {
    console.log("[ACTION] Creating Employee for Tenant B...");
    employeeB = await prisma.vertical_food_employee.create({
      data: {
        first_name: "Competitor",
        last_name: "Driver",
        email: "competitor-drv@competitor.com",
        country_code: "+91",
        mobile_number: "9000000800",
        employee_display_id: "COMP-DRV-001",
        role: "delivery",
        status: "active",
        client_id: clientBId,
        restaurant_id: restaurantB.id,
      }
    });
  }

  // 5. Create Box for Tenant B
  let boxB = await prisma.box.findFirst({
    where: { box_display_id: "GP-COMP01" }
  });

  if (!boxB) {
    console.log("[ACTION] Creating Box for Tenant B...");
    boxB = await prisma.box.create({
      data: {
        name: "Competitor Box GP-COMP01",
        box_display_id: "GP-COMP01",
        vertical_id: verticalId,
        client_id: clientBId,
        status: "active",
        vehicle_number: "DL-1C-AS-9999",
        connection_employee_id: employeeB.id,
      }
    });

    // Create Telemetry for Box B
    await prisma.box_telemetry_latest.create({
      data: {
        box_id: boxB.id,
        health_status: "healthy",
        power_status: "on",
        battery_percentage: 95,
        memory_percentage: 8,
        ext_temp: 32,
        zone1_temp: 5,
        zone2_temp: 5,
        connection_status: "connected",
      }
    });

    // Map box to restaurant
    await prisma.restaurant_box.create({
      data: {
        restaurant_id: restaurantB.id,
        box_id: boxB.id,
        status: "shared",
      }
    });

    // Map box to employee
    await prisma.vertical_food_employee_box.create({
      data: {
        employee_id: employeeB.id,
        box_id: boxB.id,
        status: "shared",
      }
    });
  }

  console.log("[SUCCESS] Tenant B and all relations seeded successfully!");
  console.log(`  -> Client B ID: ${clientBId}`);
  console.log(`  -> Client B Email: competitor@grubpac.com`);
  console.log(`  -> Client B Password: Qwerty@54321`);
  console.log(`  -> Client B Employee ID: ${employeeB.id} (Display ID: COMP-DRV-001)`);
  console.log(`  -> Client B Box ID: ${boxB.id} (Display ID: GP-COMP01)`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
