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

export const seed = async () => {
	const startTime = Date.now();

	if (!SEED_EMAIL || !SEED_NAME || !SEED_PASSWORD) {
		logger.error(
			"Seed data not provided, we do require email, name and password. And these data needs to be passed using environment variables.",
		);
		process.exit(1);
	}

	const admin = await prisma.admin.findFirst();

	if (admin) {
		logger.error(
			"Admin has already been created. So, you cannot create another... you can login using that admin and update his data to personalize. Or maybe if you have access to the database you can also delete the admin and try to re-seed the database using your desired credentials!",
		);
		process.exit(1);
	}

	const hashedPassword = await Bcrypt.generateHash({
		data: SEED_PASSWORD,
		saltLength: 10,
	});

	const superAdminRole = await prisma.role.create({
		data: {
			name: "Super Admin",
			is_super_admin: true,
			permissions_json: {},
		},
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

	const endTime = Date.now();

	logger.info(`Admin seeded successfully in ${endTime - startTime}ms`);
};

await seed();
process.exit(0);
