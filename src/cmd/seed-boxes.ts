import { prisma } from "@/db";
import { connectMongoDB } from "@/db";
import { BoxConfig } from "@/db/mongo-schema";
import { logger } from "@/utils/logger";
import { VERTICAL_IDS } from "./seed-verticals";
import { CLIENT_IDS } from "./seed-clients";
import { RESTAURANT_IDS } from "./seed-restaurants";

export const BOX_IDS = {
  BOX_001: "seed-box-001",
  BOX_002: "seed-box-002",
  BOX_003: "seed-box-003",
  BOX_004: "seed-box-004",
  BOX_005: "seed-box-005",
  BOX_006: "seed-box-006",
  BOX_007: "seed-box-007",
  BOX_008: "seed-box-008",
} as const;

interface BoxSeedDef {
  id: string;
  box_display_id: string;
  name: string;
  vertical_id: string;
  client_id: string | null;
  status: "active" | "suspended";
  vehicle_number: string | null;
  telemetry: {
    health_status?: "healthy" | "attention" | "critical";
    power_status?: "on" | "off" | "unknown";
    battery_percentage?: number;
    connection_status?: "connected" | "disconnected" | "unknown";
    wifi_status?: "on" | "off" | "unknown";
    bluetooth_status?: "on" | "off" | "unknown";
    sim_status?: "on" | "off" | "unknown";
    gps_status?: "on" | "off" | "unknown";
    solar_status?: "on" | "off" | "unknown";
    camera_status?: "on" | "off" | "unknown";
    adas_status?: "on" | "off" | "unknown";
    port_big_status?: "on" | "off" | "unknown";
    port_small_status?: "on" | "off" | "unknown";
    turn_signal_status?: "on" | "off" | "unknown";
    memory_percentage?: number;
    ext_temp?: number;
    zone1_temp?: number;
    zone2_temp?: number;
    ioniser_status?: "on" | "off" | "unknown";
    gyrosensor_status?: "on" | "off" | "unknown";
    advert_screen_status?: "on" | "off" | "unknown";
    dual_zone_status?: "on" | "off" | "unknown";
  };
  lock_status?: "locked" | "unlocked" | "not_available" | "offline";
  restaurant_ids?: string[];
}

const BOXES: BoxSeedDef[] = [
  {
    id: BOX_IDS.BOX_001,
    box_display_id: "GRUB-001",
    name: "Bella Truck #1",
    vertical_id: VERTICAL_IDS.DELIVERY,
    client_id: CLIENT_IDS.ACTIVE_1,
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
    restaurant_ids: [RESTAURANT_IDS.ACTIVE_1],
  },
  {
    id: BOX_IDS.BOX_002,
    box_display_id: "GRUB-002",
    name: "Bella Truck #2",
    vertical_id: VERTICAL_IDS.DELIVERY,
    client_id: CLIENT_IDS.ACTIVE_1,
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
    restaurant_ids: [RESTAURANT_IDS.ACTIVE_1],
  },
  {
    id: BOX_IDS.BOX_003,
    box_display_id: "GRUB-003",
    name: "Green Leaf Van #1",
    vertical_id: VERTICAL_IDS.DELIVERY,
    client_id: CLIENT_IDS.ACTIVE_2,
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
    restaurant_ids: [RESTAURANT_IDS.ACTIVE_2],
  },
  {
    id: BOX_IDS.BOX_004,
    box_display_id: "GRUB-004",
    name: "Green Leaf Van #2",
    vertical_id: VERTICAL_IDS.DELIVERY,
    client_id: CLIENT_IDS.ACTIVE_2,
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
    restaurant_ids: [RESTAURANT_IDS.ACTIVE_3],
  },
  {
    id: BOX_IDS.BOX_005,
    box_display_id: "GRUB-005",
    name: "MediQuick Ambulance #1",
    vertical_id: VERTICAL_IDS.MEDICAL,
    client_id: CLIENT_IDS.ACTIVE_3,
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
    id: BOX_IDS.BOX_006,
    box_display_id: "GRUB-006",
    name: "Unassigned Box #1",
    vertical_id: VERTICAL_IDS.DELIVERY,
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
    id: BOX_IDS.BOX_007,
    box_display_id: "GRUB-007",
    name: "Unassigned Box #2",
    vertical_id: VERTICAL_IDS.MEDICAL,
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
    id: BOX_IDS.BOX_008,
    box_display_id: "GRUB-SUS-001",
    name: "Suspended Box",
    vertical_id: VERTICAL_IDS.DELIVERY,
    client_id: CLIENT_IDS.ACTIVE_1,
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
    const existing = await prisma.box.findUnique({ where: { id: boxDef.id } });
    if (existing) {
      logger.info(`  Box "${boxDef.box_display_id}" already exists.`);
      continue;
    }

    const { restaurant_ids, lock_status, telemetry, ...boxData } = boxDef;

    const box = await prisma.box.create({
      data: {
        ...boxData,
        telemetry: {
          create: telemetry,
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
          .map((rid) => ({ box_id: box.id, restaurant_id: rid, status: "shared" })),
      });
    }

    const existingConfig = await BoxConfig.findOne({ box_id: box.id });
    if (!existingConfig) {
      await BoxConfig.create({ box_id: box.id });
    }

    logger.info(`  Box "${boxDef.box_display_id}" created with telemetry, lock, config.`);
  }

  logger.info(`Seeded ${BOXES.length} boxes.`);
};
