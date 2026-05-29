import { prisma } from "@/db";
import { logger } from "@/utils/logger";
import { SEED_IDS } from "./seed-ids";

const RESTAURANTS = [
  {
    id: SEED_IDS.RESTAURANT_ACTIVE_1,
    name: "Downtown Bella Italia",
    client_id: SEED_IDS.CLIENT_ACTIVE_1,
    city: "San Francisco",
    state: "California",
    pincode: "94102",
    line_one: "123 Market Street",
    status: "active" as const,
  },
  {
    id: SEED_IDS.RESTAURANT_ACTIVE_2,
    name: "Green Leaf Downtown",
    client_id: SEED_IDS.CLIENT_ACTIVE_2,
    city: "New York",
    state: "New York",
    pincode: "10001",
    line_one: "456 Broadway",
    status: "active" as const,
  },
  {
    id: SEED_IDS.RESTAURANT_ACTIVE_3,
    name: "Green Leaf Brooklyn",
    client_id: SEED_IDS.CLIENT_ACTIVE_2,
    city: "Brooklyn",
    state: "New York",
    pincode: "11201",
    line_one: "789 Atlantic Ave",
    status: "active" as const,
  },
  {
    id: SEED_IDS.RESTAURANT_SUSPENDED,
    name: "MediQuick Houston Hub",
    client_id: SEED_IDS.CLIENT_ACTIVE_3,
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
    await prisma.restaurant.upsert({
      where: { id: r.id },
      update: {
        name: r.name,
        client_id: r.client_id,
        city: r.city,
        state: r.state,
        pincode: r.pincode,
        line_one: r.line_one,
        status: r.status,
      },
      create: r,
    });
    logger.info(`  Restaurant "${r.name}" (${r.status}) ready.`);
  }
  logger.info(`Seeded ${RESTAURANTS.length} restaurants.`);
};
