import { prisma } from "@/db";
import { logger } from "@/utils/logger";

export const VERTICAL_IDS = {
  FOOD: "01KR0DHRG48S8MT3J3WS1E00PD",
  MEDICAL: "seed-vertical-medical",
  CAMPING: "seed-vertical-camping",
  HOSPITALITY: "seed-vertical-hospitality",
  DELIVERY: "seed-vertical-delivery",
} as const;

export const ICON_IDS = {
  DEFAULT: "01KRAXGGMRQFVMFVKT63T42WNG",
  MEDICAL: "seed-icon-medical",
  CAMPING: "seed-icon-camping",
  HOSPITALITY: "seed-icon-hospitality",
  DELIVERY: "seed-icon-delivery",
} as const;

const VERTICALS = [
  { id: VERTICAL_IDS.FOOD, name: "Food" },
  { id: VERTICAL_IDS.MEDICAL, name: "Medical" },
  { id: VERTICAL_IDS.CAMPING, name: "Camping" },
  { id: VERTICAL_IDS.HOSPITALITY, name: "Hospitality" },
  { id: VERTICAL_IDS.DELIVERY, name: "Delivery" },
] as const;

const ICONS = [
  { id: ICON_IDS.DEFAULT, name: "Default Icon", bucket_key: "icons/default-faq-icon.png" },
  { id: ICON_IDS.MEDICAL, name: "Medical Icon", bucket_key: "icons/medical-faq-icon.png" },
  { id: ICON_IDS.CAMPING, name: "Camping Icon", bucket_key: "icons/camping-faq-icon.png" },
  { id: ICON_IDS.HOSPITALITY, name: "Hospitality Icon", bucket_key: "icons/hospitality-faq-icon.png" },
  { id: ICON_IDS.DELIVERY, name: "Delivery Icon", bucket_key: "icons/delivery-faq-icon.png" },
] as const;

export const seedVerticals = async (): Promise<void> => {
  logger.info("Seeding verticals...");
  for (const v of VERTICALS) {
    await prisma.vertical.upsert({
      where: { name: v.name },
      update: {},
      create: { id: v.id, name: v.name },
    });
    logger.info(`  Vertical "${v.name}" ready.`);
  }
  logger.info(`Seeded ${VERTICALS.length} verticals.`);
};

export const seedIcons = async (): Promise<void> => {
  logger.info("Seeding icons...");
  for (const icon of ICONS) {
    const exists = await prisma.icon.findUnique({ where: { id: icon.id } });
    if (!exists) {
      await prisma.icon.create({ data: icon });
      logger.info(`  Icon "${icon.name}" created.`);
    }
  }
  logger.info(`Seeded ${ICONS.length} icons.`);
};
