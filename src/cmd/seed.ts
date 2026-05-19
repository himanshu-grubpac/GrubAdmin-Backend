import {
	SEED_COUNTRY_CODE,
	SEED_EMAIL,
	SEED_LAST_NAME,
	SEED_MOBILE_NUMBER,
	SEED_NAME,
	SEED_PASSWORD,
} from "@/configs/env";
import { connectMongoDB, prisma } from "@/db";
import { Bcrypt } from "@/utils/bcrypt";
import { logger } from "@/utils/logger";
import seedSystemConfigs from "./seed-system-configs";
import { seedMongoData } from "./seed-mongo";

const STANDARD_ROLES = [
	{
		name: "Super Admin",
		name_normalized: "super admin",
		is_super_admin: true,
		permissions_json: {},
	},
	{
		name: "Admin",
		name_normalized: "admin",
		is_super_admin: false,
		permissions_json: {
			dashboard: ["view dashboard", "export dashboard"],
			employees: [
				"view active employees",
				"view employee logs",
				"view suspended employees",
				"view dismissed employees",
				"add employees",
				"edit employees",
				"delete employees",
				"suspend employees",
				"active employees",
				"export employees",
			],
			roles: ["view roles", "edit roles", "add roles"],
			clients: [
				"view clients list",
				"export clients list",
				"view clients log",
				"view client account",
				"add new entries",
				"edit entries",
				"suspend entries",
				"delete entries",
				"export entries",
				"edit profile details",
			],
			support: [
				"view active resources",
				"export active resources",
				"add new category",
				"edit category",
				"suspend categories",
				"delete categories",
				"view suspended categories",
				"export suspended_categories",
				"activate categories",
				"add new question",
				"edit questions",
				"change faq category",
				"allow publishing",
				"delete question",
			],
			system_settings: ["view configs", "edit configs"],
			grubpac: [
				"view grubpacs",
				"add grubpacs",
				"edit grubpacs",
				"delete grubpacs",
				"assign grubpacs",
				"export grubpacs",
			],
			verticals: {
				camping: "camping",
				medical: "medical",
				delivery: "delivery",
				hospitality: "hospitality",
				view_verticals: "view verticals",
				add_verticals: "add verticals",
			},
		},
	},
	{
		name: "Support Manager",
		name_normalized: "support manager",
		is_super_admin: false,
		permissions_json: {
			dashboard: ["view dashboard"],
			support: [
				"view active resources",
				"export active resources",
				"add new category",
				"edit category",
				"add new question",
				"edit questions",
				"change faq category",
				"allow publishing",
				"delete question",
			],
		},
	},
	{
		name: "Viewer",
		name_normalized: "viewer",
		is_super_admin: false,
		permissions_json: {
			dashboard: ["view dashboard"],
			employees: ["view active employees"],
			roles: ["view roles"],
			clients: ["view clients list", "view client account"],
			support: ["view active resources"],
			grubpac: ["view grubpacs"],
		},
	},
];

const VERTICAL_ID = "01KR0DHRG48S8MT3J3WS1E00PD";
const DEFAULT_VERTICAL_NAME = "Food";
const ICON_ID = "01KRAXGGMRQFVMFVKT63T42WNG";

export const seed = async () => {
	const startTime = Date.now();

	if (!SEED_EMAIL || !SEED_NAME || !SEED_PASSWORD) {
		logger.error(
			"Seed data not provided. Please set SEED_EMAIL, SEED_NAME, and SEED_PASSWORD environment variables.",
		);
		process.exit(1);
	}

	logger.info("Initializing database seeding sequence...");

	// 1. Seed System Configurations
	try {
		await seedSystemConfigs();
		logger.info("System configurations seeding completed.");
	} catch (err) {
		logger.error(`Failed to seed system configurations: ${err}`);
	}

	// 2. Seed Default Vertical
	try {
		await prisma.vertical.upsert({
			where: { name: DEFAULT_VERTICAL_NAME },
			update: {},
			create: {
				id: VERTICAL_ID,
				name: DEFAULT_VERTICAL_NAME,
			},
		});
		logger.info("Default Vertical seeded successfully.");
	} catch (err) {
		logger.error(`Failed to seed default vertical: ${err}`);
	}

	// 3. Seed Default System Icon
	try {
		const existingIcon = await prisma.icon.findUnique({
			where: { id: ICON_ID },
		});
		if (!existingIcon) {
			await prisma.icon.create({
				data: {
					id: ICON_ID,
					name: "Default Icon",
					bucket_key: "icons/default-faq-icon.png",
				},
			});
			logger.info("Default System Icon seeded successfully.");
		} else {
			logger.info("Default System Icon already exists, skipping.");
		}
	} catch (err) {
		logger.error(`Failed to seed default icon: ${err}`);
	}

	// 4. Seed Standard Roles
	const seededRoles: Record<string, string> = {};
	try {
		for (const roleDef of STANDARD_ROLES) {
			const role = await prisma.role.upsert({
				where: { name_normalized: roleDef.name_normalized },
				update: {
					permissions_json: roleDef.permissions_json,
					is_super_admin: roleDef.is_super_admin,
				},
				create: {
					name: roleDef.name,
					name_normalized: roleDef.name_normalized,
					is_super_admin: roleDef.is_super_admin,
					permissions_json: roleDef.permissions_json,
				},
			});
			seededRoles[roleDef.name_normalized] = role.id;
			logger.info(`Role "${roleDef.name}" seeded successfully.`);
		}
	} catch (err) {
		logger.error(`Failed to seed roles: ${err}`);
	}

	// 5. Seed Super Admin User
	try {
		const superAdminRoleId = seededRoles["super admin"];
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
					role_id: superAdminRoleId,
					country_code: SEED_COUNTRY_CODE,
					mobile_number: SEED_MOBILE_NUMBER,
					status: "active",
				},
			});
			logger.info("Super Admin User seeded successfully.");
		} else {
			logger.info("Super Admin User already exists, skipping.");
		}
	} catch (err) {
		logger.error(`Failed to seed super admin user: ${err}`);
	}

	// 6. Seed MongoDB Data (Notifications + System Logs)
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
