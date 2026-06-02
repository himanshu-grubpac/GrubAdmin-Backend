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

// Test the connection silently; if it fails, do not crash — the readiness
// check will report unhealthy and the server can still serve static content.
try {
	await basePrisma.$connect();
	logger.info("Database connected successfully");
} catch (error) {
	logger.error(`Database connection error: ${error}`);
	logger.warn("Server starting without database connectivity. Readiness check will fail until database is available.");
}

export const prisma = basePrisma;

globalForPrisma.prisma = basePrisma;

// Configure mongoose with a shorter connection timeout so background
// MongoDB connection doesn't hang longer than necessary.
const MONGO_CONNECTION_TIMEOUT_MS = 5000;

export const connectMongoDB = async () => {
	try {
		logger.info("Connecting to mongo db...");
		logger.info(MONGO_URI);
		await mongoose.connect(MONGO_URI, {
			serverSelectionTimeoutMS: MONGO_CONNECTION_TIMEOUT_MS,
			connectTimeoutMS: MONGO_CONNECTION_TIMEOUT_MS,
		});
		logger.info("Connected to mongo db...");
	} catch (error) {
		logger.error(`MongoDB connection error: ${error}`);
		logger.warn("Server will continue without MongoDB. Logging features will be unavailable.");
	}
};
