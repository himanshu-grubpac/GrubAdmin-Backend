import { prisma } from "../db";
import { Bcrypt } from "../utils/bcrypt";

async function main() {
  console.log("Starting mock data seeding...");

  // 0. Ensure target delivery vertical exists
  const targetVerticalId = "01KR0DHRG48S8MT3J3WS1E00PD";
  let vertical = await prisma.vertical.findUnique({
    where: { id: targetVerticalId },
  });

  if (!vertical) {
    console.log("Vertical not found, creating...");
    vertical = await prisma.vertical.create({
      data: {
        id: targetVerticalId,
        name: "Delivery",
        status: "active",
      },
    });
  }

  // 1. Find or create the target client (Harish Verma)
  let client = await prisma.client.findFirst({
    where: { email: "verma.harish@grubpac.com" },
  });

  if (!client) {
    console.log("Client Harish Verma not found, creating new client...");
    const hashedPassword = await Bcrypt.generateHash({
      data: "Qwerty@54321",
      saltLength: 10,
    });
    client = await prisma.client.create({
      data: {
        name: "Harish Verma",
        client_display_id: "2121",
        organization_name: "Delivery Wla",
        country: "India",
        state: "Delhi",
        email: "verma.harish@grubpac.com",
        password: hashedPassword,
        mobile_number: "2212121212",
        country_code: "+91",
        status: "active",
        vertical_id: "01KR0DHRG48S8MT3J3WS1E00PD", // Delivery vertical
      },
    });
  }

  const clientId = client.id;
  const verticalId = client.vertical_id || "01KR0DHRG48S8MT3J3WS1E00PD";
  console.log(`Seeding data under Client ID: ${clientId}, Vertical ID: ${verticalId}`);

  // 2. Create Restaurants
  console.log("Seeding restaurants...");
  const restaurantsData = [
    {
      name: "Grub Gourmet Central",
      city: "New Delhi",
      state: "Delhi",
      pincode: "110001",
      line_one: "Connaught Place, Block H",
      latitude: 28.6304,
      longitude: 77.2177,
      status: "active" as const,
      client_id: clientId,
    },
    {
      name: "Grub Express Noida",
      city: "Noida",
      state: "Uttar Pradesh",
      pincode: "201301",
      line_one: "Sector 62, Block C",
      latitude: 28.6273,
      longitude: 77.3727,
      status: "active" as const,
      client_id: clientId,
    },
    {
      name: "Grub Bistro Gurgaon",
      city: "Gurgaon",
      state: "Haryana",
      pincode: "122002",
      line_one: "DLF Cyber City, Phase 3",
      latitude: 28.4952,
      longitude: 77.0891,
      status: "active" as const,
      client_id: clientId,
    },
  ];

  const restaurants = [];
  for (const r of restaurantsData) {
    const created = await prisma.restaurant.create({ data: r });
    restaurants.push(created);
  }
  console.log(`Seeded ${restaurants.length} restaurants.`);

  // 3. Create Employees (Managers & Drivers)
  console.log("Seeding employees...");
  const employeesData = [
    {
      first_name: "Rahul",
      last_name: "Sharma",
      email: "rahul.sharma@deliverywla.com",
      country_code: "+91",
      mobile_number: "9876543210",
      employee_display_id: "EMP-MGR-001",
      role: "manager" as const,
      status: "active" as const,
      client_id: clientId,
      restaurant_id: restaurants[0].id, // Central
    },
    {
      first_name: "Amit",
      last_name: "Patel",
      email: "amit.patel@deliverywla.com",
      country_code: "+91",
      mobile_number: "9876543211",
      employee_display_id: "EMP-MGR-002",
      role: "manager" as const,
      status: "active" as const,
      client_id: clientId,
      restaurant_id: restaurants[1].id, // Noida
    },
    {
      first_name: "Karan",
      last_name: "Singh",
      email: "karan.singh@deliverywla.com",
      country_code: "+91",
      mobile_number: "9876543212",
      employee_display_id: "EMP-DRV-001",
      role: "delivery" as const,
      status: "active" as const,
      client_id: clientId,
      restaurant_id: restaurants[0].id,
    },
    {
      first_name: "Vikram",
      last_name: "Yadav",
      email: "vikram.yadav@deliverywla.com",
      country_code: "+91",
      mobile_number: "9876543213",
      employee_display_id: "EMP-DRV-002",
      role: "delivery" as const,
      status: "active" as const,
      client_id: clientId,
      restaurant_id: restaurants[1].id,
    },
    {
      first_name: "Sunil",
      last_name: "Kumar",
      email: "sunil.kumar@deliverywla.com",
      country_code: "+91",
      mobile_number: "9876543214",
      employee_display_id: "EMP-DRV-003",
      role: "delivery" as const,
      status: "active" as const,
      client_id: clientId,
      restaurant_id: restaurants[2].id, // Gurgaon
    },
  ];

  const employees = [];
  for (const e of employeesData) {
    const created = await prisma.vertical_delivery_employee.create({ data: e });
    employees.push(created);
  }
  console.log(`Seeded ${employees.length} employees.`);

  // 4. Seed GrubPac Boxes (IoT Packaging Boxes)
  console.log("Seeding IoT packaging boxes and telemetry...");
  const boxesData = [
    {
      name: "GrubPac Box CP-1",
      box_display_id: "GP-CP01",
      vertical_id: verticalId,
      client_id: clientId,
      status: "active" as const,
      vehicle_number: "DL-3C-AS-1234",
      connection_employee_id: employees[2].id, // Karan Singh (Driver)
    },
    {
      name: "GrubPac Box CP-2",
      box_display_id: "GP-CP02",
      vertical_id: verticalId,
      client_id: clientId,
      status: "active" as const,
      vehicle_number: "DL-3C-AS-5678",
      connection_employee_id: employees[3].id, // Vikram Yadav (Driver)
    },
    {
      name: "GrubPac Box ND-1",
      box_display_id: "GP-ND01",
      vertical_id: verticalId,
      client_id: clientId,
      status: "active" as const,
      vehicle_number: "UP-16-DF-4321",
      connection_employee_id: employees[4].id, // Sunil Kumar (Driver)
    },
    {
      name: "GrubPac Box ND-2",
      box_display_id: "GP-ND02",
      vertical_id: verticalId,
      client_id: clientId,
      status: "active" as const,
      vehicle_number: null,
      connection_employee_id: null,
    },
  ];

  const boxes = [];
  for (const b of boxesData) {
    const created = await prisma.box.create({ data: b });
    boxes.push(created);
  }
  console.log(`Seeded ${boxes.length} boxes.`);

  // 5. Seed Telemetry details
  console.log("Seeding telemetries...");
  const telemetriesData = [
    {
      box_id: boxes[0].id,
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
      box_id: boxes[1].id,
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
      box_id: boxes[2].id,
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
      box_id: boxes[3].id,
      health_status: "healthy" as const,
      power_status: "off" as const,
      battery_percentage: 0,
      memory_percentage: 0,
      ext_temp: 28,
      zone1_temp: 28,
      zone2_temp: 28,
      connection_status: "disconnected" as const,
    },
  ];

  for (const t of telemetriesData) {
    await prisma.box_telemetry_latest.create({ data: t });
  }
  console.log("Seeded box telemetry records.");

  // 6. Connect boxes to restaurants (restaurant_box mapping)
  console.log("Mapping boxes to restaurants...");
  const restaurantBoxes = [
    { restaurant_id: restaurants[0].id, box_id: boxes[0].id, status: "shared" as const },
    { restaurant_id: restaurants[0].id, box_id: boxes[1].id, status: "shared" as const },
    { restaurant_id: restaurants[1].id, box_id: boxes[2].id, status: "shared" as const },
    { restaurant_id: restaurants[2].id, box_id: boxes[3].id, status: "shared" as const },
  ];

  for (const rb of restaurantBoxes) {
    await prisma.restaurant_box.create({ data: rb });
  }

  // 7. Connect boxes to employees (vertical_delivery_employee_box mapping)
  console.log("Mapping boxes to employees...");
  const employeeBoxes = [
    { employee_id: employees[2].id, box_id: boxes[0].id, status: "shared" as const },
    { employee_id: employees[3].id, box_id: boxes[1].id, status: "shared" as const },
    { employee_id: employees[4].id, box_id: boxes[2].id, status: "shared" as const },
  ];

  for (const eb of employeeBoxes) {
    await prisma.vertical_delivery_employee_box.create({ data: eb });
  }

  // 8. Create some dummy warning/error notifications
  console.log("Seeding dashboard notifications...");
  const notificationsData = [
    {
      client_id: clientId,
      box_id: boxes[2].id,
      box_display_id: boxes[2].box_display_id,
      box_name: boxes[2].name,
      restaurant_name: restaurants[1].name,
      type: "error" as const,
      title: "Critical Telemetry Event: High Core Temperature",
      description: "GrubPac GP-ND01 exceeded maximum temperature threshhold. Core zone registered 24°C.",
      is_read: false,
    },
    {
      client_id: clientId,
      box_id: boxes[1].id,
      box_display_id: boxes[1].box_display_id,
      box_name: boxes[1].name,
      restaurant_name: restaurants[0].name,
      type: "warning" as const,
      title: "Low Battery Warning",
      description: "GrubPac GP-CP02 is operating under 35% battery (currently 32%). Connect to a power source soon.",
      is_read: false,
    },
    {
      client_id: clientId,
      box_id: boxes[0].id,
      box_display_id: boxes[0].box_display_id,
      box_name: boxes[0].name,
      restaurant_name: restaurants[0].name,
      type: "success" as const,
      title: "Delivery Mission Successful",
      description: "GrubPac GP-CP01 completed transit and unlocked safely for recipient consumer.",
      is_read: true,
    },
  ];

  for (const n of notificationsData) {
    await prisma.notification.create({ data: n });
  }
  console.log("Seeded live dashboard alerts and notification logs.");

  console.log("Mock data seeding completed successfully! Have fun developing!");
}

main()
  .catch((e) => {
    console.error("Error during mock seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
