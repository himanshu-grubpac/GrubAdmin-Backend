import { prisma } from "@/db";
import { logger } from "@/utils/logger";
import { SEED_IDS } from "./seed-ids";

interface NotificationSeed {
  id: string;
  client_id: string;
  title: string;
  description: string;
  type: "warning" | "error" | "success" | "notification";
}

const NOTIFICATIONS: NotificationSeed[] = [
  {
    id: SEED_IDS.NOTIFICATION_1,
    client_id: SEED_IDS.CLIENT_ACTIVE_1,
    title: "Box GRUB-001 battery low",
    description: "Bella Truck #1 battery is at 45%. Please recharge soon.",
    type: "warning",
  },
  {
    id: SEED_IDS.NOTIFICATION_2,
    client_id: SEED_IDS.CLIENT_ACTIVE_1,
    title: "Box GRUB-002 GPS disconnected",
    description: "Bella Truck #2 has lost GPS signal. Check vehicle location.",
    type: "error",
  },
  {
    id: SEED_IDS.NOTIFICATION_3,
    client_id: SEED_IDS.CLIENT_ACTIVE_2,
    title: "New employee registered",
    description: "Tom Baker has been registered as a delivery employee.",
    type: "success",
  },
  {
    id: SEED_IDS.NOTIFICATION_4,
    client_id: SEED_IDS.CLIENT_ACTIVE_2,
    title: "Box GRUB-004 offline",
    description: "Green Leaf Van #2 has been offline for over 24 hours.",
    type: "error",
  },
  {
    id: SEED_IDS.NOTIFICATION_5,
    client_id: SEED_IDS.CLIENT_ACTIVE_3,
    title: "MediQuick system update",
    description: "System maintenance scheduled for midnight.",
    type: "notification",
  },
];

export const seedNotifications = async (): Promise<void> => {
  logger.info("Seeding notifications...");

  for (const n of NOTIFICATIONS) {
    await prisma.notification.upsert({
      where: { id: n.id },
      update: {
        client_id: n.client_id,
        title: n.title,
        description: n.description,
        type: n.type,
      },
      create: n,
    });
    logger.info(`  Notification "${n.title}" ready.`);
  }

  logger.info(`Seeded ${NOTIFICATIONS.length} notifications.`);
};
