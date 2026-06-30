import { prisma } from "@/db";
import { logger } from "@/utils/logger";

const migrateMedicalEmployeeRole = async () => {
	logger.info("Migrating Medical employee roles from 'delivery' to 'handler'...");

	const result = await prisma.$executeRawUnsafe(
		`UPDATE vertical_medical_employee SET role = 'handler'::medical_employee_role WHERE role = 'delivery'::medical_employee_role`,
	);

	logger.info(`Updated ${result} employee(s) from 'delivery' to 'handler'.`);

	if (result > 0) {
		logger.info("Migration completed successfully.");
	} else {
		logger.info("No employees needed migration.");
	}

	await prisma.$disconnect();
};

migrateMedicalEmployeeRole().catch((err) => {
	logger.error(`Migration failed: ${err}`);
	process.exit(1);
});
