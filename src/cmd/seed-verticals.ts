import { prisma } from "@/db";
import { logger } from "@/utils/logger";
import { SEED_IDS } from "./seed-ids";

const VERTICALS = [
  { id: SEED_IDS.VERTICAL_DELIVERY, name: "Delivery", display_order: 1 },
  { id: SEED_IDS.VERTICAL_MEDICAL, name: "Medical", display_order: 2 },
  { id: SEED_IDS.VERTICAL_HOSPITALITY, name: "Hospitality", display_order: 3 },
  { id: SEED_IDS.VERTICAL_CAMPING, name: "Camping", display_order: 4 },
] as const;

// All icons use a consistent "icons/" prefix.
// Legacy bucket keys under "Support/Card/" are handled by the URL resolver
// for backward compatibility with existing stored data.
const ICONS = [
  { id: SEED_IDS.ICON_DEFAULT, name: "Default Icon", bucket_key: "icons/default-faq-icon.svg" },
  { id: SEED_IDS.ICON_MEDICAL, name: "Medical Icon", bucket_key: "icons/medical-faq-icon.svg" },
  { id: SEED_IDS.ICON_CAMPING, name: "Camping Icon", bucket_key: "icons/camping-faq-icon.svg" },
  { id: SEED_IDS.ICON_HOSPITALITY, name: "Hospitality Icon", bucket_key: "icons/hospitality-faq-icon.svg" },
  { id: SEED_IDS.ICON_DELIVERY, name: "Delivery Icon", bucket_key: "icons/delivery-faq-icon.svg" },
  { id: SEED_IDS.ICON_SETUP, name: "Setup & Installation", bucket_key: "icons/gear.svg" },
  { id: SEED_IDS.ICON_TROUBLESHOOT, name: "Troubleshooting", bucket_key: "icons/suitcase-medical.svg" },
  { id: SEED_IDS.ICON_DEVICE_CONNECT, name: "Device Connection", bucket_key: "icons/bluetooth-on.svg" },
  { id: SEED_IDS.ICON_ALERT, name: "Alert & Notification", bucket_key: "icons/exclamation-triangle.svg" },
  { id: SEED_IDS.ICON_ACCOUNT, name: "Account & App Support", bucket_key: "icons/user-shield.svg" },
  { id: SEED_IDS.ICON_OTHERS, name: "Others", bucket_key: "icons/question-circle.svg" },
] as const;

export const seedVerticals = async (): Promise<void> => {
  logger.info("Seeding verticals...");
  for (const v of VERTICALS) {
    await prisma.vertical.upsert({
      where: { id: v.id },
      update: { name: v.name, display_order: v.display_order },
      create: { id: v.id, name: v.name, display_order: v.display_order },
    });
    logger.info(`  Vertical "${v.name}" ready.`);
  }
  logger.info(`Seeded ${VERTICALS.length} verticals.`);
};

export const seedIcons = async (): Promise<void> => {
  logger.info("Seeding icons...");
  for (const icon of ICONS) {
    await prisma.icon.upsert({
      where: { id: icon.id },
      update: { name: icon.name, bucket_key: icon.bucket_key },
      create: { id: icon.id, name: icon.name, bucket_key: icon.bucket_key },
    });
    logger.info(`  Icon "${icon.name}" ready.`);
  }
  logger.info(`Seeded ${ICONS.length} icons.`);
};


