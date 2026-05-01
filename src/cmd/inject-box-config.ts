import { connectMongoDB, prisma } from "@/db";
import { BoxConfig } from "@/db/mongo-schema";
import { logger } from "@/utils/logger";

export const injectBoxConfig = async () => {
	const startTime = Date.now();

	await connectMongoDB();

	console.log("Connecting to MongoDB");

	const boxes = await prisma.box.findMany({});

	const boxIds = new Set(boxes.map((box) => box.id));

	const boxConfigs = await BoxConfig.find({});

	const newBoxIds: string[] = [];

	for (const boxConfig of boxConfigs) {
		if (!boxIds.has(boxConfig.box_id)) {
			newBoxIds.push(boxConfig.box_id);
		}
	}

	await BoxConfig.create(
		newBoxIds.map((boxId) => ({
			box_id: boxId,
		})),
	);

	const endTime = Date.now();

	logger.info(
		`🎉 Box config injected successfully in ${endTime - startTime}ms`,
	);
};

await injectBoxConfig();
process.exit(0);
