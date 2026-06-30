import { prisma } from "@/db";
import { logger } from "@/utils/logger";

const migrateMedicalEmployeeRole = async () => {
	logger.info("Migrating Medical employee roles from 'delivery' to 'handler'...");

	const result = await prisma.vertical_medical_employee.updateMany({
		where: { role: "delivery" },
		data: { role: "handler" },
	});

	logger.info(`Updated ${result.count} employee(s) from 'delivery' to 'handler'.`);

	if (result.count > 0) {
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
