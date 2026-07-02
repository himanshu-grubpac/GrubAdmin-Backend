import { prisma } from "@/db";
import { connectMongoDB } from "@/db";
import { BoxConfig } from "@/db/mongo-schema";
import { logger } from "@/utils/logger";
import { SEED_IDS } from "./seed-ids";

interface BoxSeedDef {
  id: string;
  box_display_id: string;
  name: string;
  vertical_id: string;
  client_id: string | null;
  status: "active" | "suspended";
  vehicle_number: string | null;
  telemetry: Record<string, unknown>;
  lock_status?: "locked" | "unlocked" | "not_available" | "offline";
  restaurant_ids?: string[];
}

const BOXES: BoxSeedDef[] = [
  {
    id: SEED_IDS.BOX_001,
    box_display_id: "GRUB-001",
    name: "Bella Truck #1",
    vertical_id: SEED_IDS.VERTICAL_DELIVERY,
    client_id: SEED_IDS.CLIENT_ACTIVE_1,
    status: "active",
    vehicle_number: "CA-1234-GRUB",
    telemetry: {
      health_status: "healthy",
      power_status: "on",
      battery_percentage: 85,
      connection_status: "connected",
      wifi_status: "on",
      gps_status: "on",
      ext_temp: 22,
      zone1_temp: 4,
    },
    lock_status: "unlocked",
    restaurant_ids: [SEED_IDS.RESTAURANT_ACTIVE_1],
  },
  {
    id: SEED_IDS.BOX_002,
    box_display_id: "GRUB-002",
    name: "Bella Truck #2",
    vertical_id: SEED_IDS.VERTICAL_DELIVERY,
    client_id: SEED_IDS.CLIENT_ACTIVE_1,
    status: "active",
    vehicle_number: "CA-5678-GRUB",
    telemetry: {
      health_status: "attention",
      power_status: "on",
      battery_percentage: 45,
      connection_status: "connected",
      wifi_status: "on",
      gps_status: "on",
      ext_temp: 25,
      zone1_temp: 6,
    },
    lock_status: "locked",
    restaurant_ids: [SEED_IDS.RESTAURANT_ACTIVE_1],
  },
  {
    id: SEED_IDS.BOX_003,
    box_display_id: "GRUB-003",
    name: "Green Leaf Van #1",
    vertical_id: SEED_IDS.VERTICAL_DELIVERY,
    client_id: SEED_IDS.CLIENT_ACTIVE_2,
    status: "active",
    vehicle_number: "NY-9012-GRUB",
    telemetry: {
      health_status: "healthy",
      power_status: "on",
      battery_percentage: 92,
      connection_status: "connected",
      wifi_status: "on",
      gps_status: "on",
      ext_temp: 20,
      zone1_temp: 3,
      zone2_temp: -5,
      dual_zone_status: "on",
    },
    lock_status: "unlocked",
    restaurant_ids: [SEED_IDS.RESTAURANT_ACTIVE_2],
  },
  {
    id: SEED_IDS.BOX_004,
    box_display_id: "GRUB-004",
    name: "Green Leaf Van #2",
    vertical_id: SEED_IDS.VERTICAL_DELIVERY,
    client_id: SEED_IDS.CLIENT_ACTIVE_2,
    status: "active",
    vehicle_number: "NY-3456-GRUB",
    telemetry: {
      health_status: "critical",
      power_status: "off",
      battery_percentage: 5,
      connection_status: "disconnected",
      wifi_status: "off",
      gps_status: "off",
      ext_temp: 30,
    },
    lock_status: "offline",
    restaurant_ids: [SEED_IDS.RESTAURANT_ACTIVE_3],
  },
  {
    id: SEED_IDS.BOX_005,
    box_display_id: "GRUB-005",
    name: "MediQuick Ambulance #1",
    vertical_id: SEED_IDS.VERTICAL_MEDICAL,
    client_id: SEED_IDS.CLIENT_ACTIVE_3,
    status: "active",
    vehicle_number: "TX-7890-MED",
    telemetry: {
      health_status: "healthy",
      power_status: "on",
      battery_percentage: 78,
      connection_status: "connected",
      wifi_status: "on",
      gps_status: "on",
      ext_temp: 18,
      zone1_temp: 2,
      ioniser_status: "on",
    },
    lock_status: "unlocked",
    restaurant_ids: [],
  },
  {
    id: SEED_IDS.BOX_006,
    box_display_id: "GRUB-006",
    name: "Unassigned Box #1",
    vertical_id: SEED_IDS.VERTICAL_DELIVERY,
    client_id: null,
    status: "active",
    vehicle_number: null,
    telemetry: {
      health_status: "healthy",
      power_status: "on",
      battery_percentage: 100,
      connection_status: "unknown",
      wifi_status: "on",
      gps_status: "on",
    },
    lock_status: "unlocked",
  },
  {
    id: SEED_IDS.BOX_007,
    box_display_id: "GRUB-007",
    name: "Unassigned Box #2",
    vertical_id: SEED_IDS.VERTICAL_MEDICAL,
    client_id: null,
    status: "active",
    vehicle_number: null,
    telemetry: {
      health_status: "healthy",
      power_status: "on",
      battery_percentage: 95,
      connection_status: "unknown",
    },
    lock_status: "unlocked",
  },
  {
    id: SEED_IDS.BOX_008,
    box_display_id: "GRUB-SUS-001",
    name: "Suspended Box",
    vertical_id: SEED_IDS.VERTICAL_DELIVERY,
    client_id: SEED_IDS.CLIENT_ACTIVE_1,
    status: "suspended",
    vehicle_number: "CA-0000-SUS",
    telemetry: {
      health_status: "attention",
      power_status: "off",
      battery_percentage: 10,
      connection_status: "disconnected",
    },
    lock_status: "offline",
  },
];

export const seedBoxes = async (): Promise<void> => {
  logger.info("Seeding boxes...");
  await connectMongoDB();

  for (const boxDef of BOXES) {
    const { restaurant_ids, lock_status, telemetry, ...boxData } = boxDef;

    const existing = await prisma.box.findUnique({ where: { id: boxDef.id } });
    if (!existing) {
      const box = await prisma.box.create({
        data: {
          ...boxData,
          telemetry: {
            create: telemetry as any,
          },
          lock: {
            create: { lock_status: lock_status || "unlocked" },
          },
        },
      });

      if (restaurant_ids && restaurant_ids.length > 0) {
        await prisma.restaurant_box.createMany({
          data: restaurant_ids
            .filter(Boolean)
            .map((rid) => ({ box_id: box.id, restaurant_id: rid, status: "shared" as const })),
        });
      }

      const existingConfig = await BoxConfig.findOne({ box_id: box.id });
      if (!existingConfig) {
        await BoxConfig.create({ box_id: box.id, client_id: boxData.client_id ?? null });
      }

      logger.info(`  Box "${boxDef.box_display_id}" created with telemetry, lock, config.`);
    } else {
      await prisma.box.update({
        where: { id: boxDef.id },
        data: { ...boxData },
      });

      await prisma.box_telemetry_latest.upsert({
        where: { box_id: boxDef.id },
        update: { ...(telemetry as any) },
        create: { box_id: boxDef.id, ...(telemetry as any) },
      });

      await prisma.box_lock.upsert({
        where: { box_id: boxDef.id },
        update: { lock_status: lock_status || "unlocked" },
        create: { box_id: boxDef.id, lock_status: lock_status || "unlocked" },
      });

      logger.info(`  Box "${boxDef.box_display_id}" already exists, updated.`);
    }
  }

  logger.info(`Seeded ${BOXES.length} boxes.`);
};
