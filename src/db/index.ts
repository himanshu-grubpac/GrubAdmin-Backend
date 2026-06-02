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
let prismaConnected = false;
try {
	await basePrisma.$connect();
	prismaConnected = true;
	logger.info("Database connected successfully");
} catch (error) {
	logger.error(`Database connection error: ${error}`);
	logger.warn("Server starting without database connectivity. Readiness check will fail until database is available.");
}

export const prisma = basePrisma;

globalForPrisma.prisma = basePrisma;

// Track MongoDB connection state explicitly.
// This is checked before every MongoDB operation to prevent buffering timeouts.
let mongoConnected = false;
let mongoConnectionPromise: Promise<void> | null = null;

export const isMongoConnected = (): boolean => mongoConnected;
export const isPrismaConnected = (): boolean => prismaConnected;

export const getMongoConnectionState = (): string => {
	switch (mongoose.connection.readyState) {
		case 0: return "disconnected";
		case 1: return "connected";
		case 2: return "connecting";
		case 3: return "disconnecting";
		default: return "unknown";
	}
};

// Disable Mongoose buffering so operations fail immediately instead of
// timing out silently after 10000ms (default bufferTimeoutMS).
// This ensures MongoDB errors are caught and handled properly rather than
// causing confusing "buffering timed out" errors.
mongoose.set("bufferCommands", false);

// Connection timeout settings.
const MONGO_CONNECTION_TIMEOUT_MS = 5000;

const mongoConnectAttempts = parseInt(process.env.MONGO_MAX_RETRIES || "3", 10);
const mongoRetryDelay = parseInt(process.env.MONGO_RETRY_DELAY_MS || "2000", 10);

export const connectMongoDB = async (): Promise<void> => {
	if (mongoConnectionPromise) return mongoConnectionPromise;

	mongoConnectionPromise = (async () => {
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= mongoConnectAttempts; attempt++) {
			try {
				logger.info(`Connecting to MongoDB (attempt ${attempt}/${mongoConnectAttempts})...`);
				logger.info(MONGO_URI);
				await mongoose.connect(MONGO_URI, {
					serverSelectionTimeoutMS: MONGO_CONNECTION_TIMEOUT_MS,
					connectTimeoutMS: MONGO_CONNECTION_TIMEOUT_MS,
					heartbeatFrequencyMS: 10000,
				});

				mongoConnected = true;
				logger.info("Connected to MongoDB successfully");

				// Watch for disconnections and reconnect automatically
				mongoose.connection.on("disconnected", () => {
					logger.warn("MongoDB disconnected. Updating state.");
					mongoConnected = false;
				});

				mongoose.connection.on("reconnected", () => {
					logger.info("MongoDB reconnected. Updating state.");
					mongoConnected = true;
				});

				mongoose.connection.on("error", (err) => {
					logger.error(`MongoDB connection error: ${err}`);
					mongoConnected = false;
				});

				return;
			} catch (error) {
				lastError = error as Error;
				logger.error(`MongoDB connection attempt ${attempt} failed: ${error}`);

				if (attempt < mongoConnectAttempts) {
					logger.info(`Retrying MongoDB connection in ${mongoRetryDelay}ms...`);
					await new Promise((resolve) => setTimeout(resolve, mongoRetryDelay));
				}
			}
		}

		mongoConnected = false;
		logger.error(`MongoDB connection failed after ${mongoConnectAttempts} attempts.`);
		logger.warn("Server will continue without MongoDB. All MongoDB operations will fail immediately (buffering disabled).");
		throw lastError || new Error("MongoDB connection failed");
	})();

	return mongoConnectionPromise;
};

/**
 * Wait for MongoDB connection to be established with a timeout.
 * Throws if not connected after the timeout.
 */
export const ensureMongoDB = async (timeoutMs = 15000): Promise<void> => {
	if (mongoConnected && mongoose.connection.readyState === 1) return;

	if (!mongoConnectionPromise) {
		throw new Error("MongoDB connection was never initiated");
	}

	const timeout = new Promise<never>((_, reject) =>
		setTimeout(() => reject(new Error(`MongoDB connection not ready within ${timeoutMs}ms`)), timeoutMs)
	);

	await Promise.race([mongoConnectionPromise, timeout]);
};

/**
 * Wait for all database connections to be ready.
 */
export const waitForDatabases = async (timeoutMs = 30000): Promise<{ prisma: boolean; mongodb: boolean }> => {
	const results = {
		prisma: prismaConnected,
		mongodb: false,
	};

	// If MongoDB connect was initiated, wait for it
	if (mongoConnectionPromise) {
		try {
			await ensureMongoDB(timeoutMs);
			results.mongodb = mongoConnected;
		} catch {
			results.mongodb = false;
		}
	}

	return results;
};
