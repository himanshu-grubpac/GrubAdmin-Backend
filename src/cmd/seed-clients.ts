import { prisma } from "@/db";
import { logger } from "@/utils/logger";
import { SEED_IDS } from "./seed-ids";

const CLIENTS = [
  {
    id: SEED_IDS.CLIENT_ACTIVE_1,
    name: "Bella Italia Restaurant",
    client_display_id: "CLT-001",
    organization_name: "Bella Italia Group LLC",
    country: "United States",
    state: "California",
    email: "contact@bellaitalia.com",
    mobile_number: "5551112233",
    country_code: "+1",
    status: "active" as const,
    vertical_id: SEED_IDS.VERTICAL_DELIVERY,
  },
  {
    id: SEED_IDS.CLIENT_ACTIVE_2,
    name: "Green Leaf Bistro",
    client_display_id: "CLT-002",
    organization_name: "Green Leaf Hospitality",
    country: "United States",
    state: "New York",
    email: "info@greenleafbistro.com",
    mobile_number: "5552223344",
    country_code: "+1",
    status: "active" as const,
    vertical_id: SEED_IDS.VERTICAL_DELIVERY,
  },
  {
    id: SEED_IDS.CLIENT_ACTIVE_3,
    name: "MediQuick Mobile",
    client_display_id: "CLT-003",
    organization_name: "MediQuick Services Inc.",
    country: "United States",
    state: "Texas",
    email: "admin@mediquick.com",
    mobile_number: "5553334455",
    country_code: "+1",
    status: "active" as const,
    vertical_id: SEED_IDS.VERTICAL_MEDICAL,
  },
  {
    id: SEED_IDS.CLIENT_SUSPENDED,
    name: "CampEase Rentals",
    client_display_id: "CLT-004",
    organization_name: "CampEase Outdoors",
    country: "United States",
    state: "Colorado",
    email: "info@campease.com",
    mobile_number: "5554445566",
    country_code: "+1",
    status: "suspended" as const,
    vertical_id: SEED_IDS.VERTICAL_CAMPING,
  },
  {
    id: SEED_IDS.CLIENT_INACTIVE,
    name: "Old Town Diner",
    client_display_id: "CLT-005",
    organization_name: "Old Town Delivery",
    country: "United States",
    state: "Florida",
    email: "oldtown@example.com",
    mobile_number: "5555556677",
    country_code: "+1",
    status: "inactive" as const,
    vertical_id: SEED_IDS.VERTICAL_DELIVERY,
  },
];

export const seedClients = async (): Promise<void> => {
  logger.info("Seeding clients...");
  for (const client of CLIENTS) {
    await prisma.client.upsert({
      where: { id: client.id },
      update: {
        name: client.name,
        client_display_id: client.client_display_id,
        organization_name: client.organization_name,
        country: client.country,
        state: client.state,
        email: client.email,
        mobile_number: client.mobile_number,
        country_code: client.country_code,
        status: client.status,
        vertical_id: client.vertical_id,
      },
      create: client,
    });
    logger.info(`  Client "${client.name}" (${client.status}) ready.`);
  }
  logger.info(`Seeded ${CLIENTS.length} clients.`);
};
