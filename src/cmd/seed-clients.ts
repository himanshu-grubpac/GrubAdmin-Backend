import { prisma } from "@/db";
import { logger } from "@/utils/logger";
import { VERTICAL_IDS } from "./seed-verticals";

export const CLIENT_IDS = {
  ACTIVE_1: "seed-client-active-1",
  ACTIVE_2: "seed-client-active-2",
  ACTIVE_3: "seed-client-active-3",
  SUSPENDED: "seed-client-suspended",
  INACTIVE: "seed-client-inactive",
} as const;

const CLIENTS = [
  {
    id: CLIENT_IDS.ACTIVE_1,
    name: "Bella Italia Restaurant",
    client_display_id: "CLT-001",
    organization_name: "Bella Italia Group LLC",
    country: "United States",
    state: "California",
    email: "contact@bellaitalia.com",
    mobile_number: "5551112233",
    country_code: "+1",
    status: "active" as const,
    vertical_id: VERTICAL_IDS.FOOD,
  },
  {
    id: CLIENT_IDS.ACTIVE_2,
    name: "Green Leaf Bistro",
    client_display_id: "CLT-002",
    organization_name: "Green Leaf Hospitality",
    country: "United States",
    state: "New York",
    email: "info@greenleafbistro.com",
    mobile_number: "5552223344",
    country_code: "+1",
    status: "active" as const,
    vertical_id: VERTICAL_IDS.FOOD,
  },
  {
    id: CLIENT_IDS.ACTIVE_3,
    name: "MediQuick Mobile",
    client_display_id: "CLT-003",
    organization_name: "MediQuick Services Inc.",
    country: "United States",
    state: "Texas",
    email: "admin@mediquick.com",
    mobile_number: "5553334455",
    country_code: "+1",
    status: "active" as const,
    vertical_id: VERTICAL_IDS.MEDICAL,
  },
  {
    id: CLIENT_IDS.SUSPENDED,
    name: "CampEase Rentals",
    client_display_id: "CLT-004",
    organization_name: "CampEase Outdoors",
    country: "United States",
    state: "Colorado",
    email: "info@campease.com",
    mobile_number: "5554445566",
    country_code: "+1",
    status: "suspended" as const,
    vertical_id: VERTICAL_IDS.CAMPING,
  },
  {
    id: CLIENT_IDS.INACTIVE,
    name: "Old Town Diner",
    client_display_id: "CLT-005",
    organization_name: "Old Town Foods",
    country: "United States",
    state: "Florida",
    email: "oldtown@example.com",
    mobile_number: "5555556677",
    country_code: "+1",
    status: "inactive" as const,
    vertical_id: VERTICAL_IDS.FOOD,
  },
];

export const seedClients = async (): Promise<void> => {
  logger.info("Seeding clients...");
  for (const client of CLIENTS) {
    const existing = await prisma.client.findUnique({ where: { id: client.id } });
    if (!existing) {
      await prisma.client.create({ data: client });
      logger.info(`  Client "${client.name}" (${client.status}) created.`);
    } else {
      logger.info(`  Client "${client.name}" already exists.`);
    }
  }
  logger.info(`Seeded ${CLIENTS.length} clients.`);
};
