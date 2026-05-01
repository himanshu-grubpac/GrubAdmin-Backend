import { logger } from "@/utils/logger.ts";
import { connectMongoDB, prisma } from "@/db";
import { AdminUpdateOtp, Otp } from "@/db/mongo-schema";
import inquirer from "inquirer";

export const resetDb = async () => {
	try {
		const resetConfirmation = await inquirer.prompt([
			{
				type: "confirm",
				message: "Are you sure you wanna reset?",
				name: "confirm",
			},
		]);

		if (!resetConfirmation.confirm) {
			logger.info("Reset cancelled by user!!");
			process.exit(1);
		}

		logger.info("Resetting admin");
		await prisma.admin.deleteMany();
		logger.info("Reset admin done");

		logger.info("Resetting dismissed admin");
		await prisma.admin_dismissed.deleteMany();
		logger.info("Reset dismissed admin done");

		logger.info("Resetting system config");
		await prisma.system_config.deleteMany();
		logger.info("Reset system config done");

		logger.info("Resetting icon");
		await prisma.icon.deleteMany();
		logger.info("Reset icon done");

		logger.info("Resetting vertical");
		await prisma.vertical.deleteMany();
		logger.info("Reset vertical done");

		logger.info("Resetting client");
		await prisma.client.deleteMany();
		logger.info("Reset client done");

		logger.info("Resetting faq category");
		await prisma.faq_category.deleteMany();
		logger.info("Reset faq category done");

		logger.info("Resetting faq question");
		await prisma.faq_question.deleteMany();
		await prisma.faq_question_category.deleteMany();
		logger.info("Reset faq question done");

		logger.info("Resetting role");
		await prisma.role.deleteMany();
		logger.info("Reset role done");

		await connectMongoDB();

		logger.info("Resetting otp");
		await Otp.deleteMany();
		logger.info("Reset otp done");

		logger.info("Resetting Admin Update Otp");
		await AdminUpdateOtp.deleteMany();
		logger.info("Reset Admin Update Otp done");

		// TODO: Uncomment this to implement s3 clearance!
		// await services.s3.emptyBucket();

		logger.info("Reset Complete!! Please run the seeder again :)");
		process.exit(0);
	} catch (error) {
		console.log(error);
		process.exit(1);
	}
};

await resetDb();
process.exit(0);
