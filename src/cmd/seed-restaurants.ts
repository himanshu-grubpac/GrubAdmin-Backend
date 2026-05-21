import { prisma } from "@/db";
import { logger } from "@/utils/logger";
import { CLIENT_IDS } from "./seed-clients";

export const RESTAURANT_IDS = {
  ACTIVE_1: "seed-restaurant-active-1",
  ACTIVE_2: "seed-restaurant-active-2",
  ACTIVE_3: "seed-restaurant-active-3",
  SUSPENDED: "seed-restaurant-suspended",
} as const;

const RESTAURANTS = [
  {
    id: RESTAURANT_IDS.ACTIVE_1,
    name: "Downtown Bella Italia",
    client_id: CLIENT_IDS.ACTIVE_1,
    city: "San Francisco",
    state: "California",
    pincode: "94102",
    line_one: "123 Market Street",
    status: "active" as const,
  },
  {
    id: RESTAURANT_IDS.ACTIVE_2,
    name: "Green Leaf Downtown",
    client_id: CLIENT_IDS.ACTIVE_2,
    city: "New York",
    state: "New York",
    pincode: "10001",
    line_one: "456 Broadway",
    status: "active" as const,
  },
  {
    id: RESTAURANT_IDS.ACTIVE_3,
    name: "Green Leaf Brooklyn",
    client_id: CLIENT_IDS.ACTIVE_2,
    city: "Brooklyn",
    state: "New York",
    pincode: "11201",
    line_one: "789 Atlantic Ave",
    status: "active" as const,
  },
  {
    id: RESTAURANT_IDS.SUSPENDED,
    name: "MediQuick Houston Hub",
    client_id: CLIENT_IDS.ACTIVE_3,
    city: "Houston",
    state: "Texas",
    pincode: "77001",
    line_one: "321 Medical Drive",
    status: "suspended" as const,
  },
];

export const seedRestaurants = async (): Promise<void> => {
  logger.info("Seeding restaurants...");
  for (const r of RESTAURANTS) {
    const existing = await prisma.restaurant.findUnique({ where: { id: r.id } });
    if (!existing) {
      await prisma.restaurant.create({ data: r });
      logger.info(`  Restaurant "${r.name}" (${r.status}) created.`);
    } else {
      logger.info(`  Restaurant "${r.name}" already exists.`);
    }
  }
  logger.info(`Seeded ${RESTAURANTS.length} restaurants.`);
};
