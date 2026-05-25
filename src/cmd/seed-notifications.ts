import { prisma } from "@/db";
import { logger } from "@/utils/logger";
import { CLIENT_IDS } from "./seed-clients";

const NOTIFICATIONS = [
  {
    client_id: CLIENT_IDS.ACTIVE_1,
    title: "Box GRUB-001 battery low",
    description: "Bella Truck #1 battery is at 45%. Please recharge soon.",
    type: "warning" as const,
  },
  {
    client_id: CLIENT_IDS.ACTIVE_1,
    title: "Box GRUB-002 GPS disconnected",
    description: "Bella Truck #2 has lost GPS signal. Check vehicle location.",
    type: "error" as const,
  },
  {
    client_id: CLIENT_IDS.ACTIVE_2,
    title: "New employee registered",
    description: "Tom Baker has been registered as a delivery employee.",
    type: "success" as const,
  },
  {
    client_id: CLIENT_IDS.ACTIVE_2,
    title: "Box GRUB-004 offline",
    description: "Green Leaf Van #2 has been offline for over 24 hours.",
    type: "error" as const,
  },
  {
    client_id: CLIENT_IDS.ACTIVE_3,
    title: "MediQuick system update",
    description: "System maintenance scheduled for midnight.",
    type: "notification" as const,
  },
];

export const seedNotifications = async (): Promise<void> => {
  logger.info("Seeding notifications...");

  for (const n of NOTIFICATIONS) {
    await prisma.notification.create({ data: n });
    logger.info(`  Notification "${n.title}" created.`);
  }

  logger.info(`Seeded ${NOTIFICATIONS.length} notifications.`);
};
