import { prisma } from "@/db";
import { logger } from "@/utils/logger";
import { SEED_IDS } from "./seed-ids";

const VERTICALS = [
  { id: SEED_IDS.VERTICAL_MEDICAL, name: "Medical" },
  { id: SEED_IDS.VERTICAL_CAMPING, name: "Camping" },
  { id: SEED_IDS.VERTICAL_HOSPITALITY, name: "Hospitality" },
  { id: SEED_IDS.VERTICAL_DELIVERY, name: "Delivery" },
] as const;

const ICONS = [
  { id: SEED_IDS.ICON_DEFAULT, name: "Default Icon", bucket_key: "icons/default-faq-icon.png" },
  { id: SEED_IDS.ICON_MEDICAL, name: "Medical Icon", bucket_key: "icons/medical-faq-icon.png" },
  { id: SEED_IDS.ICON_CAMPING, name: "Camping Icon", bucket_key: "icons/camping-faq-icon.png" },
  { id: SEED_IDS.ICON_HOSPITALITY, name: "Hospitality Icon", bucket_key: "icons/hospitality-faq-icon.png" },
  { id: SEED_IDS.ICON_DELIVERY, name: "Delivery Icon", bucket_key: "icons/delivery-faq-icon.png" },
  { id: SEED_IDS.ICON_SETUP, name: "Setup & Installation", bucket_key: "Support/Card/gear.svg" },
  { id: SEED_IDS.ICON_TROUBLESHOOT, name: "Troubleshooting", bucket_key: "Support/Card/suitcase-medical.svg" },
  { id: SEED_IDS.ICON_DEVICE_CONNECT, name: "Device Connection", bucket_key: "Support/Card/bluetooth-on.svg" },
  { id: SEED_IDS.ICON_ALERT, name: "Alert & Notification", bucket_key: "Support/Card/exclamation-triangle.svg" },
  { id: SEED_IDS.ICON_ACCOUNT, name: "Account & App Support", bucket_key: "Support/Card/user-shield.svg" },
  { id: SEED_IDS.ICON_OTHERS, name: "Others", bucket_key: "Support/Card/question-circle.svg" },
] as const;

export const seedVerticals = async (): Promise<void> => {
  logger.info("Seeding verticals...");
  for (const v of VERTICALS) {
    await prisma.vertical.upsert({
      where: { id: v.id },
      update: { name: v.name },
      create: { id: v.id, name: v.name },
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

export const migrateLegacyFoodVertical = async (): Promise<void> => {
  const legacyFoodVertical = await prisma.vertical.findFirst({
    where: { name: { equals: "food" } },
  });

  if (!legacyFoodVertical) {
    logger.info("  No legacy 'Food' vertical found. Nothing to migrate.");
    return;
  }

  const deliveryVertical = await prisma.vertical.findFirst({
    where: { id: SEED_IDS.VERTICAL_DELIVERY },
  });

  if (!deliveryVertical) {
    logger.warn("  Delivery vertical not found; skipping migration.");
    return;
  }

  const legacyFoodId = legacyFoodVertical.id;
  const deliveryId = deliveryVertical.id;

  if (legacyFoodId === deliveryId) {
    logger.info("  Legacy Food and Delivery are the same vertical; nothing to migrate.");
    return;
  }

  const results: string[] = [];

  const clientsMigrated = await prisma.client.updateMany({
    where: { vertical_id: legacyFoodId },
    data: { vertical_id: deliveryId },
  });
  if (clientsMigrated.count > 0) results.push(`  Migrated ${clientsMigrated.count} client(s)`);

  const boxesMigrated = await prisma.box.updateMany({
    where: { vertical_id: legacyFoodId },
    data: { vertical_id: deliveryId },
  });
  if (boxesMigrated.count > 0) results.push(`  Migrated ${boxesMigrated.count} box(es)`);

  const faqMigrated = await prisma.faq_category.updateMany({
    where: { vertical_id: legacyFoodId },
    data: { vertical_id: deliveryId },
  });
  if (faqMigrated.count > 0) results.push(`  Migrated ${faqMigrated.count} FAQ categor(ies)`);

  const deletedClientsMigrated = await prisma.client_deleted.updateMany({
    where: { vertical_id: legacyFoodId },
    data: { vertical_id: deliveryId },
  });
  if (deletedClientsMigrated.count > 0) results.push(`  Migrated ${deletedClientsMigrated.count} deleted client(s)`);

  const deletedBoxesMigrated = await prisma.box_deleted.updateMany({
    where: { vertical_id: legacyFoodId },
    data: { vertical_id: deliveryId },
  });
  if (deletedBoxesMigrated.count > 0) results.push(`  Migrated ${deletedBoxesMigrated.count} deleted box(es)`);

  await prisma.vertical.update({
    where: { id: legacyFoodId },
    data: { status: "deleted" },
  });
  results.push(`  Soft-deleted legacy 'Food' vertical (${legacyFoodId})`);

  if (results.length > 0) {
    logger.info("Legacy Food -> Delivery migration complete:");
    for (const r of results) logger.info(r);
  } else {
    logger.info("  No legacy Food-referencing records found to migrate.");
  }
};
