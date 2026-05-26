import { prisma } from "@/db";
import { logger } from "@/utils/logger";

export const VERTICAL_IDS = {
  MEDICAL: "01KSHTRDRZY366VVH1G0PWC6VA",
  CAMPING: "01KSHTRDS3EZBC8NG684CRECXB",
  HOSPITALITY: "01KSHTRDS3GBAMFR0AS2SWP65G",
  DELIVERY: "01KSHTRDS398RX0ZTY8V9J5W3M",
} as const;

export const ICON_IDS = {
  DEFAULT: "01KRAXGGMRQFVMFVKT63T42WNG",
  MEDICAL: "seed-icon-medical",
  CAMPING: "seed-icon-camping",
  HOSPITALITY: "seed-icon-hospitality",
  DELIVERY: "seed-icon-delivery",
} as const;

const VERTICALS = [
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

export const migrateFoodVerticalToDelivery = async (): Promise<void> => {
  const foodVertical = await prisma.vertical.findFirst({
    where: { name: { equals: "food" } },
  });

  if (!foodVertical) {
    logger.info("  No legacy 'Food' vertical found. Nothing to migrate.");
    return;
  }

  const deliveryVertical = await prisma.vertical.findFirst({
    where: { id: VERTICAL_IDS.DELIVERY },
  });

  if (!deliveryVertical) {
    logger.warn("  Delivery vertical not found; skipping migration.");
    return;
  }

  const foodId = foodVertical.id;
  const deliveryId = deliveryVertical.id;

  if (foodId === deliveryId) {
    logger.info("  Food and Delivery are the same vertical; nothing to migrate.");
    return;
  }

  const results: string[] = [];

  // 1. Migrate clients
  const clientsMigrated = await prisma.client.updateMany({
    where: { vertical_id: foodId },
    data: { vertical_id: deliveryId },
  });
  if (clientsMigrated.count > 0) results.push(`  Migrated ${clientsMigrated.count} client(s)`);

  // 2. Migrate boxes
  const boxesMigrated = await prisma.box.updateMany({
    where: { vertical_id: foodId },
    data: { vertical_id: deliveryId },
  });
  if (boxesMigrated.count > 0) results.push(`  Migrated ${boxesMigrated.count} box(es)`);

  // 3. Migrate FAQ categories
  const faqMigrated = await prisma.faq_category.updateMany({
    where: { vertical_id: foodId },
    data: { vertical_id: deliveryId },
  });
  if (faqMigrated.count > 0) results.push(`  Migrated ${faqMigrated.count} FAQ categor(ies)`);

  // 4. Migrate deleted clients (archived)
  const deletedClientsMigrated = await prisma.client_deleted.updateMany({
    where: { vertical_id: foodId },
    data: { vertical_id: deliveryId },
  });
  if (deletedClientsMigrated.count > 0) results.push(`  Migrated ${deletedClientsMigrated.count} deleted client(s)`);

  // 5. Migrate deleted boxes
  const deletedBoxesMigrated = await prisma.box_deleted.updateMany({
    where: { vertical_id: foodId },
    data: { vertical_id: deliveryId },
  });
  if (deletedBoxesMigrated.count > 0) results.push(`  Migrated ${deletedBoxesMigrated.count} deleted box(es)`);

  // 6. Soft-delete the Food vertical
  await prisma.vertical.update({
    where: { id: foodId },
    data: { status: "deleted" },
  });
  results.push(`  Soft-deleted legacy 'Food' vertical (${foodId})`);

  if (results.length > 0) {
    logger.info("Food → Delivery migration complete:");
    for (const r of results) logger.info(r);
  } else {
    logger.info("  No Food-referencing records found to migrate.");
  }
};
