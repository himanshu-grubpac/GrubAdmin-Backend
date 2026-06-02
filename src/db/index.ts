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

let basePrisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
	const adapter = new PrismaMariaDb(DATABASE_URL);
	basePrisma = new PrismaClient({
		log: ["query", "error"],
		adapter,
	});
} else {
	if (!globalForPrisma.prisma) {
		const adapter = new PrismaMariaDb(DATABASE_URL);
		globalForPrisma.prisma = new PrismaClient({
			log: ["query", "error", "warn"],
			adapter,
		});
	}
	basePrisma = globalForPrisma.prisma;
}

export const prisma = basePrisma;


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
