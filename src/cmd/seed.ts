import { logger } from "@/utils/logger";
import seedSystemConfigs from "./seed-system-configs";
import { seedMongoData } from "./seed-mongo";
import { seedVerticals, seedIcons } from "./seed-verticals";
import { seedRoles } from "./seed-roles";
import { seedAdmins } from "./seed-admins";
import { seedClients } from "./seed-clients";
import { seedRestaurants } from "./seed-restaurants";
import { seedBoxes } from "./seed-boxes";
import { seedEmployees } from "./seed-employees";
import { seedFaq } from "./seed-faq";
import { seedNotifications } from "./seed-notifications";
import { seedArchived } from "./seed-archived";
import { seedMedical } from "./seed-medical";
import { SEED_IDS } from "./seed-ids";

export const seed = async () => {
  const startTime = Date.now();
  logger.info("Initializing deterministic database seeding sequence...");

  // Phase 1: Foundation entities (no dependencies)
  // 1. System Configurations
  try {
    await seedSystemConfigs();
    logger.info("System configurations seeding completed.");
  } catch (err) {
    logger.error(`Failed to seed system configurations: ${err}`);
  }

  // 2. Icons (standalone)
  try {
    await seedIcons();
    logger.info("Icons seeding completed.");
  } catch (err) {
    logger.error(`Failed to seed icons: ${err}`);
  }

  // 3. Verticals (standalone)
  try {
    await seedVerticals();
    logger.info("Verticals seeding completed.");
  } catch (err) {
    logger.error(`Failed to seed verticals: ${err}`);
  }

	// 4. Roles (standalone)
  let roleIds: Record<string, string> = {};
  try {
    roleIds = await seedRoles();
    logger.info("Roles seeding completed.");
  } catch (err) {
    logger.error(`Failed to seed roles: ${err}`);
  }

  // Phase 2: Entities that depend on Phase 1
  // 6. Admin Users (depends on roles)
  try {
    await seedAdmins({ roleIds });
    logger.info("Admin users seeding completed.");
  } catch (err) {
    logger.error(`Failed to seed admin users: ${err}`);
  }

  // 7. Clients (depends on verticals)
  try {
    await seedClients();
    logger.info("Clients seeding completed.");
  } catch (err) {
    logger.error(`Failed to seed clients: ${err}`);
  }

  // 8. Restaurants (depends on clients)
  try {
    await seedRestaurants();
    logger.info("Restaurants seeding completed.");
  } catch (err) {
    logger.error(`Failed to seed restaurants: ${err}`);
  }

  // Phase 3: Entities that depend on Phase 2
  // 9. Boxes (depends on verticals, clients, restaurants)
  try {
    await seedBoxes();
    logger.info("Boxes seeding completed.");
  } catch (err) {
    logger.error(`Failed to seed boxes: ${err}`);
  }

  // 10. Delivery Employees (depends on clients, restaurants, boxes)
  try {
    await seedEmployees();
    logger.info("Employees seeding completed.");
  } catch (err) {
    logger.error(`Failed to seed employees: ${err}`);
  }

  // 11. FAQ (depends on verticals, icons)
  try {
    await seedFaq();
    logger.info("FAQ seeding completed.");
  } catch (err) {
    logger.error(`Failed to seed FAQ: ${err}`);
  }

  // 12. Notifications (depends on clients)
  try {
    await seedNotifications();
    logger.info("Notifications seeding completed.");
  } catch (err) {
    logger.error(`Failed to seed notifications: ${err}`);
  }

  // 13. Medical vertical (depends on clients, boxes)
  try {
    await seedMedical();
    logger.info("Medical vertical seeding completed.");
  } catch (err) {
    logger.error(`Failed to seed medical vertical: ${err}`);
  }

  // 14. Archived entities (depends on verticals)
  try {
    await seedArchived();
    logger.info("Archived entities seeding completed.");
  } catch (err) {
    logger.error(`Failed to seed archived entities: ${err}`);
  }

  // 15. MongoDB seed
  try {
    await seedMongoData();
    logger.info("MongoDB seed data completed.");
  } catch (err) {
    logger.error(`Failed to seed MongoDB data: ${err}`);
  }

  const endTime = Date.now();
  logger.info(`All seed sequences completed successfully in ${endTime - startTime}ms`);
};

await seed();
process.exit(0);
