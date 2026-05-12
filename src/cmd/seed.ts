import {
	SEED_COUNTRY_CODE,
	SEED_EMAIL,
	SEED_LAST_NAME,
	SEED_MOBILE_NUMBER,
	SEED_NAME,
	SEED_PASSWORD,
} from "@/configs/env";
import { prisma } from "@/db";
import { Bcrypt } from "@/utils/bcrypt";
import { logger } from "@/utils/logger";
import seedSystemConfigs from "./seed-system-configs";

export const seed = async () => {
	const startTime = Date.now();

	if (!SEED_EMAIL || !SEED_NAME || !SEED_PASSWORD) {
		logger.error(
			"Seed data not provided, we do require email, name and password. And these data needs to be passed using environment variables.",
		);
		process.exit(1);
	}

	logger.info("Initializing database seeding sequence...");

	// 1. Seed System Configurations (idempotent)
	try {
		await seedSystemConfigs();
		logger.info("✅ System configurations seeding completed.");
	} catch (err) {
		logger.error(`❌ Failed to seed system configurations: ${err}`);
	}

	// 2. Seed Default Vertical (idempotent check-and-create)
	const verticalId = "01KR0DHRG48S8MT3J3WS1E00PD";
	const defaultVerticalName = "Food";
	await prisma.vertical.upsert({
		where: { name: defaultVerticalName },
		update: {},
		create: {
			id: verticalId,
			name: defaultVerticalName,
		},
	});
	logger.info("✅ Default Vertical seeded successfully.");

	// 3. Seed Default System Icon (idempotent check-and-create)
	const iconId = "01KRAXGGMRQFVMFVKT63T42WNG";
	const existingIcon = await prisma.icon.findUnique({
		where: { id: iconId },
	});

	if (!existingIcon) {
		await prisma.icon.create({
			data: {
				id: iconId,
				name: "Default Icon",
				bucket_key: "icons/default-faq-icon.png",
			},
		});
		logger.info("✅ Default System Icon seeded successfully.");
	} else {
		logger.info("ℹ️ Default System Icon already exists, skipping.");
	}

	// 4. Seed Super Admin Role (idempotent check-and-create via upsert)
	const superAdminRole = await prisma.role.upsert({
		where: { name_normalized: "super admin" },
		update: {},
		create: {
			name: "Super Admin",
			name_normalized: "super admin",
			is_super_admin: true,
			permissions_json: {},
		},
	});
	logger.info("✅ Super Admin Role seeded successfully.");

	// 5. Seed Super Admin User (idempotent check-and-create via unique email)
	const existingAdmin = await prisma.admin.findUnique({
		where: { email: SEED_EMAIL },
	});

	if (!existingAdmin) {
		const hashedPassword = await Bcrypt.generateHash({
			data: SEED_PASSWORD,
			saltLength: 10,
		});

		await prisma.admin.create({
			data: {
				password: hashedPassword,
				first_name: SEED_NAME,
				last_name: SEED_LAST_NAME,
				email: SEED_EMAIL,
				role_id: superAdminRole.id,
				country_code: SEED_COUNTRY_CODE,
				mobile_number: SEED_MOBILE_NUMBER,
			},
		});
		logger.info("✅ Super Admin User seeded successfully.");
	} else {
		logger.info("ℹ️ Super Admin User already exists, skipping.");
	}

	const endTime = Date.now();
	logger.info(`🎉 All seed sequences completed successfully in ${endTime - startTime}ms`);
};

await seed();
process.exit(0);
