import { logger } from "@/utils/logger";
import seedSystemConfigs from "./seed-system-configs";
import { seedMongoData } from "./seed-mongo";
import { seedVerticals, VERTICAL_IDS } from "./seed-verticals";
import { seedRoles, ROLE_IDS } from "./seed-roles";
import { seedAdmins } from "./seed-admins";
import { seedClients } from "./seed-clients";
import { seedRestaurants } from "./seed-restaurants";
import { seedBoxes } from "./seed-boxes";
import { seedEmployees } from "./seed-employees";
import { seedFaq } from "./seed-faq";
import { seedNotifications } from "./seed-notifications";
import { seedArchived } from "./seed-archived";

export const seed = async () => {
	const startTime = Date.now();
	logger.info("Initializing database seeding sequence...");

	// 1. System Configurations
	try {
		await seedSystemConfigs();
		logger.info("System configurations seeding completed.");
	} catch (err) {
		logger.error(`Failed to seed system configurations: ${err}`);
	}

	// 2. Verticals + Icons
	try {
		await seedVerticals();
		logger.info("Verticals seeding completed.");
	} catch (err) {
		logger.error(`Failed to seed verticals: ${err}`);
	}

	// 3. Roles
	let roleIds: Record<string, string> = {};
	try {
		roleIds = await seedRoles();
		logger.info("Roles seeding completed.");
	} catch (err) {
		logger.error(`Failed to seed roles: ${err}`);
	}

	// 4. Admin Users
	try {
		await seedAdmins({ roleIds });
		logger.info("Admin users seeding completed.");
	} catch (err) {
		logger.error(`Failed to seed admin users: ${err}`);
	}

	// 5. Clients
	try {
		await seedClients();
		logger.info("Clients seeding completed.");
	} catch (err) {
		logger.error(`Failed to seed clients: ${err}`);
	}

	// 6. Restaurants
	try {
		await seedRestaurants();
		logger.info("Restaurants seeding completed.");
	} catch (err) {
		logger.error(`Failed to seed restaurants: ${err}`);
	}

	// 7. Boxes (telemetry, locks, configs, restaurant assignments)
	try {
		await seedBoxes();
		logger.info("Boxes seeding completed.");
	} catch (err) {
		logger.error(`Failed to seed boxes: ${err}`);
	}

	// 8. Food Employees + box assignments
	try {
		await seedEmployees();
		logger.info("Employees seeding completed.");
	} catch (err) {
		logger.error(`Failed to seed employees: ${err}`);
	}

	// 9. FAQ
	try {
		await seedFaq();
		logger.info("FAQ seeding completed.");
	} catch (err) {
		logger.error(`Failed to seed FAQ: ${err}`);
	}

	// 10. Notifications (MySQL)
	try {
		await seedNotifications();
		logger.info("Notifications seeding completed.");
	} catch (err) {
		logger.error(`Failed to seed notifications: ${err}`);
	}

	// 11. Archival / Deleted entities
	try {
		await seedArchived();
		logger.info("Archived entities seeding completed.");
	} catch (err) {
		logger.error(`Failed to seed archived entities: ${err}`);
	}

	// 12. MongoDB seed (system logs, etc.)
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
