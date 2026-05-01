import { logger } from "@/utils/logger";
import { PrismaClient } from "./prisma";
import mongoose from "mongoose";
import { DATABASE_URL, MONGO_URI } from "@/configs/env";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Prevent multiple instances of Prisma Client in dev (hot reloads)
const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

import { nullifyEmptyStrings } from "@/utils/clean-query.ts";

console.log("Using DATABASE_URL:", DATABASE_URL);
const adapter = new PrismaMariaDb(DATABASE_URL);


const basePrisma = new PrismaClient({
	log:
		process.env.NODE_ENV === "development"
			? ["query", "error", "warn"]
			: ["query", "error"],
	adapter,
});


export const prisma = basePrisma;

globalForPrisma.prisma = basePrisma;


export const connectMongoDB = async () => {
	try {
		logger.info("🍃 Connecting to mongo db...");
		logger.info(MONGO_URI);
		await mongoose.connect(MONGO_URI);
		logger.info("🍃 Connected to mongo db...");
	} catch (error) {
		logger.error(`Connection error: ${error}`);
		throw error;
	}
};
