import { prisma } from "@/db";
import { logger } from "@/utils/logger";
import { VERTICAL_IDS } from "./seed-verticals";

export const ARCHIVED_IDS = {
  DELETED_ADMIN: "seed-admin-deleted",
  DELETED_CLIENT: "seed-client-deleted",
  DELETED_BOX: "seed-box-deleted",
  DELETED_RESTAURANT: "seed-restaurant-deleted",
  DELETED_EMPLOYEE: "seed-emp-deleted",
} as const;

const safeCreate = async <T>(label: string, fn: () => Promise<T>): Promise<void> => {
  try {
    const result = await fn();
    if (result) logger.info(`  ${label} created.`);
  } catch (err: any) {
    if (err?.code === "P2023" || err?.message?.includes?.(`does not exist in the current database`)) {
      logger.warn(`  ${label} skipped (schema/DB mismatch: ${err.message})`);
    } else {
      throw err;
    }
  }
};

export const seedArchived = async (): Promise<void> => {
  logger.info("Seeding archived/deleted entities...");

  await safeCreate("Archived dismissed admin", async () => {
    const existing = await prisma.admin_dismissed.findUnique({
      where: { id: ARCHIVED_IDS.DELETED_ADMIN },
    });
    if (!existing) {
      return prisma.admin_dismissed.create({
        data: {
          id: ARCHIVED_IDS.DELETED_ADMIN,
          first_name: "Former",
          last_name: "Admin",
          email: "former.admin@example.com",
          employee_id: "EMP-FORMER-ADMIN",
          role: "admin",
        },
      });
    }
    return null;
  });

  await safeCreate("Archived deleted client", async () => {
    const existing = await prisma.client_deleted.findUnique({
      where: { id: ARCHIVED_IDS.DELETED_CLIENT },
    });
    if (!existing) {
      return prisma.client_deleted.create({
        data: {
          id: ARCHIVED_IDS.DELETED_CLIENT,
          name: "Defunct Client LLC",
          client_display_id: "CLT-DEL-001",
          country: "United States",
          state: "Nevada",
          email: "defunct@example.com",
          mobile_number: "5559998877",
          country_code: "+1",
          vertical_id: VERTICAL_IDS.FOOD,
        },
      });
    }
    return null;
  });

  await safeCreate("Archived deleted box", async () => {
    const existing = await prisma.box_deleted.findUnique({
      where: { id: ARCHIVED_IDS.DELETED_BOX },
    });
    if (!existing) {
      return prisma.box_deleted.create({
        data: {
          id: ARCHIVED_IDS.DELETED_BOX,
          box_display_id: "GRUB-DEL-001",
          name: "Decommissioned Box",
          vertical_id: VERTICAL_IDS.FOOD,
          vehicle_number: "CA-DEL-0000",
        },
      });
    }
    return null;
  });

  await safeCreate("Archived deleted restaurant", async () => {
    const existing = await prisma.restaurant_deleted.findUnique({
      where: { id: ARCHIVED_IDS.DELETED_RESTAURANT },
    });
    if (!existing) {
      return prisma.restaurant_deleted.create({
        data: {
          id: ARCHIVED_IDS.DELETED_RESTAURANT,
          name: "Former Pizza Place",
          state: "California",
          city: "Los Angeles",
          pincode: "90001",
          line_one: "999 Sunset Blvd",
        },
      });
    }
    return null;
  });

  await safeCreate("Archived deleted employee", async () => {
    const existing = await prisma.vertical_food_employee_deleted.findUnique({
      where: { id: ARCHIVED_IDS.DELETED_EMPLOYEE },
    });
    if (!existing) {
      return prisma.vertical_food_employee_deleted.create({
        data: {
          id: ARCHIVED_IDS.DELETED_EMPLOYEE,
          first_name: "Former",
          last_name: "Employee",
          country_code: "+1",
          mobile_number: "5554443322",
          email: "former.emp@example.com",
          employee_display_id: "EMP-FRM-001",
          joining_date: new Date("2024-01-15"),
          client_name: "Defunct Client LLC",
          role_name: "delivery",
        },
      });
    }
    return null;
  });

  logger.info("Seeded archived entities.");
};
