import { prisma } from "@/db";
import { logger } from "@/utils/logger";

/**
 * Backfill vertical_id on existing notifications.
 *
 * 1. Notifications with a box_id  → use the box's vertical_id
 * 2. Notifications without box_id → use the client's vertical_id
 * 3. Skip notifications that already have vertical_id set
 */
export const migrateNotificationVerticalId = async (): Promise<void> => {
  logger.info("Starting notification vertical_id backfill migration...");

  // Step 1: Backfill from box
  const boxResult = await prisma.$executeRaw`
    UPDATE notification n
    JOIN box b ON n.box_id = b.id
    SET n.vertical_id = b.vertical_id
    WHERE n.vertical_id IS NULL
      AND n.box_id IS NOT NULL
      AND b.vertical_id IS NOT NULL
  `;
  logger.info(`  Backfilled ${boxResult} notifications from box vertical_id`);

  // Step 2: Backfill remaining from client
  const clientResult = await prisma.$executeRaw`
    UPDATE notification n
    JOIN client c ON n.client_id = c.id
    SET n.vertical_id = c.vertical_id
    WHERE n.vertical_id IS NULL
      AND c.vertical_id IS NOT NULL
  `;
  logger.info(`  Backfilled ${clientResult} notifications from client vertical_id`);

  const remaining = await prisma.notification.count({
    where: { vertical_id: null },
  });
  if (remaining > 0) {
    logger.warn(`  ${remaining} notifications still have NULL vertical_id`);
  } else {
    logger.info("  All notifications now have vertical_id set");
  }

  logger.info("Notification vertical_id backfill migration complete.");
};
