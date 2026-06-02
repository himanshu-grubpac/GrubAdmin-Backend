import { prisma } from "@/db";
import { logger } from "@/utils/logger";
import { SEED_IDS } from "./seed-ids";

export const seedArchived = async (): Promise<void> => {
  logger.info("Seeding archived/deleted entities...");

  await prisma.admin_dismissed.upsert({
    where: { id: SEED_IDS.ARCHIVED_ADMIN },
    update: {
      first_name: "Former",
      last_name: "Admin",
      email: "former.admin@example.com",
      employee_id: "EMP-FORMER-ADMIN",
      role: "admin",
    },
    create: {
      id: SEED_IDS.ARCHIVED_ADMIN,
      first_name: "Former",
      last_name: "Admin",
      email: "former.admin@example.com",
      employee_id: "EMP-FORMER-ADMIN",
      role: "admin",
    },
  });
  logger.info("  Archived dismissed admin ready.");

  await prisma.client_deleted.upsert({
    where: { id: SEED_IDS.ARCHIVED_CLIENT },
    update: {
      name: "Defunct Client LLC",
      client_display_id: "CLT-DEL-001",
      country: "United States",
      state: "Nevada",
      email: "defunct@example.com",
      mobile_number: "5559998877",
      country_code: "+1",
      vertical_id: SEED_IDS.VERTICAL_DELIVERY,
    },
    create: {
      id: SEED_IDS.ARCHIVED_CLIENT,
      name: "Defunct Client LLC",
      client_display_id: "CLT-DEL-001",
      country: "United States",
      state: "Nevada",
      email: "defunct@example.com",
      mobile_number: "5559998877",
      country_code: "+1",
      vertical_id: SEED_IDS.VERTICAL_DELIVERY,
    },
  });
  logger.info("  Archived deleted client ready.");

  await prisma.box_deleted.upsert({
    where: { id: SEED_IDS.ARCHIVED_BOX },
    update: {
      box_display_id: "GRUB-DEL-001",
      name: "Decommissioned Box",
      vertical_id: SEED_IDS.VERTICAL_DELIVERY,
      vehicle_number: "CA-DEL-0000",
    },
    create: {
      id: SEED_IDS.ARCHIVED_BOX,
      box_display_id: "GRUB-DEL-001",
      name: "Decommissioned Box",
      vertical_id: SEED_IDS.VERTICAL_DELIVERY,
      vehicle_number: "CA-DEL-0000",
    },
  });
  logger.info("  Archived deleted box ready.");

  await prisma.restaurant_deleted.upsert({
    where: { id: SEED_IDS.ARCHIVED_RESTAURANT },
    update: {
      name: "Former Pizza Place",
      state: "California",
      city: "Los Angeles",
      pincode: "90001",
      line_one: "999 Sunset Blvd",
    },
    create: {
      id: SEED_IDS.ARCHIVED_RESTAURANT,
      name: "Former Pizza Place",
      state: "California",
      city: "Los Angeles",
      pincode: "90001",
      line_one: "999 Sunset Blvd",
    },
  });
  logger.info("  Archived deleted restaurant ready.");

  await prisma.vertical_food_employee_deleted.upsert({
    where: { id: SEED_IDS.ARCHIVED_EMPLOYEE },
    update: {
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
    create: {
      id: SEED_IDS.ARCHIVED_EMPLOYEE,
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
  logger.info("  Archived deleted employee ready.");

  logger.info("Seeded archived entities.");
};
