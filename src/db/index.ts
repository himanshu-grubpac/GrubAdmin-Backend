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

logger.info("Connecting to database...");
const adapter = new PrismaMariaDb(DATABASE_URL);

const basePrisma = new PrismaClient({
	log:
		process.env.NODE_ENV === "development"
			? ["query", "error", "warn"]
			: ["error"],
	adapter,
});

// Test the connection silently; if it fails, log and exit so Nginx returns 502 cleanly
try {
	await basePrisma.$connect();
	logger.info("Database connected successfully");
} catch (error) {
	logger.error(`Database connection error: ${error}`);
	process.exit(1);
}

export const prisma = basePrisma;

globalForPrisma.prisma = basePrisma;


export const connectMongoDB = async () => {
	try {
		logger.info("🍃 Connecting to mongo db...");
		logger.info(MONGO_URI);
		await mongoose.connect(MONGO_URI);
		logger.info("🍃 Connected to mongo db...");
	} catch (error) {
		logger.error(`MongoDB connection error: ${error}`);
		logger.warn("Server will continue without MongoDB. Logging features will be unavailable.");
	}
};
